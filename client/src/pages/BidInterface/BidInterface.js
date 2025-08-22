import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { 
  Clock, 
  Building2, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  X,
  Play,
  Pause,
  Timer,
  Award,
  MapPin,
  Calendar,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const BidInterface = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [currentSession, setCurrentSession] = useState(null);
  const [availableStations, setAvailableStations] = useState([]);
  const [userPosition, setUserPosition] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isUserTurn, setIsUserTurn] = useState(false);
  const [selectedStation, setSelectedStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidHistory, setBidHistory] = useState([]);
  const [sessionStatus, setSessionStatus] = useState('waiting');
  
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    fetchCurrentSession();
    
    if (socket) {
      socket.on('bid-session-update', handleSessionUpdate);
      socket.on('user-turn', handleUserTurn);
      socket.on('bid-submitted', handleBidSubmitted);
      socket.on('session-ended', handleSessionEnded);
      
      return () => {
        socket.off('bid-session-update');
        socket.off('user-turn');
        socket.off('bid-submitted');
        socket.off('session-ended');
      };
    }
  }, [socket]);

  useEffect(() => {
    if (currentSession && isUserTurn) {
      startCountdown();
    } else {
      clearInterval(countdownRef.current);
    }

    return () => {
      clearInterval(countdownRef.current);
    };
  }, [currentSession, isUserTurn, timeRemaining]);

  const fetchCurrentSession = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/bid-sessions/active');
      if (response.data.session) {
        setCurrentSession(response.data.session);
        setSessionStatus(response.data.session.status);
        await fetchAvailableStations();
        await fetchUserPosition();
        await fetchBidHistory();
      }
    } catch (error) {
      console.error('Error fetching current session:', error);
      toast.error('Failed to load current bid session');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableStations = async () => {
    try {
      const response = await api.get('/api/stations/available');
      setAvailableStations(response.data.stations || []);
    } catch (error) {
      console.error('Error fetching available stations:', error);
    }
  };

  const fetchUserPosition = async () => {
    try {
      const response = await api.get('/api/users/bid-status');
      setUserPosition(response.data.position);
      setIsUserTurn(response.data.isUserTurn || false);
      setTimeRemaining(response.data.timeRemaining || 0);
    } catch (error) {
      console.error('Error fetching user position:', error);
    }
  };

  const fetchBidHistory = async () => {
    try {
      const response = await api.get('/api/bid-sessions/history');
      setBidHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching bid history:', error);
    }
  };

  const handleSessionUpdate = (data) => {
    setCurrentSession(data.session);
    setSessionStatus(data.session.status);
    if (data.userPosition) {
      setUserPosition(data.userPosition);
    }
  };

  const handleUserTurn = (data) => {
    setIsUserTurn(true);
    setTimeRemaining(data.timeRemaining || currentSession?.bidTimeLimit || 300);
    toast.success('It\'s your turn to bid!', {
      duration: 5000,
      icon: '🎯'
    });
  };

  const handleBidSubmitted = (data) => {
    setBidHistory(prev => [data.bid, ...prev]);
    if (data.userId === user._id) {
      setIsUserTurn(false);
      setSelectedStation(null);
      toast.success('Bid submitted successfully!', {
        icon: '✅'
      });
    }
  };

  const handleSessionEnded = (data) => {
    setSessionStatus('completed');
    setIsUserTurn(false);
    toast.success('Bid session has ended!', {
      icon: '🏁'
    });
  };

  const startCountdown = () => {
    countdownRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          setIsUserTurn(false);
          toast.error('Time expired! Your turn has passed.', {
            icon: '⏰'
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStationSelect = (station) => {
    setSelectedStation(station);
  };

  const handleSubmitBid = async () => {
    if (!selectedStation) {
      toast.error('Please select a station first');
      return;
    }

    try {
      setSubmittingBid(true);
      const response = await api.post('/api/bid-sessions/submit-bid', {
        sessionId: currentSession._id,
        stationId: selectedStation._id,
        shift: selectedStation.preferredShift || 'A'
      });

      if (response.data.success) {
        toast.success('Bid submitted successfully!');
        setIsUserTurn(false);
        setSelectedStation(null);
        await fetchBidHistory();
      }
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast.error(error.response?.data?.error || 'Failed to submit bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'waiting': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'paused': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
      case 'waiting': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="text-center py-12">
        <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Bid Session</h2>
        <p className="text-gray-600 mb-6">
          There is currently no active bid session. Check back later or contact your administrator.
        </p>
        <Button onClick={fetchCurrentSession} variant="primary">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bid Interface</h1>
          <p className="mt-2 text-gray-600">
            Real-time shift bidding session
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-2 ${getStatusColor(sessionStatus)}`}>
            {getStatusIcon(sessionStatus)}
            <span className="capitalize">{sessionStatus}</span>
          </div>
          <Button onClick={fetchCurrentSession} variant="secondary" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Session Info */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">{currentSession.name}</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Session Period</p>
                <p className="font-medium text-gray-900">
                  {new Date(currentSession.startDate).toLocaleDateString()} - {new Date(currentSession.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Participants</p>
                <p className="font-medium text-gray-900">{currentSession.participantCount || 0}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Timer className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Bid Time Limit</p>
                <p className="font-medium text-gray-900">{formatTime(currentSession.bidTimeLimit || 300)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Position & Timer */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Position */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Your Position</h3>
            </div>
            <div className="card-body">
              {userPosition ? (
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    #{userPosition}
                  </div>
                  <p className="text-sm text-gray-600">
                    {userPosition === 1 ? 'You are next!' : `${userPosition - 1} people ahead of you`}
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <p>Position not available</p>
                </div>
              )}
            </div>
          </div>

          {/* Timer */}
          {isUserTurn && (
            <div className="card border-2 border-primary-500 bg-primary-50">
              <div className="card-header">
                <h3 className="text-lg font-medium text-primary-900">Your Turn!</h3>
              </div>
              <div className="card-body">
                <div className="text-center">
                  <div className="text-4xl font-bold text-primary-600 mb-2">
                    {formatTime(timeRemaining)}
                  </div>
                  <p className="text-sm text-primary-700">
                    Time remaining to submit your bid
                  </p>
                  {timeRemaining <= 30 && (
                    <div className="mt-2 flex items-center justify-center text-red-600">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">Time running out!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bid History */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Recent Bids</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {bidHistory.length > 0 ? (
                  bidHistory.slice(0, 10).map((bid, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">Station {bid.station.number}</span>
                        <span className="text-gray-500">Shift {bid.shift}</span>
                      </div>
                      <span className="text-gray-500 text-xs">
                        {new Date(bid.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center">No bids yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Available Stations */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Available Stations</h3>
            </div>
            <div className="card-body">
              {isUserTurn ? (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <p className="text-yellow-800 font-medium">It's your turn to bid!</p>
                    </div>
                    <p className="text-yellow-700 text-sm mt-1">
                      Select a station below and click "Submit Bid" before time runs out.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableStations.map((station) => (
                      <div
                        key={station._id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedStation?._id === station._id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                        onClick={() => handleStationSelect(station)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            Station {station.number}
                          </h4>
                          {selectedStation?._id === station._id && (
                            <CheckCircle className="w-5 h-5 text-primary-600" />
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{station.name}</p>
                        
                        {station.address && (
                          <div className="flex items-center text-sm text-gray-500 mb-2">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{station.address.street}, {station.address.city}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {['A', 'B', 'C'].map((shift) => {
                            const capacity = station.shiftCapacity?.[shift] || 0;
                            const current = station.currentAssignments?.[shift]?.length || 0;
                            const available = capacity - current;
                            
                            return (
                              <div key={shift} className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-medium">Shift {shift}</div>
                                <div className={`font-bold ${
                                  available > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {available}
                                </div>
                                <div className="text-gray-500">available</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedStation && (
                    <div className="flex items-center justify-between p-4 bg-primary-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Building2 className="w-5 h-5 text-primary-600" />
                        <div>
                          <p className="font-medium text-primary-900">
                            Selected: Station {selectedStation.number}
                          </p>
                          <p className="text-sm text-primary-700">{selectedStation.name}</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleSubmitBid}
                        variant="primary"
                        loading={submittingBid}
                        disabled={submittingBid}
                      >
                        Submit Bid
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Waiting for your turn
                  </h3>
                  <p className="text-gray-600">
                    {userPosition ? 
                      `You are position #${userPosition} in the queue` : 
                      'Your position will be displayed here'
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BidInterface;
