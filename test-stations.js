const mongoose = require('mongoose');
const Station = require('./server/models/Station');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ff-shift-bid', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const testStations = async () => {
  try {
    console.log('Testing stations...');
    
    // Check if stations exist
    const stations = await Station.find();
    console.log(`Found ${stations.length} stations in database`);
    
    if (stations.length === 0) {
      console.log('No stations found. Creating sample stations...');
      
      const sampleStations = [
        {
          name: 'Central Station',
          number: '1',
          address: '123 Main St, Downtown',
          description: 'Main fire station serving downtown area',
          totalCapacity: 20,
          shiftCapacity: { A: 6, B: 7, C: 7 },
          availablePositions: {
            A: ['Firefighter', 'Paramedic', 'Driver', 'Officer'],
            B: ['Firefighter', 'Paramedic', 'Driver', 'Officer'],
            C: ['Firefighter', 'Paramedic', 'Driver', 'Officer']
          },
          isActive: true
        },
        {
          name: 'North Station',
          number: '2',
          address: '456 North Ave, North District',
          description: 'Fire station serving north district',
          totalCapacity: 15,
          shiftCapacity: { A: 5, B: 5, C: 5 },
          availablePositions: {
            A: ['Firefighter', 'Paramedic', 'Driver'],
            B: ['Firefighter', 'Paramedic', 'Driver'],
            C: ['Firefighter', 'Paramedic', 'Driver']
          },
          isActive: true
        }
      ];

      for (const stationData of sampleStations) {
        const station = new Station(stationData);
        await station.save();
        console.log(`Created station: ${station.name}`);
      }
    }
    
    // Test the getSummary method
    const testStation = await Station.findOne({ isActive: true });
    if (testStation) {
      console.log('Testing getSummary method:');
      console.log(testStation.getSummary());
    }
    
    // Test the available stations query
    const availableStations = await Station.find({ isActive: true });
    console.log(`\nAvailable stations: ${availableStations.length}`);
    availableStations.forEach(station => {
      console.log(`- ${station.name} (${station.number})`);
    });
    
  } catch (error) {
    console.error('Error testing stations:', error);
  } finally {
    mongoose.connection.close();
  }
};

testStations();
