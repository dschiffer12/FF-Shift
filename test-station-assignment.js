const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001'; // Adjust if your server runs on a different port
let authToken = null;

// Test data
const testUser = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  employeeId: 'TEST001',
  password: 'password123'
};

const testStation = {
  name: 'Test Station',
  number: '999',
  address: '123 Test St, Test City, TS 12345',
  totalCapacity: 12,
  shiftCapacity: {
    A: 4,
    B: 4,
    C: 4
  }
};

async function loginAsAdmin() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com', // Replace with actual admin email
      password: 'password123'     // Replace with actual admin password
    });
    
    authToken = response.data.token;
    console.log('✅ Admin login successful');
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestUser() {
  try {
    const response = await axios.post(`${BASE_URL}/api/admin/users`, testUser, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Test user created:', response.data.user._id);
    return response.data.user;
  } catch (error) {
    console.error('❌ Failed to create test user:', error.response?.data || error.message);
    return null;
  }
}

async function createTestStation() {
  try {
    const response = await axios.post(`${BASE_URL}/api/stations`, testStation, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Test station created:', response.data.station._id);
    return response.data.station;
  } catch (error) {
    console.error('❌ Failed to create test station:', error.response?.data || error.message);
    return null;
  }
}

async function assignUserToStation(userId, stationId) {
  try {
    const response = await axios.put(`${BASE_URL}/api/admin/users/${userId}/station`, {
      stationId: stationId,
      shift: 'A'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ User assigned to station successfully');
    return response.data.user;
  } catch (error) {
    console.error('❌ Failed to assign user to station:', error.response?.data || error.message);
    return null;
  }
}

async function checkStationAssignments(stationId) {
  try {
    const response = await axios.get(`${BASE_URL}/api/stations/${stationId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Station assignments checked');
    console.log('Station assignments:', JSON.stringify(response.data.station.currentAssignments, null, 2));
    return response.data.station;
  } catch (error) {
    console.error('❌ Failed to check station assignments:', error.response?.data || error.message);
    return null;
  }
}

async function cleanup(userId, stationId) {
  try {
    // Remove user from station
    await axios.put(`${BASE_URL}/api/admin/users/${userId}/station`, {
      stationId: null
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    // Delete test user
    await axios.delete(`${BASE_URL}/api/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    // Delete test station
    await axios.delete(`${BASE_URL}/api/stations/${stationId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.response?.data || error.message);
  }
}

async function runTest() {
  console.log('🚀 Starting station assignment test...\n');
  
  // Step 1: Login as admin
  if (!await loginAsAdmin()) {
    console.log('❌ Test failed: Cannot login as admin');
    return;
  }
  
  // Step 2: Create test user
  const user = await createTestUser();
  if (!user) {
    console.log('❌ Test failed: Cannot create test user');
    return;
  }
  
  // Step 3: Create test station
  const station = await createTestStation();
  if (!station) {
    console.log('❌ Test failed: Cannot create test station');
    return;
  }
  
  // Step 4: Assign user to station
  const assignedUser = await assignUserToStation(user._id, station._id);
  if (!assignedUser) {
    console.log('❌ Test failed: Cannot assign user to station');
    return;
  }
  
  // Step 5: Check station assignments
  const updatedStation = await checkStationAssignments(station._id);
  if (!updatedStation) {
    console.log('❌ Test failed: Cannot check station assignments');
    return;
  }
  
  // Step 6: Verify assignment
  const shiftA = updatedStation.currentAssignments.A || [];
  const userAssigned = shiftA.find(assignment => assignment.user._id === user._id);
  
  if (userAssigned) {
    console.log('✅ Test PASSED: User successfully assigned to station');
    console.log(`User ${user.firstName} ${user.lastName} is assigned to ${station.name} on Shift A`);
  } else {
    console.log('❌ Test FAILED: User not found in station assignments');
  }
  
  // Step 7: Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await cleanup(user._id, station._id);
  
  console.log('\n🎉 Test completed!');
}

// Run the test
runTest().catch(console.error);
