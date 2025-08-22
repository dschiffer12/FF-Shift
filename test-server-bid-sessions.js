const axios = require('axios');

// Configuration for local Express server
const API_BASE_URL = 'http://localhost:5000/api';
const ADMIN_EMAIL = 'admin@example.com'; // Replace with your admin email
const ADMIN_PASSWORD = 'admin123'; // Replace with your admin password

async function testExpressServer() {
  console.log('🚀 Testing Express Server Bid Sessions\n');
  console.log('='.repeat(60));

  try {
    // 1. Test health endpoint
    console.log('🔍 1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check successful:', healthResponse.data);

    // 2. Test admin login
    console.log('\n🔍 2. Testing admin login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (!loginResponse.data.accessToken) {
      throw new Error('No access token received');
    }
    
    const token = loginResponse.data.accessToken;
    console.log('✅ Admin login successful');

    // 3. Test bid session creation
    console.log('\n🔍 3. Testing bid session creation...');
    const sessionData = {
      name: 'Test Express Session',
      year: 2024,
      description: 'Test session for Express server',
      scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      scheduledEnd: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      bidWindowDuration: 5,
      autoAssignTimeout: 2,
      settings: {
        allowMultipleBids: false,
        requirePositionMatch: true,
        allowCrossShiftBidding: false,
        maxBidAttempts: 3
      }
    };

    console.log('📤 Sending session data:', JSON.stringify(sessionData, null, 2));

    const createResponse = await axios.post(`${API_BASE_URL}/bid-sessions`, sessionData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Bid session creation successful:', createResponse.data);

    // 4. Test listing bid sessions
    console.log('\n🔍 4. Testing bid session listing...');
    const listResponse = await axios.get(`${API_BASE_URL}/bid-sessions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Bid session listing successful:', listResponse.data);

    // 5. Test getting specific session
    if (createResponse.data.bidSession && createResponse.data.bidSession._id) {
      console.log('\n🔍 5. Testing specific session retrieval...');
      const sessionResponse = await axios.get(`${API_BASE_URL}/bid-sessions/${createResponse.data.bidSession._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Specific session retrieval successful:', sessionResponse.data);
    }

    console.log('\n✅ All Express server tests completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data || error.message);
    
    if (error.response?.data?.error) {
      console.error('   Server Error:', error.response.data.error);
    }
    
    if (error.response?.data?.errors) {
      console.error('   Validation Errors:', error.response.data.errors);
    }
  }
}

// Run the test
testExpressServer();
