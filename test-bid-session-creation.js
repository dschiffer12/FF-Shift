const axios = require('axios');

// Test bid session creation
async function testBidSessionCreation() {
  try {
    console.log('Testing bid session creation...');
    
    // First, let's test the health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3000/api/health');
    console.log('Health check:', healthResponse.data);

    // Test creating a bid session
    console.log('\n2. Testing bid session creation...');
    const sessionData = {
      name: 'Test Bid Session',
      year: 2024,
      description: 'Test session for debugging',
      scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
      scheduledEnd: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
      bidWindowDuration: 5,
      autoAssignTimeout: 2,
      settings: {
        allowMultipleBids: false,
        requirePositionMatch: true,
        allowCrossShiftBidding: false,
        maxBidAttempts: 3
      },
      participants: [] // Start with no participants
    };

    console.log('Session data:', JSON.stringify(sessionData, null, 2));

    const createResponse = await axios.post('http://localhost:3000/api/bid-sessions', sessionData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE' // Replace with actual token
      }
    });

    console.log('Create response:', createResponse.data);

    // Test listing bid sessions
    console.log('\n3. Testing bid session listing...');
    const listResponse = await axios.get('http://localhost:3000/api/bid-sessions');
    console.log('List response:', listResponse.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
  }
}

// Test without authentication first
async function testWithoutAuth() {
  try {
    console.log('Testing without authentication...');
    
    const sessionData = {
      name: 'Test Bid Session',
      year: 2024,
      description: 'Test session for debugging',
      scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      scheduledEnd: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      bidWindowDuration: 5,
      autoAssignTimeout: 2,
      participants: []
    };

    const response = await axios.post('http://localhost:3000/api/bid-sessions', sessionData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Response:', response.data);
  } catch (error) {
    console.error('Expected error (no auth):', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  console.log('=== Bid Session Creation Test ===\n');
  
  await testWithoutAuth();
  console.log('\n' + '='.repeat(50) + '\n');
  await testBidSessionCreation();
}

runTests();
