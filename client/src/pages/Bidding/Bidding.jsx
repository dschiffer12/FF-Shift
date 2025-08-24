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
    currentActiveSession.participants?.some(p => 
      (p.user?.id === user?._id || p.user?._id === user?._id) && 
      p.position === (currentActiveSession.currentParticipant - 1)
    );

  // Check if it's the user's turn
  const isUserTurn = currentActiveSession && 
    (currentActiveSession.status === 'active' || currentActiveSession.status === 'paused') && 
    currentActiveSession.participants?.some(p => 
      (p.user?.id === user?._id || p.user?._id === user?._id) && 
      p.position === (currentActiveSession.currentParticipant - 1)
    );
    
  // Debug logging for turn detection
  console.log('Bidding Component - Turn Detection:', {
    currentActiveSession: currentActiveSession ? {
      id: currentActiveSession.id || currentActiveSession._id,
      status: currentActiveSession.status,
      currentParticipant: currentActiveSession.currentParticipant
    } : null,
    currentUser: user?._id,
    canUserBid,
    isUserTurn,
    participants: currentActiveSession?.participants?.map(p => ({
      position: p.position,
      userId: p.user?._id,
      name: `${p.user?.firstName} ${p.user?.lastName}`,
      isCurrentUser: (p.user?.id === user?._id || p.user?._id === user?._id)
    }))
  });

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
    };
  }, [socket, isConnected]);

  const fetchActiveSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.bidSessions.current);
      const allSessions = response.data.sessions || [];
      
      // Filter to only show active, paused, or scheduled sessions
      const sessions = allSessions.filter(s => 
        s.status === 'active' || s.status === 'paused' || s.status === 'scheduled'
      );
      
      setActiveSessions(sessions);
      
      // Find the currently active or paused session
      const activeSession = sessions.find(s => s.status === 'active' || s.status === 'paused');
      setCurrentActiveSession(activeSession);
      
      // Debug logging
      console.log('Bidding Component - Fetched sessions:', {
        totalSessions: sessions.length,
        activeSession: activeSession,
        sessions: sessions.map(s => ({
          id: s.id || s._id,
          name: s.name,
          status: s.status,
          currentParticipant: s.currentParticipant,
          participantCount: s.participantCount
        }))
      });
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
      const response = await api.get('/api/stations');
      console.log('Stations response:', response.data);
      
      if (response.data.stations && response.data.stations.length > 0) {
        setStations(response.data.stations || []);
      } else {
        // Fallback to available endpoint
        const availableResponse = await api.get('/api/stations/available');
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

  const handleSubmitBid = async () => {
    if (!selectedSession || !socket) {
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
        stationId: bidData.station,
        shift: bidData.shift,
        position: bidData.position
      };
      
      console.log('Submitting bid with data:', bidDataToSend);
      console.log('Socket connected:', socket.connected);
      console.log('Selected session:', selectedSession);
      console.log('Current user:', user);

      // Emit the bid submission via Socket.IO
      socket.emit('submit_bid', bidDataToSend);

      console.log('Bid submitted via Socket.IO');
      
      // The response will be handled by the socket event listeners
      setShowBidModal(false);
      setBidData({ station: '', shift: '', position: '' });
      
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast.error('Failed to submit bid. Please try again.');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bidding Interface</h1>
          <p className="mt-2 text-gray-600">
            Participate in bid sessions and manage your station assignments
          </p>
        </div>
        <div className="flex items-center space-x-3">
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
          <Button
            variant="primary"
            size="sm"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </Button>
        </div>
             </div>

       {/* Prominent Bid Now Button */}
       {isUserTurn && (
         <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 shadow-sm">
           <div className="text-center">
             <div className="flex items-center justify-center mb-4">
               <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mr-4">
                 <Target className="w-8 h-8 text-green-600" />
               </div>
               <div className="text-left">
                 <h2 className="text-2xl font-bold text-gray-900">It's Your Turn!</h2>
                 <p className="text-gray-600">You can now place your bid for the current session</p>
               </div>
             </div>
             <Button
               variant="primary"
               size="lg"
               onClick={() => {
                 setSelectedSession(currentActiveSession);
                 setShowBidModal(true);
               }}
               className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold shadow-lg"
             >
               <Target className="w-6 h-6 mr-3" />
               BID NOW
             </Button>
           </div>
         </div>
       )}

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Target className="w-5 h-5 mr-2" />
                My Current Status
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Award className="w-6 h-6 text-primary-600" />
                  </div>
                  <p className="text-sm text-gray-600">Bid Priority</p>
                  <p className="text-lg font-bold text-gray-900">#{user?.bidPriority || 'N/A'}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Star className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">Seniority</p>
                  <p className="text-lg font-bold text-gray-900">{user?.seniorityScore || 'N/A'}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">Current Station</p>
                  <p className="text-lg font-bold text-gray-900">{user?.currentStation?.name || 'Unassigned'}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600">Years of Service</p>
                  <p className="text-lg font-bold text-gray-900">{user?.yearsOfService || 0}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Turn Display - Show when there's an active session */}
          {currentActiveSession && (
            <TurnDisplay session={currentActiveSession} currentUser={user} />
          )}

          {/* Active Bid Sessions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Play className="w-5 h-5 mr-2" />
                Active Bid Sessions
              </h3>
            </div>
            <div className="card-body">
              {activeSessions.length > 0 ? (
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <div key={session.id || session._id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{session.name}</h4>
                            <p className="text-sm text-gray-500">{session.description}</p>
                          </div>
                        </div>
                                                 <div className="flex items-center space-x-2">
                           <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSessionStatusColor(session.status)}`}>
                             {session.status}
                           </span>
                           {getSessionStatusIcon(session.status)}
                         </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {formatDate(session.scheduledStart)} - {formatDate(session.scheduledEnd)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {session.participantCount || 0} participants
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {session.availableStations || 0} stations available
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Target className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {session.bidWindowDuration || 5} min windows
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-end space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedSession(session)}
                        >
                          View Details
                        </Button>
                                                                                                   {(session.status === 'active' || session.status === 'paused') && (
                            <>
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
                 <div className="text-center py-8">
                   <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                   <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h3>
                   <p className="text-gray-600">
                     There are no active, paused, or scheduled bid sessions at the moment. Check back later!
                   </p>
                 </div>
               )}
            </div>
          </div>

          {/* Recent Bids */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Recent Bids
              </h3>
            </div>
            <div className="card-body">
              {bidsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : myBids.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Session
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Station
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {myBids.slice(0, 5).map((bid) => (
                        <tr key={bid._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(bid.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {bid.session?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {bid.station?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBidStatusColor(bid.status)}`}>
                              {bid.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            #{bid.bidPriority || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Bids</h3>
                  <p className="text-gray-600">
                    You haven't placed any bids yet. Join an active session to get started!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Bidding Stats</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Bids</span>
                  <span className="font-medium text-gray-900">{myBids.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Successful</span>
                  <span className="font-medium text-green-600">
                    {myBids.filter(bid => bid.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="font-medium text-blue-600">
                    {myBids.length > 0 
                      ? Math.round((myBids.filter(bid => bid.status === 'completed').length / myBids.length) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Sessions</span>
                  <span className="font-medium text-orange-600">
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
