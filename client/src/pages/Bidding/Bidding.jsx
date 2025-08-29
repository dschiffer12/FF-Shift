import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { 
  Target, 
  Clock, 
  Building2, 
  Users, 
  Award, 
  AlertCircle, 
  CheckCircle, 
  Play, 
  Pause, 
  Calendar,
  BarChart3,
  Settings,
  RefreshCw,
  Bell,
  Star,
  X,
  Edit3
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import TurnDisplay from '../../components/Bidding/TurnDisplay';
import BiddingSessions from '../../components/Bidding/BiddingSessions';
import BidNotification from '../../components/Bidding/BidNotification';
import api, { endpoints } from '../../services/api';
import toast from 'react-hot-toast';

const Bidding = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [activeSessions, setActiveSessions] = useState([]);
  const [myBids, setMyBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bidsLoading, setBidsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidData, setBidData] = useState({
    station: '',
    shift: '',
    position: ''
  });
  const [hasNewSessions, setHasNewSessions] = useState(false);
  const [currentActiveSession, setCurrentActiveSession] = useState(null);
  const [stations, setStations] = useState([]);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [stationsLoading, setStationsLoading] = useState(false);

  // Check if current user can bid
  const canUserBid = currentActiveSession && 
    (currentActiveSession.status === 'active' || currentActiveSession.status === 'paused') && 
    currentActiveSession.participants?.length > 0 &&
    currentActiveSession.currentParticipant > 0 &&
    currentActiveSession.currentParticipant <= currentActiveSession.participants.length &&
    currentActiveSession.participants?.some(p => 
      (p.user?.id === user?._id || p.user?._id === user?._id)
    ) &&
    currentActiveSession.participants?.some(p => 
      (p.user?.id === user?._id || p.user?._id === user?._id) && 
      p.position === (currentActiveSession.currentParticipant - 1)
    );

  // Check if it's the user's turn
  const isUserTurn = currentActiveSession && 
    (currentActiveSession.status === 'active' || currentActiveSession.status === 'paused') && 
    currentActiveSession.participants?.length > 0 &&
    currentActiveSession.currentParticipant > 0 &&
    currentActiveSession.currentParticipant <= currentActiveSession.participants.length &&
    currentActiveSession.participants?.some(p => 
      (p.user?.id === user?._id || p.user?._id === user?._id)
    ) &&
    currentActiveSession.participants?.some(p => 
      (p.user?.id === user?._id || p.user?._id === user?._id) && 
      p.position === (currentActiveSession.currentParticipant - 1)
    );
    
  useEffect(() => {
    fetchActiveSessions();
    fetchMyBids();
    fetchStations();
  }, []);

  // Listen for bid modal events from TurnDisplay
  useEffect(() => {
    const handleOpenBidModal = (event) => {
      const { session } = event.detail;
      setSelectedSession(session);
      setShowBidModal(true);
    };

    window.addEventListener('openBidModal', handleOpenBidModal);

    return () => {
      window.removeEventListener('openBidModal', handleOpenBidModal);
    };
  }, []);

  // Join bid session rooms when sessions are loaded
  useEffect(() => {
    if (socket && isConnected && activeSessions.length > 0) {
      console.log('Joining bid session rooms for sessions:', activeSessions);
             activeSessions.forEach(session => {
         if (session.status === 'active' || session.status === 'paused' || session.status === 'scheduled') {
           const sessionId = session.id || session._id;
           console.log('Joining session:', sessionId);
           socket.emit('join_bid_session', { sessionId });
          
          // Add a listener to confirm room joining
          socket.on('bid_session_joined', (data) => {
            console.log('Successfully joined bid session room:', data);
          });
          
          // Add a listener for errors
          socket.on('error', (error) => {
            console.error('Socket error while joining session:', error);
          });
        }
      });
    }
  }, [socket, isConnected, activeSessions]);

  // Socket event listeners for real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new bid sessions
    const handleNewBidSession = (data) => {
      console.log('New bid session received:', data);
      setHasNewSessions(true);
      fetchActiveSessions(); // Refresh the sessions list
    };

    // Listen for session status changes
    const handleSessionStatusChange = (data) => {
      console.log('Session status changed:', data);
      fetchActiveSessions(); // Refresh the sessions list
    };

    // Listen for bid submissions
    const handleBidSubmitted = (data) => {
      console.log('Bid submitted:', data);
      fetchMyBids(); // Refresh user's bids
    };

    // Listen for turn updates
    const handleTurnUpdate = (data) => {
      console.log('Turn updated:', data);
      toast(data.message || 'Turn updated');
      fetchActiveSessions(); // Refresh to get updated turn information
    };

    // Listen for bid confirmation
    const handleBidConfirmed = (data) => {
      console.log('Bid confirmed:', data);
      toast.success(`Bid submitted successfully! Station: ${data.station.name}, Shift: ${data.shift}, Position: ${data.position}`);
      fetchMyBids(); // Refresh user's bids
      fetchActiveSessions(); // Refresh sessions to get updated turn info
    };

    // Listen for bid errors
    const handleBidError = (data) => {
      console.error('Bid error:', data);
      toast.error(data.message || 'Failed to submit bid');
      setSubmittingBid(false);
    };

    // Listen for successful session join
    const handleSessionJoined = (data) => {
      console.log('Joined bid session:', data);
      toast.success(`Joined bid session: ${data.session.name}`);
    };

    // Listen for session updates
    const handleSessionUpdated = (data) => {
      console.log('Session updated:', data);
      fetchActiveSessions(); // Refresh to get updated session data
    };

    // Listen for joined bid session notification
    const handleJoinedBidSession = (data) => {
      console.log('Joined bid session notification:', data);
      toast.success(`Successfully joined ${data.sessionName}`);
      fetchActiveSessions(); // Refresh to get updated session data
    };

    // Listen for auto-join bid session
    const handleAutoJoinBidSession = (data) => {
      console.log('Auto-join bid session:', data);
      toast.success(`Automatically joined ${data.sessionName}`);
      fetchActiveSessions(); // Refresh to get updated session data
    };

    socket.on('new-bid-session', handleNewBidSession);
    socket.on('bid-session-started', handleSessionStatusChange);
    socket.on('bid-session-paused', handleSessionStatusChange);
    socket.on('bid-session-resumed', handleSessionStatusChange);
    socket.on('bid-session-completed', handleSessionStatusChange);
    socket.on('bid-submitted', handleBidSubmitted);
    socket.on('turn-updated', handleTurnUpdate);
    socket.on('turn-timeout-warning', handleTurnUpdate);
    socket.on('bid_confirmed', handleBidConfirmed);
    socket.on('error', handleBidError);
    socket.on('bid_session_joined', handleSessionJoined);
    socket.on('session-updated', handleSessionUpdated);
    socket.on('joined-bid-session', handleJoinedBidSession);
    socket.on('auto-join-bid-session', handleAutoJoinBidSession);

    return () => {
      socket.off('new-bid-session', handleNewBidSession);
      socket.off('bid-session-started', handleSessionStatusChange);
      socket.off('bid-session-paused', handleSessionStatusChange);
      socket.off('bid-session-resumed', handleSessionStatusChange);
      socket.off('bid-session-completed', handleSessionStatusChange);
      socket.off('bid-submitted', handleBidSubmitted);
      socket.off('turn-updated', handleTurnUpdate);
      socket.off('turn-timeout-warning', handleTurnUpdate);
      socket.off('bid_confirmed', handleBidConfirmed);
      socket.off('error', handleBidError);
      socket.off('bid_session_joined', handleSessionJoined);
      socket.off('session-updated', handleSessionUpdated);
      socket.off('joined-bid-session', handleJoinedBidSession);
      socket.off('auto-join-bid-session', handleAutoJoinBidSession);
    };
  }, [socket, isConnected]);

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      // Use the index endpoint to get all sessions, then filter for active ones
      const response = await api.get(endpoints.bidSessions.list);
      const allSessions = response.data.sessions || [];
      
      // Filter to only show active, paused, or scheduled sessions
      const sessions = allSessions.filter(s => 
        s.status === 'active' || s.status === 'paused' || s.status === 'scheduled'
      );
      
      setActiveSessions(sessions);
      
      // Find the currently active or paused session
      const activeSession = sessions.find(s => s.status === 'active' || s.status === 'paused');
      setCurrentActiveSession(activeSession);
      
    } catch (error) {
      console.error('Error fetching active sessions:', error);
      toast.error('Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBids = async () => {
    try {
      setBidsLoading(true);
      const response = await api.get(endpoints.users.bidHistory);
      setMyBids(response.data.bidHistory || []);
    } catch (error) {
      console.error('Error fetching my bids:', error);
    } finally {
      setBidsLoading(false);
    }
  };

  const fetchStations = async () => {
    try {
      setStationsLoading(true);
      console.log('Fetching stations...');
      
      // Try the regular stations endpoint first
      const response = await api.get('/stations');
      console.log('Stations response:', response.data);
      
      if (response.data.stations && response.data.stations.length > 0) {
        setStations(response.data.stations || []);
      } else {
        // Fallback to available endpoint
        const availableResponse = await api.get('/stations/available');
        console.log('Available stations response:', availableResponse.data);
        setStations(availableResponse.data.stations || []);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
      toast.error('Failed to load stations. Please refresh the page.');
    } finally {
      setStationsLoading(false);
    }
  };

  const handleJoinSession = async (session) => {
    try {
      console.log('Joining session:', session.id || session._id);
      
      // First, try to join via API
      const response = await api.post(`/bid-sessions/${session.id || session._id}/join`);
      console.log('Join session API response:', response.data);
      
      // Then join via Socket.IO
      if (socket && isConnected) {
        socket.emit('join_bid_session', { sessionId: session.id || session._id });
        console.log('Emitted join_bid_session event');
      }
      
      toast.success(`Successfully joined ${session.name}`);
      
      // Refresh the sessions to get updated participant information
      fetchActiveSessions();
      
    } catch (error) {
      console.error('Error joining session:', error);
      
      // If API fails, try Socket.IO only
      if (socket && isConnected) {
        socket.emit('join_bid_session', { sessionId: session.id || session._id });
        toast.success(`Joined ${session.name} via real-time connection`);
      } else {
        toast.error('Failed to join session. Please try again.');
      }
    }
  };

  const handleSubmitBid = async () => {
    if (!selectedSession) {
      toast.error('Unable to submit bid. Please try again.');
      return;
    }

    if (!bidData.station || !bidData.shift || !bidData.position) {
      toast.error('Please fill in all bid details');
      return;
    }

    setSubmittingBid(true);

    try {
      const bidDataToSend = {
        sessionId: selectedSession.id || selectedSession._id,
        bidData: {
          station: bidData.station, // This should be the station ID
          shift: bidData.shift,
          position: bidData.position
        }
      };
      
      console.log('Submitting bid with data:', bidDataToSend);
      console.log('Socket connected:', socket?.connected);
      console.log('Selected session:', selectedSession);
      console.log('Current user:', user);

      let bidSubmitted = false;

      // Try Socket.IO first if available
      if (socket && isConnected) {
        try {
          console.log('Attempting bid submission via Socket.IO...');
          console.log('Socket connection status:', socket.connected);
          console.log('Socket ID:', socket.id);
          
          // Create a promise to handle socket response
          const socketPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('Socket timeout'));
            }, 10000); // 10 second timeout

            console.log('Emitting submit_bid event with data:', bidDataToSend);
            socket.emit('submit_bid', bidDataToSend);
            
            // Listen for success response
            const successHandler = (data) => {
              console.log('Received bid_confirmed event:', data);
              clearTimeout(timeout);
              socket.off('bid_confirmed', successHandler);
              socket.off('error', errorHandler);
              resolve(data);
            };

            // Listen for error response
            const errorHandler = (data) => {
              console.log('Received error event:', data);
              clearTimeout(timeout);
              socket.off('bid_confirmed', successHandler);
              socket.off('error', errorHandler);
              reject(new Error(data.message || 'Bid submission failed'));
            };

            socket.on('bid_confirmed', successHandler);
            socket.on('error', errorHandler);
          });

          await socketPromise;
          bidSubmitted = true;
          console.log('Bid submitted successfully via Socket.IO');
          
        } catch (socketError) {
          console.log('Socket.IO bid submission failed, trying REST API...', socketError);
        }
      }

      // Fallback to REST API if Socket.IO failed or is not available
      if (!bidSubmitted) {
        console.log('Attempting bid submission via REST API...');
        
        const response = await api.post(endpoints.bidSessions.submitBid, {
          sessionId: selectedSession.id || selectedSession._id,
          stationId: bidData.station,
          shift: bidData.shift,
          position: bidData.position
        });
        
        if (response.data.success) {
          bidSubmitted = true;
          console.log('Bid submitted successfully via REST API');
          
          // Show success message
          toast.success(`Bid submitted successfully! Station: ${response.data.assignedStation}, Shift: ${response.data.assignedShift}, Position: ${response.data.assignedPosition}`);
          
          // Refresh data
          fetchMyBids();
          fetchActiveSessions();
        } else {
          throw new Error(response.data.error || 'Bid submission failed');
        }
      }

      if (bidSubmitted) {
        setShowBidModal(false);
        setBidData({ station: '', shift: '', position: '' });
      }
      
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast.error(error.message || 'Failed to submit bid. Please try again.');
    } finally {
      setSubmittingBid(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getSessionStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Play className="w-4 h-4 text-green-600" />;
      case 'paused':
        return <Pause className="w-4 h-4 text-orange-600" />;
      case 'scheduled':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'draft':
        return <Edit3 className="w-4 h-4 text-gray-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-purple-600" />;
      default:
        return <Calendar className="w-4 h-4 text-gray-600" />;
    }
  };

  const getBidStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bidding Interface</h1>
          <p className="mt-3 text-gray-600">
            Participate in bid sessions and manage your station assignments
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            onClick={() => {
              fetchActiveSessions();
              setHasNewSessions(false);
            }}
            variant="secondary"
            size="sm"
            className={hasNewSessions ? "bg-orange-100 text-orange-800 border-orange-300" : ""}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh {hasNewSessions && <span className="ml-1 bg-orange-500 text-white rounded-full px-2 py-0.5 text-xs">New</span>}
          </Button>
          {currentActiveSession && (
            <BidNotification 
              session={currentActiveSession} 
              socket={socket} 
              isConnected={isConnected} 
            />
          )}
        </div>
      </div>

      {/* Prominent Bid Now Button */}
      {isUserTurn && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-8 shadow-sm">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mr-6">
                <Target className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-left">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">It's Your Turn!</h2>
                <p className="text-lg text-gray-600">You can now place your bid for the current session</p>
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setSelectedSession(currentActiveSession);
                setShowBidModal(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-4 text-xl font-semibold shadow-lg"
            >
              <Target className="w-7 h-7 mr-3" />
              BID NOW
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Main Content */}
         <div className="lg:col-span-2 space-y-8">

          {/* Turn Display - Show when there's an active session */}
          {currentActiveSession && (
            <div className="card">
              <div className="px-6 py-5 border-b border-rigroster-border">
                <h3 className="text-xl font-medium text-gray-900 flex items-center">
                  <Play className="w-6 h-6 mr-3" />
                  Live Session Status
                </h3>
              </div>
              <div className="p-6">
                <TurnDisplay session={currentActiveSession} currentUser={user} />
              </div>
            </div>
          )}

          {/* Enhanced Bidding Sessions View - Real-time Draft Experience */}
          {currentActiveSession && (
            <div className="card">
              <div className="px-6 py-5 border-b border-rigroster-border">
                <h3 className="text-xl font-medium text-gray-900 flex items-center">
                  <BarChart3 className="w-6 h-6 mr-3" />
                  Live Draft Experience
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Watch the bidding unfold in real-time with recent bids and upcoming participants
                </p>
              </div>
              <div className="p-6">
                <BiddingSessions session={currentActiveSession} currentUser={user} />
              </div>
            </div>
          )}

          {/* Active Bid Sessions */}
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <h3 className="text-xl font-medium text-gray-900 flex items-center">
                <Play className="w-6 h-6 mr-3" />
                Active Bid Sessions
              </h3>
            </div>
            <div className="p-6">
              {activeSessions.length > 0 ? (
                <div className="space-y-6">
                  {activeSessions.map((session) => (
                    <div key={session.id || session._id} className="border rounded-xl p-6 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 mb-1">{session.name}</h4>
                            <p className="text-gray-500">{session.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getSessionStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                          {getSessionStatusIcon(session.status)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="flex items-center">
                          <Clock className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Schedule</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(session.scheduledStart)} - {formatDate(session.scheduledEnd)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Participants</p>
                            <p className="text-xs text-gray-500">
                              {session.participantCount || 0} total
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Building2 className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Stations</p>
                            <p className="text-xs text-gray-500">
                              {session.availableStations || 0} available
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Target className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Time Window</p>
                            <p className="text-xs text-gray-500">
                              {session.bidWindowDuration || 5} minutes
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-end space-x-3">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedSession(session)}
                        >
                          View Details
                        </Button>
                        {(session.status === 'active' || session.status === 'paused') && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleJoinSession(session)}
                            >
                              Join Session
                            </Button>
                            {canUserBid && session.id === currentActiveSession?.id && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedSession(session);
                                  setShowBidModal(true);
                                }}
                              >
                                Place Bid
                              </Button>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => window.location.href = `/live-bid/${session.id || session._id}`}
                            >
                              Join Live Session
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-3">No Active Sessions</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    There are no active, paused, or scheduled bid sessions at the moment. Check back later!
                  </p>
                </div>
              )}
            </div>
          </div>

          
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <h3 className="text-xl font-medium text-gray-900">Bidding Stats</h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Total Bids</span>
                  <span className="text-lg font-bold text-gray-900">{myBids.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Successful</span>
                  <span className="text-lg font-bold text-green-600">
                    {myBids.filter(bid => bid.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Success Rate</span>
                  <span className="text-lg font-bold text-blue-600">
                    {myBids.length > 0 
                      ? Math.round((myBids.filter(bid => bid.status === 'completed').length / myBids.length) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Active Sessions</span>
                  <span className="text-lg font-bold text-orange-600">
                    {activeSessions.filter(s => s.status === 'active').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/profile'}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Preferences
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/bid-history'}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Full History
                </Button>
                <Button
                  variant="secondary"
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/seniority'}
                >
                  <Star className="w-4 h-4 mr-2" />
                  Seniority Info
                </Button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Bid session starting soon</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">Your bid window opens in 30 min</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Bid submitted successfully</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Modal */}
      {showBidModal && selectedSession && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Place Your Bid</h3>
                <p className="text-sm text-gray-500">Session: {selectedSession.name}</p>
              </div>
              <button
                onClick={() => setShowBidModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
                             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Station
                 </label>
                                   <select
                    value={bidData.station}
                    onChange={(e) => setBidData({ ...bidData, station: e.target.value })}
                    className="input"
                    disabled={stationsLoading}
                  >
                    <option value="">
                      {stationsLoading ? 'Loading stations...' : 'Select Station'}
                    </option>
                    {stations.map((station) => {
                      console.log('Rendering station option:', station);
                      return (
                        <option key={station._id} value={station._id}>
                          {station.name} - Station {station.number}
                        </option>
                      );
                    })}
                  </select>
                  {stations.length === 0 && !stationsLoading && (
                    <p className="text-sm text-red-600 mt-1">No stations available</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Debug: {stations.length} stations loaded
                  </p>
               </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shift
                </label>
                <select
                  value={bidData.shift}
                  onChange={(e) => setBidData({ ...bidData, shift: e.target.value })}
                  className="input"
                >
                  <option value="">Select Shift</option>
                  <option value="A">A Shift</option>
                  <option value="B">B Shift</option>
                  <option value="C">C Shift</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                                 <select
                   value={bidData.position}
                   onChange={(e) => setBidData({ ...bidData, position: e.target.value })}
                   className="input"
                 >
                   <option value="">Select Position</option>
                   <option value="Firefighter">Firefighter</option>
                   <option value="Paramedic">Paramedic</option>
                   <option value="Driver">Driver</option>
                   <option value="Officer">Officer</option>
                 </select>
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowBidModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitBid}
                disabled={!bidData.station || !bidData.shift || !bidData.position || submittingBid}
              >
                {submittingBid ? 'Submitting...' : 'Submit Bid'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bidding;
