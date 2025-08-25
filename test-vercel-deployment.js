const axios = require('axios');

const VERCEL_URL = 'https://ff-shift.vercel.app';

async function testVercelDeployment() {
  console.log('🔍 Testing Vercel Deployment\n');
  console.log('='.repeat(50));

  try {
    // Test 1: Health endpoint
    console.log('1. Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${VERCEL_URL}/api/health`);
      console.log('✅ Health endpoint working:', healthResponse.data);
    } catch (error) {
      console.log('❌ Health endpoint failed:', error.response?.status, error.response?.data);
    }

    // Test 2: Simple API test
    console.log('\n2. Testing simple API endpoint...');
    try {
      const simpleResponse = await axios.get(`${VERCEL_URL}/api/simple-test`);
      console.log('✅ Simple API test successful:', simpleResponse.data);
    } catch (error) {
      console.log('❌ Simple API test failed:', error.response?.status);
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('<!doctype html>')) {
        console.log('   Issue: API endpoint returning HTML instead of JSON');
      } else {
        console.log('   Error:', error.response?.data);
      }
    }

    // Test 3: Database test endpoint
    console.log('\n3. Testing database connection...');
    try {
      const dbResponse = await axios.get(`${VERCEL_URL}/api/test-db`);
      console.log('✅ Database test successful:', dbResponse.data);
    } catch (error) {
      console.log('❌ Database test failed:', error.response?.status);
      if (error.response?.data && typeof error.response.data === 'string' && error.response.data.includes('<!doctype html>')) {
        console.log('   Issue: API endpoint returning HTML instead of JSON');
      } else {
        console.log('   Error:', error.response?.data);
      }
    }

    // Test 4: Login endpoint
    console.log('\n4. Testing login endpoint...');
    try {
      const loginData = {
        email: 'admin@firedept.com',
        password: 'admin123'
      };
      
      const loginResponse = await axios.post(`${VERCEL_URL}/api/auth/login`, loginData);
      console.log('✅ Login endpoint working');
      console.log('   User:', loginResponse.data.user?.email);
      console.log('   Token received:', !!loginResponse.data.token);
    } catch (error) {
      console.log('❌ Login endpoint failed:', error.response?.status);
      console.log('   Error:', error.response?.data);
    }

    // Test 5: Frontend accessibility
    console.log('\n5. Testing frontend...');
    try {
      const frontendResponse = await axios.get(`${VERCEL_URL}/`);
      console.log('✅ Frontend accessible:', frontendResponse.status);
    } catch (error) {
      console.log('❌ Frontend failed:', error.response?.status);
    }

    console.log('\n' + '='.repeat(50));
    console.log('Test completed!');

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testVercelDeployment();
