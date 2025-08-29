import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { 
  Target, 
  Building2, 
  Users, 
  CheckCircle, 
  Play, 
  BarChart3,
  Settings,
  RefreshCw,
  Timer,
  User,
  X,
  AlertTriangle,
  Wifi,
  WifiOff
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BidHistory from '../../components/Bidding/BidHistory';
import api, { endpoints } from '../../services/api';
import toast from 'react-hot-toast';

const LiveBidding = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [currentParticipant, setCurrentParticipant] = useState(null);
  const [myTurn, setMyTurn] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [bidData, setBidData] = useState({
    station: '',
    shift: '',
    position: ''
  });
  const [showBidForm, setShowBidForm] = useState(false);
  const [availableStations, setAvailableStations] = useState([]);
  
  const timerRef = useRef(null);

  useEffect(() => {
    fetchSessionData();
    setupSocketListeners();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      // Leave the bid session room when component unmounts
      if (socket && isConnected) {
        socket.emit('leave_bid_session', sessionId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Add current user to connected users list when component mounts
  useEffect(() => {
    if (user && !connectedUsers.find(u => u.id === user._id)) {
      setConnectedUsers(prev => [...prev, {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        rank: user.rank,
        position: user.position
      }]);
    }
  }, [user, connectedUsers]);

  useEffect(() => {
    if (timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining]);

  const fetchSessionData = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.bidSessions.detail(sessionId));
      console.log('Session data response:', response.data);
      
      // Handle the API response structure
      const sessionData = response.data.bidSession || response.data;
      setSession(sessionData);
      
      // Extract participants from the session data
      const sessionParticipants = sessionData.participants || [];
      setParticipants(sessionParticipants);
      
      // Set current participant
      setCurrentParticipant(sessionData.currentParticipant || 1);
      
      // Set available stations
      setAvailableStations(response.data.availableStations || []);
      
      // Check if it's user's turn
      const myParticipant = sessionParticipants.find(p => 
        p.user?._id === user._id || p.user?.id === user._id
      );
      if (myParticipant && myParticipant.position === (sessionData.currentParticipant - 1)) {
        setMyTurn(true);
        setTimeRemaining(myParticipant.timeWindow?.duration || 300); // 5 minutes default
      }
      
      console.log('Available stations:', response.data.availableStations);
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast.error('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

    // Join the bid session room
    socket.emit('join_bid_session', { sessionId });

    socket.on('bid_session_joined', (data) => {
      console.log('Joined bid session:', data);
      if (data.session) {
        setSession(data.session);
        setParticipants(data.participants || []);
        setCurrentParticipant(data.currentParticipant?.position || 1);
      }
    });

    socket.on('connected_users_list', (data) => {
      console.log('Received connected users list:', data);
      if (data.sessionId === sessionId) {
        setConnectedUsers(data.users || []);
      }
    });

    socket.on('user_joined_session', (data) => {
      console.log('User joined session:', data);
      setConnectedUsers(prev => {
        const existing = prev.find(u => u.id === data.user.id);
        if (!existing) {
          return [...prev, data.user];
        }
        return prev;
      });
      toast(`${data.user.name} joined the session`);
    });

    socket.on('user_left_session', (data) => {
      console.log('User left session:', data);
      setConnectedUsers(prev => prev.filter(u => u.id !== data.userId));
      toast(`${data.userName} left the session`);
    });

    socket.on('user_disconnected', (data) => {
      console.log('User disconnected:', data);
      setConnectedUsers(prev => prev.filter(u => u.id !== data.userId));
      toast(`${data.userName} disconnected`);
    });

    socket.on('bid-session-updated', (data) => {
      if (data.sessionId === sessionId) {
        setSession(data.session);
        setParticipants(data.participants);
        setCurrentParticipant(data.currentParticipant);
        setAvailableStations(data.availableStations);
      }
    });

    socket.on('turn-started', (data) => {
      if (data.sessionId === sessionId && data.userId === user._id) {
        setMyTurn(true);
        setTimeRemaining(data.duration || 300);
        setShowBidForm(true);
        toast.success('It\'s your turn to bid!');
      }
    });

    socket.on('turn-ended', (data) => {
      if (data.sessionId === sessionId && data.userId === user._id) {
        setMyTurn(false);
        setShowBidForm(false);
        setTimeRemaining(0);
        toast('Your turn has ended');
      }
    });

    socket.on('bid-submitted', (data) => {
      if (data.sessionId === sessionId) {
        toast.success(`${data.userName} submitted a bid for ${data.station}`);
        fetchSessionData(); // Refresh data
      }
    });

    socket.on('session-completed', (data) => {
      if (data.sessionId === sessionId) {
        toast.success('Bid session completed!');
        navigate('/bidding');
      }
    });

    // Request initial connected users
    socket.emit('request_connected_users', { sessionId });

    return () => {
      socket.off('bid_session_joined');
      socket.off('connected_users_list');
      socket.off('user_joined_session');
      socket.off('user_left_session');
      socket.off('user_disconnected');
      socket.off('bid-session-updated');
      socket.off('turn-started');
      socket.off('turn-ended');
      socket.off('bid-submitted');
      socket.off('session-completed');
    };
  };

  const handleSubmitBid = async () => {
    if (!bidData.station || !bidData.shift || !bidData.position) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!socket) {
      toast.error('Not connected to server');
      return;
    }

    try {
      console.log('Submitting bid:', {
        sessionId: sessionId,
        stationId: bidData.station,
        shift: bidData.shift,
        position: bidData.position
      });
      console.log('Socket connected:', !!socket);
      console.log('Socket ID:', socket?.id);

      // Emit the bid submission event
      socket.emit('submit_bid', {
        sessionId: sessionId,
        stationId: bidData.station,
        shift: bidData.shift,
        position: bidData.position
      });

      // Clear the form
      setBidData({
        station: '',
        shift: '',
        position: ''
      });
      setShowBidForm(false);
      setMyTurn(false);

      toast.success('Bid submitted successfully!');
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast.error('Failed to submit bid. Please try again.');
    }
  };

  const handleSkipTurn = async () => {
    if (!socket) {
      toast.error('Not connected to server');
      return;
    }

    try {
      console.log('Skipping turn for session:', sessionId);

      // Emit the skip turn event
      socket.emit('skip-turn', { sessionId: sessionId });

      // Clear the form and turn state
      setBidData({
        station: '',
        shift: '',
        position: ''
      });
      setShowBidForm(false);
      setMyTurn(false);

      toast.success('Turn skipped successfully!');
    } catch (error) {
      console.error('Error skipping turn:', error);
      toast.error('Failed to skip turn. Please try again.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Bidding Session</h1>
          <p className="mt-3 text-gray-600">
            {session?.name || 'Loading session...'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            onClick={() => fetchSessionData()}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => navigate('/bidding')}
            variant="ghost"
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : session ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Session Status */}
            <div className="card">
              <div className="px-6 py-5 border-b border-rigroster-border">
                <h3 className="text-xl font-medium text-gray-900 flex items-center">
                  <Play className="w-6 h-6 mr-3" />
                  Session Status
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-xl">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Total Participants</p>
                    <p className="text-2xl font-bold text-gray-900">{participants.length}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-xl">
                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Target className="w-6 h-6 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Current Turn</p>
                    <p className="text-2xl font-bold text-gray-900">#{currentParticipant || 'N/A'}</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-xl">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Building2 className="w-6 h-6 text-purple-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Available Stations</p>
                    <p className="text-2xl font-bold text-gray-900">{availableStations.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* My Turn Section */}
            {myTurn && (
              <div className="card">
                <div className="px-6 py-5 border-b border-rigroster-border">
                  <h3 className="text-xl font-medium text-gray-900 flex items-center">
                    <Target className="w-6 h-6 mr-3" />
                    It's Your Turn!
                  </h3>
                </div>
                <div className="p-6">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                          <Timer className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">Time Remaining</h4>
                          <p className="text-gray-600">Make your selection before time runs out</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">
                          {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </div>
                        <p className="text-sm text-gray-500">minutes:seconds</p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-4">
                      <Button
                        onClick={() => setShowBidForm(true)}
                        variant="primary"
                        size="lg"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Target className="w-5 h-5 mr-2" />
                        Place Bid
                      </Button>
                      <Button
                        onClick={handleSkipTurn}
                        variant="secondary"
                        size="lg"
                        className="flex-1"
                      >
                        Skip Turn
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Participants List */}
            <div className="card">
              <div className="px-6 py-5 border-b border-rigroster-border">
                <h3 className="text-xl font-medium text-gray-900 flex items-center">
                  <Users className="w-6 h-6 mr-3" />
                  Participants
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {participants.map((participant, index) => (
                    <div 
                      key={participant._id || participant.id} 
                      className={`flex items-center justify-between p-4 rounded-xl border transition-colors duration-200 ${
                        index === (currentParticipant - 1) 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          index === (currentParticipant - 1) 
                            ? 'bg-green-100' 
                            : 'bg-gray-100'
                        }`}>
                          <User className={`w-5 h-5 ${
                            index === (currentParticipant - 1) 
                              ? 'text-green-600' 
                              : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {participant.user?.firstName} {participant.user?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            Position #{index + 1} • {participant.user?.rank || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {index === (currentParticipant - 1) && (
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-green-600">Current Turn</span>
                          </div>
                        )}
                        {participant.hasBid && (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Connected Users */}
            <div className="card">
              <div className="px-6 py-5 border-b border-rigroster-border">
                <h3 className="text-xl font-medium text-gray-900 flex items-center">
                  <Wifi className="w-6 h-6 mr-3" />
                  Connected Users ({connectedUsers.length})
                </h3>
              </div>
              <div className="p-6">
                {connectedUsers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {connectedUsers.map((connectedUser) => (
                      <div 
                        key={connectedUser.id} 
                        className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200"
                      >
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{connectedUser.name}</p>
                          <p className="text-sm text-gray-500">{connectedUser.rank || 'N/A'}</p>
                        </div>
                        <div className="ml-auto">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Wifi className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No users currently connected</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Session Info */}
            <div className="card">
              <div className="px-6 py-5 border-b border-rigroster-border">
                <h3 className="text-xl font-medium text-gray-900 flex items-center">
                  <Settings className="w-6 h-6 mr-3" />
                  Session Info
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Status</span>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      session.status === 'active' ? 'bg-green-100 text-green-800' :
                      session.status === 'paused' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Bid Window</span>
                    <span className="text-sm font-bold text-gray-900">
                      {session.bidWindowDuration || 5} minutes
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">Start Time</span>
                    <span className="text-sm font-bold text-gray-900">
                      {session.actualStart ? new Date(session.actualStart).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">End Time</span>
                    <span className="text-sm font-bold text-gray-900">
                      {session.scheduledEnd ? new Date(session.scheduledEnd).toLocaleTimeString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Available Stations */}
            <div className="card">
              <div className="px-6 py-5 border-b border-rigroster-border">
                <h3 className="text-xl font-medium text-gray-900 flex items-center">
                  <Building2 className="w-6 h-6 mr-3" />
                  Available Stations
                </h3>
              </div>
              <div className="p-6">
                {availableStations.length > 0 ? (
                  <div className="space-y-3">
                    {availableStations.map((station) => (
                      <div key={station._id} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{station.name}</p>
                            <p className="text-sm text-gray-500">{station.location}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-blue-600">
                              {station.availablePositions || 0} positions
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No stations available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Bid History */}
            <div className="card">
              <div className="px-6 py-5 border-b border-rigroster-border">
                <h3 className="text-xl font-medium text-gray-900 flex items-center">
                  <BarChart3 className="w-6 h-6 mr-3" />
                  Session History
                </h3>
              </div>
              <div className="p-6">
                <BidHistory sessionId={sessionId} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-3">Session Not Found</h3>
          <p className="text-gray-600 mb-6">
            The bid session you're looking for doesn't exist or has been removed.
          </p>
          <Button
            onClick={() => navigate('/bidding')}
            variant="primary"
          >
            Back to Bidding
          </Button>
        </div>
      )}

      {/* Bid Form Modal */}
      {showBidForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-md shadow-xl rounded-xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-medium text-gray-900">Place Your Bid</h3>
              <Button
                onClick={() => setShowBidForm(false)}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmitBid} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Station
                </label>
                <select
                  value={bidData.station}
                  onChange={(e) => setBidData({...bidData, station: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a station</option>
                  {availableStations.map((station) => (
                    <option key={station._id} value={station._id}>
                      {station.name} - {station.location}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <select
                  value={bidData.position}
                  onChange={(e) => setBidData({...bidData, position: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select a position</option>
                  <option value="Firefighter">Firefighter</option>
                  <option value="Engineer">Engineer</option>
                  <option value="Lieutenant">Lieutenant</option>
                  <option value="Captain">Captain</option>
                </select>
              </div>
              
              <div className="flex space-x-4">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={false}
                >
                  Submit Bid
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowBidForm(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveBidding;
