const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testLogin() {
  console.log('🔍 Testing Login Functionality\n');
  console.log('='.repeat(50));

  try {
    // 1. Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check successful:', healthResponse.data);

    // 2. Test admin login
    console.log('\n2. Testing admin login...');
    const adminLoginData = {
      email: 'admin@example.com',
      password: 'admin123'
    };

    console.log('📤 Sending admin login data:', adminLoginData);
    
    const adminLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, adminLoginData);
    console.log('✅ Admin login successful!');
    console.log('   User:', adminLoginResponse.data.user.email);
    console.log('   Role:', adminLoginResponse.data.user.isAdmin ? 'Admin' : 'User');
    console.log('   Token received:', !!adminLoginResponse.data.token);

    // 3. Test regular user login (if exists)
    console.log('\n3. Testing regular user login...');
    const userLoginData = {
      email: 'user@example.com',
      password: 'user123'
    };

    console.log('📤 Sending user login data:', userLoginData);
    
    const userLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, userLoginData);
    console.log('✅ User login successful!');
    console.log('   User:', userLoginResponse.data.user.email);
    console.log('   Role:', userLoginResponse.data.user.isAdmin ? 'Admin' : 'User');
    console.log('   Token received:', !!userLoginResponse.data.token);

    // 4. Test invalid login
    console.log('\n4. Testing invalid login...');
    const invalidLoginData = {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    };

    try {
      await axios.post(`${API_BASE_URL}/auth/login`, invalidLoginData);
      console.log('❌ Invalid login should have failed!');
    } catch (error) {
      console.log('✅ Invalid login correctly rejected');
      console.log('   Error:', error.response?.data?.error || 'Unknown error');
    }

    console.log('\n✅ All login tests completed successfully!');
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error('   Status:', error.response?.status);
    console.error('   Error:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Server is not running. Please start the server first:');
      console.error('   cd server && npm start');
    }
  }
}

// Run the test
testLogin();
