const mongoose = require('mongoose');
require('dotenv').config();

const Station = require('./server/models/Station');

async function checkStations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const stations = await Station.find({});
    console.log(`Found ${stations.length} stations:`);
    
    stations.forEach(station => {
      console.log(`- ID: ${station._id}`);
      console.log(`  Name: ${station.name}`);
      console.log(`  Number: ${station.number}`);
      console.log(`  Active: ${station.isActive}`);
      console.log(`  Total Capacity: ${station.totalCapacity}`);
      console.log(`  Shift Capacity: A=${station.shiftCapacity?.A}, B=${station.shiftCapacity?.B}, C=${station.shiftCapacity?.C}`);
      console.log('');
    });

    // Check the specific station ID from the logs
    const specificStation = await Station.findById('68a691bd8e5da7195636b93f');
    console.log('Looking for station 68a691bd8e5da7195636b93f:');
    console.log(specificStation ? 'Found!' : 'Not found');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkStations(); 