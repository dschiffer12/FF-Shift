import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  Play,
  Pause,
  Timer
} from 'lucide-react';
import api from '../../services/api';

const TurnDisplay = ({ session, currentUser }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Function to check for timer expiration
  const checkTimeExpiration = useCallback(async () => {
    try {
      console.log('Checking for timer expiration...');
      const response = await api.post(`/bid-sessions/${session.id || session._id}/check-time-expiration`);
      console.log('Timer expiration check response:', response.data);
    } catch (error) {
      console.error('Error checking timer expiration:', error);
    }
  }, [session?.id, session?._id]);

  // Debug logging
  useEffect(() => {
    console.log('TurnDisplay - Session:', session);
    console.log('TurnDisplay - CurrentBidEnd:', session?.currentBidEnd);
    console.log('TurnDisplay - Status:', session?.status);
  }, [session]);

  // Update current time every second and check for timer expiration
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Check for timer expiration every 10 seconds
    const expirationTimer = setInterval(() => {
      if (session?.status === 'active' && session?.currentBidEnd) {
        const endTime = new Date(session.currentBidEnd);
        const now = new Date();
        if (now > endTime) {
          checkTimeExpiration();
        }
      }
    }, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(expirationTimer);
    };
  }, [session?.status, session?.currentBidEnd, checkTimeExpiration]);

  // Calculate time remaining for current bid
  useEffect(() => {
    if (session?.currentBidEnd && (session.status === 'active' || session.status === 'paused')) {
      const endTime = new Date(session.currentBidEnd);
      const remaining = endTime.getTime() - currentTime.getTime();
      setTimeRemaining(Math.max(0, remaining));
      
      // Check for timer expiration when time reaches zero
      if (remaining <= 0 && session.status === 'active') {
        checkTimeExpiration();
      }
    } else if (session?.status === 'active' && session?.bidWindowDuration) {
      // Fallback: if no currentBidEnd is set but session is active, show a default countdown
      const defaultDuration = session.bidWindowDuration * 60 * 1000; // Convert minutes to milliseconds
      setTimeRemaining(defaultDuration);
    } else {
      setTimeRemaining(0);
    }
  }, [session?.currentBidEnd, session?.status, session?.bidWindowDuration, currentTime, checkTimeExpiration]);

  if (!session || (session.status !== 'active' && session.status !== 'paused' && session.status !== 'scheduled')) {
    return null;
  }

  const currentParticipant = session.participants?.find(p => p.position === session.currentParticipant - 1);
  const nextParticipant = session.participants?.find(p => p.position === session.currentParticipant);
  
  // Debug logging for participant finding
  console.log('TurnDisplay - Participant Finding:', {
    currentParticipantIndex: session.currentParticipant,
    currentParticipantPosition: session.currentParticipant - 1,
    currentParticipantFound: currentParticipant,
    nextParticipantFound: nextParticipant,
    allParticipants: session.participants?.map(p => ({
      position: p.position,
      name: `${p.user?.firstName} ${p.user?.lastName}`,
      userId: p.user?._id
    }))
  });
  const isCurrentUserTurn = currentParticipant?.user?.id === currentUser?._id || currentParticipant?.user?._id === currentUser?._id;
  const isNextUserTurn = nextParticipant?.user?.id === currentUser?._id || nextParticipant?.user?._id === currentUser?._id;
  
  // Debug logging
  console.log('TurnDisplay Debug:', {
    sessionId: session.id || session._id,
    status: session.status,
    currentParticipant: session.currentParticipant,
    currentParticipantData: currentParticipant,
    nextParticipantData: nextParticipant,
    currentUser: currentUser?._id,
    isCurrentUserTurn,
    isNextUserTurn,
    participants: session.participants?.map(p => ({
      position: p.position,
      userId: p.user?._id,
      name: `${p.user?.firstName} ${p.user?.lastName}`
    }))
  });

  const formatTime = (milliseconds) => {
    if (milliseconds <= 0) return '00:00';
    const minutes = Math.floor(milliseconds / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getTimeRemainingColor = () => {
    if (timeRemaining <= 0) return 'text-red-600';
    if (timeRemaining <= 60000) return 'text-orange-600'; // 1 minute
    if (timeRemaining <= 180000) return 'text-yellow-600'; // 3 minutes
    return 'text-green-600';
  };

  const getTimeRemainingBg = () => {
    if (timeRemaining <= 0) return 'bg-red-100';
    if (timeRemaining <= 60000) return 'bg-orange-100';
    if (timeRemaining <= 180000) return 'bg-yellow-100';
    return 'bg-green-100';
  };

  return (
    <div className={`rounded-lg border p-6 shadow-sm ${
      isCurrentUserTurn 
        ? 'bg-gradient-to-r from-blue-50 to-green-50 border-blue-300 shadow-lg' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Play className="w-5 h-5 mr-2 text-green-600" />
          Active Bidding Session
          {isCurrentUserTurn && (
            <span className="ml-3 px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full animate-pulse">
              YOUR TURN!
            </span>
          )}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Session:</span>
          <span className="font-medium text-gray-900">{session.name}</span>
        </div>
      </div>

      {/* Current Turn Display */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-medium text-gray-900 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Current Turn
          </h4>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getTimeRemainingBg()}`}>
            <Timer className="w-4 h-4" />
            <span className={`font-mono font-bold text-lg ${getTimeRemainingColor()}`}>
              {formatTime(timeRemaining)}
            </span>
            {!session?.currentBidEnd && session?.status === 'active' && (
              <span className="text-xs text-gray-500">(Default)</span>
            )}
          </div>
        </div>

        {currentParticipant ? (
          <div className={`p-4 rounded-lg border-2 ${isCurrentUserTurn ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCurrentUserTurn ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <User className={`w-5 h-5 ${isCurrentUserTurn ? 'text-blue-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {currentParticipant.user?.firstName} {currentParticipant.user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentParticipant.user?.rank} - {currentParticipant.user?.position}
                  </p>
                  <p className="text-xs text-gray-400">
                    Priority: #{currentParticipant.bidPriority}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {isCurrentUserTurn && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1 text-blue-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Your Turn!</span>
                    </div>
                    <button
                      onClick={() => {
                        // This will be handled by the parent component
                        window.dispatchEvent(new CustomEvent('openBidModal', { 
                          detail: { session } 
                        }));
                      }}
                      className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                    >
                      Bid Now
                    </button>
                  </div>
                )}
                <p className="text-sm text-gray-500">
                  Position: {currentParticipant.position + 1} of {session.participants?.length || 0}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50">
            <p className="text-gray-500 text-center">No current participant</p>
          </div>
        )}
      </div>

      {/* Next in Queue */}
      {nextParticipant && (
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 flex items-center mb-3">
            <Users className="w-4 h-4 mr-2" />
            Next in Queue
          </h4>
          <div className={`p-3 rounded-lg border ${isNextUserTurn ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isNextUserTurn ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <User className={`w-4 h-4 ${isNextUserTurn ? 'text-green-600' : 'text-gray-600'}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {nextParticipant.user?.firstName} {nextParticipant.user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {nextParticipant.user?.rank} - Priority: #{nextParticipant.bidPriority}
                  </p>
                </div>
              </div>
              {isNextUserTurn && (
                <div className="flex items-center space-x-1 text-green-600">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">You're Next!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Session Progress */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Session Progress</span>
          <span className="text-sm font-medium text-gray-900">
            {session.completedBids || 0} of {session.participants?.length || 0} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${session.participants?.length > 0 
                ? Math.round(((session.completedBids || 0) / session.participants.length) * 100) 
                : 0}%` 
            }}
          ></div>
        </div>
      </div>

      {/* Time Warning */}
      {timeRemaining <= 60000 && timeRemaining > 0 && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span className="text-sm text-orange-800 font-medium">
              Time is running out! {formatTime(timeRemaining)} remaining
            </span>
          </div>
        </div>
      )}

      {/* Session Paused */}
      {session.status === 'paused' && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Pause className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-800 font-medium">
              Session is currently paused
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TurnDisplay;
