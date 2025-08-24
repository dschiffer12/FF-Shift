const axios = require('axios');

// Test delete bid session functionality
async function testDeleteBidSession() {
  try {
    console.log('Testing delete bid session functionality...');
    
    // First, let's get a list of bid sessions
    const sessionsResponse = await axios.get('http://localhost:5000/api/bid-sessions', {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE' // Replace with actual admin token
      }
    });
    
    console.log('Available sessions:', sessionsResponse.data.sessions?.map(s => ({
      id: s.id,
      name: s.name,
      status: s.status
    })));
    
    // Find a session that can be deleted (not active or completed)
    const deletableSession = sessionsResponse.data.sessions?.find(s => 
      !['active', 'completed'].includes(s.status)
    );
    
    if (!deletableSession) {
      console.log('No sessions available for deletion (all are active or completed)');
      return;
    }
    
    console.log('Found session to delete:', deletableSession.name, 'Status:', deletableSession.status);
    
    // Try to delete the session
    const deleteResponse = await axios.delete(`http://localhost:5000/api/bid-sessions/${deletableSession.id}`, {
      headers: {
        'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE' // Replace with actual admin token
      }
    });
    
    console.log('Delete response:', deleteResponse.data);
    
    // Verify the session was deleted by trying to fetch it again
    try {
      const verifyResponse = await axios.get(`http://localhost:5000/api/bid-sessions/${deletableSession.id}`, {
        headers: {
          'Authorization': 'Bearer YOUR_ADMIN_TOKEN_HERE' // Replace with actual admin token
        }
      });
      console.log('❌ Session still exists after deletion');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Session successfully deleted (404 not found)');
      } else {
        console.log('❌ Unexpected error verifying deletion:', error.response?.data);
      }
    }
    
  } catch (error) {
    console.error('Error testing delete bid session:', error.response?.data || error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testDeleteBidSession();
