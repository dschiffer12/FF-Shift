const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testAuth() {
  console.log('🔍 Testing Authentication\n');
  console.log('='.repeat(40));

  try {
    // Test health endpoint
    console.log('1. Testing server health...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Server is running:', healthResponse.data);

    // Test admin login
    console.log('\n2. Testing admin login...');
    const adminData = {
      email: 'admin@ffshift.com',
      password: 'admin123'
    };

    const adminResponse = await axios.post(`${API_BASE_URL}/auth/login`, adminData);
    console.log('✅ Admin login successful!');
    console.log('   User:', adminResponse.data.user.email);
    console.log('   Admin:', adminResponse.data.user.isAdmin);
    console.log('   Token:', adminResponse.data.token ? 'Received' : 'Missing');

    // Test with token
    console.log('\n3. Testing authenticated request...');
    const token = adminResponse.data.token;
    const meResponse = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Authenticated request successful!');
    console.log('   Current user:', meResponse.data.user.email);

    console.log('\n✅ All tests passed!');
    console.log('='.repeat(40));

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Server is not running. Start it with:');
      console.error('   cd server && node index.js');
    }
  }
}

testAuth(); 