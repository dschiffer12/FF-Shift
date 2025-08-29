const multer = require('multer');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../../../server/models/User');

// Database connection
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return; // Already connected
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for import-users');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel' ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'), false);
    }
  }
});

// Set CORS headers
const setCORSHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
};

// Handle preflight requests
const handlePreflight = (req, res) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
};

// Authentication middleware
const authenticateToken = async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return false;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid or inactive user' });
      return false;
    }

    if (!user.isAdmin) {
      res.status(403).json({ error: 'Admin access required' });
      return false;
    }

    req.user = user;
    return true;
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
    return false;
  }
};

module.exports = async (req, res) => {
  setCORSHeaders(res);
  
  if (handlePreflight(req, res)) return;

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Ensure database connection
    await connectDB();

    // Authenticate user
    const isAuthenticated = await authenticateToken(req, res);
    if (!isAuthenticated) {
      return;
    }

    // Use multer to handle file upload
    upload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).json({
          error: 'File upload failed',
          details: err.message
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: 'No file uploaded'
        });
      }

      try {
        // Parse Excel file
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length < 2) {
          return res.status(400).json({
            error: 'Excel file must contain at least a header row and one data row'
          });
        }

        const headers = data[0];
        const rows = data.slice(1);

        // Validate required headers
        const requiredHeaders = ['firstName', 'lastName', 'email', 'employeeId'];
        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

        if (missingHeaders.length > 0) {
          return res.status(400).json({
            error: `Missing required headers: ${missingHeaders.join(', ')}`
          });
        }

        const results = {
          total: rows.length,
          created: 0,
          skipped: 0,
          errors: []
        };

        // Process each row
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          // Skip empty rows
          if (!row || row.every(cell => !cell || cell.toString().trim() === '')) {
            continue;
          }

          const userData = {};

          // Map row data to user fields
          headers.forEach((header, index) => {
            if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
              userData[header] = String(row[index]).trim();
            }
          });

          // Validate required fields
          const requiredFields = ['firstName', 'lastName', 'email', 'employeeId'];
          const missingFields = requiredFields.filter(field => !userData[field]);

          if (missingFields.length > 0) {
            results.errors.push({
              row: i + 1,
              error: `Missing required fields: ${missingFields.join(', ')}`
            });
            results.skipped++;
            continue;
          }

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(userData.email)) {
            results.errors.push({
              row: i + 1,
              error: `Invalid email format: ${userData.email}`
            });
            results.skipped++;
            continue;
          }

          // Check if user already exists
          const existingUser = await User.findOne({ 
            $or: [
              { email: userData.email },
              { employeeId: userData.employeeId }
            ]
          });

          if (existingUser) {
            results.errors.push({
              row: i + 1,
              error: `User already exists with email ${userData.email} or employee ID ${userData.employeeId}`
            });
            results.skipped++;
            continue;
          }

          try {
            // Create new user
            const user = new User({
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              employeeId: userData.employeeId,
              rank: userData.rank || 'Firefighter',
              position: userData.position || 'Firefighter',
              yearsOfService: parseInt(userData.yearsOfService) || 0,
              password: await bcrypt.hash('changeme123', 10), // Default password
              isActive: true,
              isAdmin: false
            });

            await user.save();
            results.created++;

          } catch (userError) {
            results.errors.push({
              row: i + 1,
              error: `Failed to create user: ${userError.message}`
            });
            results.skipped++;
          }
        }

        res.json({
          message: 'User import completed',
          results
        });

      } catch (parseError) {
        console.error('Excel parsing error:', parseError);
        res.status(400).json({
          error: 'Failed to parse Excel file',
          details: parseError.message
        });
      }
    });

  } catch (error) {
    console.error('Import users error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
