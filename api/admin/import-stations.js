const multer = require('multer');
const xlsx = require('xlsx');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Station = require('../../server/models/Station');

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
    console.log('MongoDB connected for import-stations');
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
    const User = require('../../server/models/User');
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

  try {
    // Ensure database connection
    await connectDB();
    
    // Authenticate user
    const isAuthenticated = await authenticateToken(req, res);
    if (!isAuthenticated) {
      return;
    }
    
    // Handle file upload
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

        // Validate headers
        const headers = data[0];
        const requiredHeaders = ['name', 'number', 'address', 'totalCapacity', 'shiftACapacity', 'shiftBCapacity', 'shiftCCapacity'];
        const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

        if (missingHeaders.length > 0) {
          return res.status(400).json({
            error: 'Invalid Excel format',
            details: `Missing required columns: ${missingHeaders.join(', ')}`,
            expectedHeaders: requiredHeaders,
            actualHeaders: headers
          });
        }

        // Process data rows
        const results = {
          total: data.length - 1,
          created: 0,
          skipped: 0,
          errors: []
        };

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const stationData = {};

          // Map row data to station fields
          headers.forEach((header, index) => {
            if (row[index] !== undefined && row[index] !== null && row[index] !== '') {
              stationData[header] = String(row[index]).trim();
            }
          });

          // Validate required fields
          const requiredFields = ['name', 'number', 'address', 'totalCapacity'];
          const missingFields = requiredFields.filter(field => !stationData[field]);

          if (missingFields.length > 0) {
            results.errors.push({
              row: i + 1,
              error: `Missing required fields: ${missingFields.join(', ')}`
            });
            results.skipped++;
            continue;
          }

          // Validate station number format
          if (isNaN(stationData.number) || parseInt(stationData.number) <= 0) {
            results.errors.push({
              row: i + 1,
              error: `Invalid station number: ${stationData.number}`
            });
            results.skipped++;
            continue;
          }

          // Validate capacity values
          const capacityFields = ['totalCapacity', 'shiftACapacity', 'shiftBCapacity', 'shiftCCapacity'];
          for (const field of capacityFields) {
            if (stationData[field] && (isNaN(stationData[field]) || parseInt(stationData[field]) < 0)) {
              results.errors.push({
                row: i + 1,
                error: `Invalid ${field}: ${stationData[field]}`
              });
              results.skipped++;
              continue;
            }
          }

          // Check if station already exists
          const existingStation = await Station.findOne({ 
            number: stationData.number
          });

          if (existingStation) {
            results.errors.push({
              row: i + 1,
              error: `Station with number ${stationData.number} already exists`
            });
            results.skipped++;
            continue;
          }

          try {
            // Create new station
            const station = new Station({
              name: stationData.name,
              number: stationData.number,
              address: stationData.address,
              totalCapacity: parseInt(stationData.totalCapacity) || 0,
              shiftCapacity: {
                A: parseInt(stationData.shiftACapacity) || 0,
                B: parseInt(stationData.shiftBCapacity) || 0,
                C: parseInt(stationData.shiftCCapacity) || 0
              },
              description: stationData.description || '',
              phoneNumber: stationData.phoneNumber || '',
              email: stationData.email || '',
              isActive: stationData.isActive !== 'false' && stationData.isActive !== '0',
              preferredRanks: stationData.preferredRanks ? stationData.preferredRanks.split(',').map(rank => rank.trim()) : []
            });

            await station.save();
            results.created++;

          } catch (stationError) {
            results.errors.push({
              row: i + 1,
              error: `Failed to create station: ${stationError.message}`
            });
            results.skipped++;
          }
        }

        res.json({
          message: 'Station import completed',
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
    console.error('Import stations error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
