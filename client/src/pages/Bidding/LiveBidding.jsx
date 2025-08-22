import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Timer,
  User,
  X,
  Check,
  AlertTriangle
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const LiveBidding = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();
  
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
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
    };
  }, [sessionId]);

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
      const response = await api.get(`/api/bid-sessions/${sessionId}`);
      setSession(response.data.bidSession);
      setParticipants(response.data.participants || []);
      setCurrentParticipant(response.data.currentParticipant);
      setAvailableStations(response.data.availableStations || []);
      
      // Check if it's user's turn
      const myParticipant = response.data.participants?.find(p => p.user._id === user._id);
      if (myParticipant && myParticipant.position === response.data.currentParticipant) {
        setMyTurn(true);
        setTimeRemaining(myParticipant.timeWindow?.duration || 300); // 5 minutes default
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast.error('Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;

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
        toast.info('Your turn has ended');
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

    return () => {
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

    try {
      await api.post(`/api/bid-sessions/${sessionId}/submit-bid`, bidData);
      setShowBidForm(false);
      setMyTurn(false);
      setBidData({ station: '', shift: '', position: '' });
      toast.success('Bid submitted successfully!');
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast.error(error.response?.data?.error || 'Failed to submit bid');
    }
  };

  const handleSkipTurn = async () => {
    try {
      await api.post(`/api/bid-sessions/${sessionId}/skip-turn`);
      setShowBidForm(false);
      setMyTurn(false);
      toast.info('Turn skipped');
    } catch (error) {
      console.error('Error skipping turn:', error);
      toast.error('Failed to skip turn');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getParticipantStatus = (participant) => {
    if (participant.hasBid) return 'completed';
    if (participant.position === currentParticipant) return 'current';
    if (participant.position < currentParticipant) return 'passed';
    return 'waiting';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'current':
        return 'bg-blue-100 text-blue-800';
      case 'passed':
        return 'bg-gray-100 text-gray-800';
      case 'waiting':
        return 'bg-yellow-100 text-yellow-800';
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

  if (!session) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Session Not Found</h3>
        <p className="text-gray-600">The bid session you're looking for doesn't exist.</p>
        <Button
          onClick={() => navigate('/bidding')}
          variant="primary"
          className="mt-4"
        >
          Back to Bidding
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Bidding Session</h1>
          <p className="mt-2 text-gray-600">
            {session.name} - {session.description}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={fetchSessionData}
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
            Exit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Play className="w-5 h-5 mr-2" />
                Session Status
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <p className="text-sm text-gray-600">Participants</p>
                  <p className="text-lg font-bold text-gray-900">{participants.length}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Target className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">Current Turn</p>
                  <p className="text-lg font-bold text-gray-900">#{currentParticipant || 0}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Building2 className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">Available Stations</p>
                  <p className="text-lg font-bold text-gray-900">{availableStations.length}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-lg font-bold text-gray-900">
                    {participants.filter(p => p.hasBid).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* My Turn Alert */}
          {myTurn && (
            <div className="card border-2 border-blue-500 bg-blue-50">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <Timer className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-blue-900">It's Your Turn!</h3>
                      <p className="text-blue-700">You have {formatTime(timeRemaining)} to place your bid</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-900">{formatTime(timeRemaining)}</div>
                    <div className="text-sm text-blue-700">Time Remaining</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bid Form */}
          {myTurn && showBidForm && (
            <div className="card border-2 border-green-500">
              <div className="card-header">
                <h3 className="text-lg font-medium text-gray-900">Place Your Bid</h3>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Station
                    </label>
                    <select
                      value={bidData.station}
                      onChange={(e) => setBidData({ ...bidData, station: e.target.value })}
                      className="input"
                    >
                      <option value="">Select Station</option>
                      {availableStations.map((station) => (
                        <option key={station._id} value={station._id}>
                          {station.name}
                        </option>
                      ))}
                    </select>
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
                      <option value="firefighter">Firefighter</option>
                      <option value="paramedic">Paramedic</option>
                      <option value="driver">Driver</option>
                      <option value="officer">Officer</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center justify-end space-x-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={handleSkipTurn}
                  >
                    Skip Turn
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSubmitBid}
                    disabled={!bidData.station || !bidData.shift || !bidData.position}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Submit Bid
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Participants List */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Participants</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {participants.map((participant) => {
                  const status = getParticipantStatus(participant);
                  const isCurrentUser = participant.user._id === user._id;
                  
                  return (
                    <div 
                      key={participant._id} 
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        isCurrentUser ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {participant.user.firstName} {participant.user.lastName}
                            {isCurrentUser && <span className="ml-2 text-blue-600">(You)</span>}
                          </p>
                          <p className="text-sm text-gray-500">
                            Priority #{participant.bidPriority} • {participant.user.rank}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                          {status === 'completed' && 'Bid Submitted'}
                          {status === 'current' && 'Current Turn'}
                          {status === 'passed' && 'Turn Passed'}
                          {status === 'waiting' && 'Waiting'}
                        </span>
                        
                        {participant.hasBid && (
                          <div className="text-sm text-gray-600">
                            {participant.bid?.station?.name} - {participant.bid?.shift} Shift
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Session Info */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Session Info</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session.status)}`}>
                    {session.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Start Time</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(session.scheduledStart).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">End Time</span>
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(session.scheduledEnd).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Bid Window</span>
                  <span className="text-sm font-medium text-gray-900">
                    {session.bidWindowDuration || 5} minutes
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Available Stations */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Available Stations</h3>
            </div>
            <div className="card-body">
              <div className="space-y-2">
                {availableStations.length > 0 ? (
                  availableStations.map((station) => (
                    <div key={station._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-900">{station.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">{station.location}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No stations available
                  </p>
                )}
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
                  View History
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveBidding;
