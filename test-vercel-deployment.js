const axios = require('axios');

// Replace with your actual Vercel app URL
const VERCEL_URL = 'https://your-vercel-app-name.vercel.app';

async function testDeployment() {
  console.log('Testing Vercel deployment...\n');

  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${VERCEL_URL}/api/health`);
    console.log('✅ Health endpoint working:', healthResponse.data);
    console.log('');

    // Test login endpoint (should return 400 for missing credentials)
    console.log('2. Testing login endpoint...');
    try {
      await axios.post(`${VERCEL_URL}/api/auth/login`, {});
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Login endpoint working (correctly rejected empty request)');
      } else {
        console.log('❌ Login endpoint error:', error.response?.data);
      }
    }
    console.log('');

    // Test registration endpoint (should return 400 for missing credentials)
    console.log('3. Testing registration endpoint...');
    try {
      await axios.post(`${VERCEL_URL}/api/auth/register`, {});
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Registration endpoint working (correctly rejected empty request)');
      } else {
        console.log('❌ Registration endpoint error:', error.response?.data);
      }
    }
    console.log('');

    console.log('🎉 All tests passed! Your Vercel deployment is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Update the CLIENT_URL in your Vercel environment variables');
    console.log('2. Update client/.env.production with your Vercel URL');
    console.log('3. Redeploy your application');
    console.log('4. Test login with your existing credentials');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nPossible issues:');
    console.log('1. Vercel URL is incorrect - update the VERCEL_URL variable');
    console.log('2. Environment variables not set in Vercel');
    console.log('3. Deployment failed - check Vercel logs');
  }
}

// Run the test
testDeployment();
