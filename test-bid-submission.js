const axios = require('axios');

// Test bid submission
async function testBidSubmission() {
  try {
    console.log('Testing bid submission...');
    
    // First, let's test the API endpoint directly
    const response = await axios.post('http://localhost:5000/api/bid-sessions/submit-bid', {
      sessionId: 'test-session-id',
      stationId: 'test-station-id',
      shift: 'A',
      position: 'Firefighter'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('API Response:', response.data);
    
  } catch (error) {
    console.error('Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testBidSubmission();
