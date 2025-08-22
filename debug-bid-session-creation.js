const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const ADMIN_EMAIL = 'admin@example.com'; // Replace with your admin email
const ADMIN_PASSWORD = 'admin123'; // Replace with your admin password

// Test data
const testSessionData = {
  name: 'Test Bid Session',
  year: 2024,
  description: 'Test session for debugging',
  scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  scheduledEnd: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
  bidWindowDuration: 5,
  autoAssignTimeout: 2,
  settings: {
    allowMultipleBids: false,
    requirePositionMatch: true,
    allowCrossShiftBidding: false,
    maxBidAttempts: 3
  },
  participants: []
};

async function testHealthEndpoint() {
  console.log('\n🔍 1. Testing Health Endpoint...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n🔍 2. Testing Database Connection...');
  try {
    const response = await axios.get(`${API_BASE_URL}/test`);
    console.log('✅ Database connection successful:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.response?.data || error.message);
    return false;
  }
}

async function loginAsAdmin() {
  console.log('\n🔍 3. Testing Admin Login...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.accessToken) {
      console.log('✅ Admin login successful');
      return response.data.accessToken;
    } else {
      console.error('❌ Admin login failed: No access token received');
      return null;
    }
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return null;
  }
}

async function testBidSessionCreationWithoutAuth() {
  console.log('\n🔍 4. Testing Bid Session Creation (No Auth)...');
  try {
    const response = await axios.post(`${API_BASE_URL}/bid-sessions`, testSessionData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('❌ Unexpected success (should fail without auth):', response.data);
    return false;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('✅ Correctly rejected without authentication');
      return true;
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testBidSessionCreationWithAuth(token) {
  console.log('\n🔍 5. Testing Bid Session Creation (With Auth)...');
  try {
    console.log('📤 Sending request with data:', JSON.stringify(testSessionData, null, 2));
    
    const response = await axios.post(`${API_BASE_URL}/bid-sessions`, testSessionData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Bid session creation successful:', response.data);
    return response.data.bidSession;
  } catch (error) {
    console.error('❌ Bid session creation failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data || error.message);
    
    if (error.response?.data?.error) {
      console.error('   Server Error:', error.response.data.error);
    }
    
    return null;
  }
}

async function testBidSessionListing() {
  console.log('\n🔍 6. Testing Bid Session Listing...');
  try {
    const response = await axios.get(`${API_BASE_URL}/bid-sessions`);
    console.log('✅ Bid session listing successful:', response.data);
    return response.data.sessions || [];
  } catch (error) {
    console.error('❌ Bid session listing failed:', error.response?.data || error.message);
    return [];
  }
}

async function testSpecificBidSession(sessionId) {
  console.log('\n🔍 7. Testing Specific Bid Session Retrieval...');
  try {
    const response = await axios.get(`${API_BASE_URL}/bid-sessions/${sessionId}`);
    console.log('✅ Specific bid session retrieval successful:', response.data);
    return response.data.bidSession;
  } catch (error) {
    console.error('❌ Specific bid session retrieval failed:', error.response?.data || error.message);
    return null;
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive Bid Session Creation Debug Test\n');
  console.log('='.repeat(60));
  
  // Test 1: Health endpoint
  const healthOk = await testHealthEndpoint();
  if (!healthOk) {
    console.log('\n❌ Stopping tests - Health endpoint failed');
    return;
  }
  
  // Test 2: Database connection
  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    console.log('\n❌ Stopping tests - Database connection failed');
    return;
  }
  
  // Test 3: Admin login
  const token = await loginAsAdmin();
  if (!token) {
    console.log('\n❌ Stopping tests - Admin login failed');
    return;
  }
  
  // Test 4: Creation without auth (should fail)
  const noAuthTest = await testBidSessionCreationWithoutAuth();
  if (!noAuthTest) {
    console.log('\n⚠️  Warning - No auth test didn\'t behave as expected');
  }
  
  // Test 5: Creation with auth
  const createdSession = await testBidSessionCreationWithAuth(token);
  if (!createdSession) {
    console.log('\n❌ Bid session creation failed - this is the main issue');
    console.log('\n🔧 Debugging steps:');
    console.log('   1. Check server logs for detailed error messages');
    console.log('   2. Verify MongoDB connection string');
    console.log('   3. Check if BidSession model is properly imported');
    console.log('   4. Verify all required fields are being sent');
    return;
  }
  
  // Test 6: Listing sessions
  const sessions = await testBidSessionListing();
  console.log(`\n📊 Found ${sessions.length} bid sessions in database`);
  
  // Test 7: Get specific session
  if (createdSession._id) {
    await testSpecificBidSession(createdSession._id);
  }
  
  console.log('\n✅ All tests completed successfully!');
  console.log('='.repeat(60));
}

// Run the test
runComprehensiveTest().catch(error => {
  console.error('💥 Test runner failed:', error);
});
