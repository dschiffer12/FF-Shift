const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testBidProfileFunctionality() {
  console.log('🔍 Testing Bid Session Profile Functionality\n');
  console.log('='.repeat(50));

  try {
    // 1. Login as admin
    console.log('1. Logging in as admin...');
    const adminLoginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@ffshift.com',
      password: 'admin123'
    });
    
    const token = adminLoginResponse.data.token;
    console.log('✅ Admin login successful');

    // 2. Test getting user preferences
    console.log('\n2. Testing user preferences...');
    try {
      const preferencesResponse = await axios.get(`${API_BASE_URL}/users/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ User preferences retrieved:', preferencesResponse.data.preferences);
    } catch (error) {
      console.log('⚠️  Preferences endpoint not found or error:', error.response?.data || error.message);
    }

    // 3. Test updating user preferences
    console.log('\n3. Testing preference updates...');
    try {
      const updateData = {
        preferredShifts: ['Day', 'Night'],
        preferredStations: ['Station 1', 'Station 2'],
        autoBid: true,
        notifications: true,
        emailNotifications: true,
        smsNotifications: false,
        bidReminders: true,
        autoBidStrategy: 'preferred',
        maxBidAttempts: 5,
        bidTimeout: 60
      };

      const updateResponse = await axios.put(`${API_BASE_URL}/users/preferences`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Preferences updated successfully:', updateResponse.data.preferences);
    } catch (error) {
      console.log('⚠️  Preference update failed:', error.response?.data || error.message);
    }

    // 4. Test getting bid history
    console.log('\n4. Testing bid history...');
    try {
      const historyResponse = await axios.get(`${API_BASE_URL}/users/bid-history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Bid history retrieved:', historyResponse.data.bidHistory?.length || 0, 'entries');
    } catch (error) {
      console.log('⚠️  Bid history endpoint not found or error:', error.response?.data || error.message);
    }

    // 5. Test getting bid status
    console.log('\n5. Testing bid status...');
    try {
      const statusResponse = await axios.get(`${API_BASE_URL}/users/bid-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Bid status retrieved:', statusResponse.data);
    } catch (error) {
      console.log('⚠️  Bid status endpoint not found or error:', error.response?.data || error.message);
    }

    // 6. Test getting seniority
    console.log('\n6. Testing seniority...');
    try {
      const seniorityResponse = await axios.get(`${API_BASE_URL}/users/seniority`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Seniority retrieved:', seniorityResponse.data);
    } catch (error) {
      console.log('⚠️  Seniority endpoint not found or error:', error.response?.data || error.message);
    }

    console.log('\n✅ All bid profile functionality tests completed!');
    console.log('='.repeat(50));

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

testBidProfileFunctionality();
