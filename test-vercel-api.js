const axios = require('axios');

// Test Vercel API endpoints
async function testVercelAPI() {
  // Replace this with your actual Vercel URL
const baseURL = 'https://your-actual-vercel-url.vercel.app';
  
  try {
    console.log('Testing Vercel API...');
    
    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${baseURL}/api/health`);
    console.log('Health response:', healthResponse.data);
    
    // Test login endpoint (should fail with invalid credentials, but not with server error)
    console.log('\n2. Testing login endpoint...');
    try {
      const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      console.log('Login response:', loginResponse.data);
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Login endpoint working (expected 401 for invalid credentials)');
        console.log('Response:', error.response.data);
      } else {
        console.log('❌ Login endpoint error:', error.response?.data || error.message);
      }
    }
    
    // Test with valid admin credentials (if you have them)
    console.log('\n3. Testing with admin credentials...');
    try {
      const adminLoginResponse = await axios.post(`${baseURL}/api/auth/login`, {
        email: 'admin@ffshift.com',
        password: 'admin123'
      });
      console.log('✅ Admin login successful!');
      console.log('User:', adminLoginResponse.data.user.email);
      console.log('Token received:', !!adminLoginResponse.data.token);
    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testVercelAPI();
