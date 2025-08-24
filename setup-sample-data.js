const mongoose = require('mongoose');
const Station = require('./server/models/Station');
const User = require('./server/models/User');
const BidSession = require('./server/models/BidSession');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ff-shift-bid', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createSampleStations = async () => {
  try {
    // Check if stations already exist
    const existingStations = await Station.find();
    if (existingStations.length > 0) {
      console.log('Stations already exist, skipping...');
      return;
    }

    const stations = [
      {
        name: 'Central Station',
        number: '1',
        address: {
          street: '123 Main St',
          city: 'Downtown',
          state: 'CA',
          zipCode: '90210'
        },
        description: 'Main fire station serving downtown area',
        totalCapacity: 20,
        shiftCapacity: { A: 6, B: 7, C: 7 },
        availablePositions: {
          A: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 2 },
            { position: 'Driver', count: 1 },
            { position: 'Officer', count: 1 }
          ],
          B: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 2 },
            { position: 'Driver', count: 1 },
            { position: 'Officer', count: 1 }
          ],
          C: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 2 },
            { position: 'Driver', count: 1 },
            { position: 'Officer', count: 1 }
          ]
        },
        isActive: true
      },
      {
        name: 'North Station',
        number: '2',
        address: {
          street: '456 North Ave',
          city: 'North District',
          state: 'CA',
          zipCode: '90211'
        },
        description: 'Fire station serving north district',
        totalCapacity: 15,
        shiftCapacity: { A: 5, B: 5, C: 5 },
        availablePositions: {
          A: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 2 },
            { position: 'Driver', count: 1 }
          ],
          B: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 2 },
            { position: 'Driver', count: 1 }
          ],
          C: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 2 },
            { position: 'Driver', count: 1 }
          ]
        },
        isActive: true
      },
      {
        name: 'South Station',
        number: '3',
        address: {
          street: '789 South Blvd',
          city: 'South District',
          state: 'CA',
          zipCode: '90212'
        },
        description: 'Fire station serving south district',
        totalCapacity: 18,
        shiftCapacity: { A: 6, B: 6, C: 6 },
        availablePositions: {
          A: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 2 },
            { position: 'Driver', count: 1 },
            { position: 'Officer', count: 1 }
          ],
          B: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 2 },
            { position: 'Driver', count: 1 },
            { position: 'Officer', count: 1 }
          ],
          C: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 2 },
            { position: 'Driver', count: 1 },
            { position: 'Officer', count: 1 }
          ]
        },
        isActive: true
      },
      {
        name: 'East Station',
        number: '4',
        address: {
          street: '321 East Rd',
          city: 'East District',
          state: 'CA',
          zipCode: '90213'
        },
        description: 'Fire station serving east district',
        totalCapacity: 12,
        shiftCapacity: { A: 4, B: 4, C: 4 },
        availablePositions: {
          A: [
            { position: 'Firefighter', count: 1 },
            { position: 'Paramedic', count: 1 },
            { position: 'Driver', count: 1 }
          ],
          B: [
            { position: 'Firefighter', count: 1 },
            { position: 'Paramedic', count: 1 },
            { position: 'Driver', count: 1 }
          ],
          C: [
            { position: 'Firefighter', count: 1 },
            { position: 'Paramedic', count: 1 },
            { position: 'Driver', count: 1 }
          ]
        },
        isActive: true
      },
      {
        name: 'West Station',
        number: '5',
        address: {
          street: '654 West St',
          city: 'West District',
          state: 'CA',
          zipCode: '90214'
        },
        description: 'Fire station serving west district',
        totalCapacity: 16,
        shiftCapacity: { A: 5, B: 5, C: 6 },
        availablePositions: {
          A: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 1 },
            { position: 'Driver', count: 1 },
            { position: 'Officer', count: 1 }
          ],
          B: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 1 },
            { position: 'Driver', count: 1 },
            { position: 'Officer', count: 1 }
          ],
          C: [
            { position: 'Firefighter', count: 2 },
            { position: 'Paramedic', count: 2 },
            { position: 'Driver', count: 1 },
            { position: 'Officer', count: 1 }
          ]
        },
        isActive: true
      }
    ];

    for (const stationData of stations) {
      const station = new Station(stationData);
      await station.save();
      console.log(`Created station: ${station.name}`);
    }

    console.log('Sample stations created successfully!');
  } catch (error) {
    console.error('Error creating sample stations:', error);
  }
};

const createSampleUsers = async () => {
  try {
    // Check if users already exist
    const existingUsers = await User.find();
    if (existingUsers.length > 0) {
      console.log('Users already exist, skipping...');
      return;
    }

    const users = [
      {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@firedept.com',
        password: 'password123',
        rank: 'Lieutenant',
        position: 'Officer',
        employeeId: 'EMP001',
        yearsOfService: 8,
        isAdmin: false
      },
      {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@firedept.com',
        password: 'password123',
        rank: 'Firefighter',
        position: 'Paramedic',
        employeeId: 'EMP002',
        yearsOfService: 5,
        isAdmin: false
      },
      {
        firstName: 'Mike',
        lastName: 'Davis',
        email: 'mike.davis@firedept.com',
        password: 'password123',
        rank: 'Firefighter',
        position: 'Driver',
        employeeId: 'EMP003',
        yearsOfService: 12,
        isAdmin: false
      },
      {
        firstName: 'Lisa',
        lastName: 'Wilson',
        email: 'lisa.wilson@firedept.com',
        password: 'password123',
        rank: 'Firefighter',
        position: 'Firefighter',
        employeeId: 'EMP004',
        yearsOfService: 3,
        isAdmin: false
      },
      {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@firedept.com',
        password: 'admin123',
        rank: 'Captain',
        position: 'Officer',
        employeeId: 'ADMIN001',
        yearsOfService: 15,
        isAdmin: true
      }
    ];

    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      console.log(`Created user: ${user.firstName} ${user.lastName}`);
    }

    console.log('Sample users created successfully!');
  } catch (error) {
    console.error('Error creating sample users:', error);
  }
};

const runSetup = async () => {
  try {
    console.log('Starting sample data setup...');
    
    await createSampleStations();
    await createSampleUsers();
    
    console.log('Sample data setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
};

runSetup(); 