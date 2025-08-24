import React, { useState, useEffect } from 'react';
import { 
  User, 
  Users, 
  AlertTriangle, 
  Play,
  Pause,
  Timer,
  RotateCcw,
  Eye
} from 'lucide-react';
import Button from '../UI/Button';

const AdminTurnDisplay = ({ session, onPauseSession, onResumeSession, onAutoAssign }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isCheckingExpiration, setIsCheckingExpiration] = useState(false);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate time remaining for current bid
  useEffect(() => {
    if (session?.currentBidEnd) {
      const remaining = new Date(session.currentBidEnd) - currentTime;
      setTimeRemaining(Math.max(0, remaining));
    } else {
      setTimeRemaining(0);
    }
  }, [session?.currentBidEnd, currentTime]);

  // Check for time expiration every 5 seconds when session is active
  useEffect(() => {
    if (!session || session.status !== 'active' || isCheckingExpiration) {
      return;
    }

    const checkExpiration = async () => {
      if (timeRemaining <= 0 && timeRemaining > -5000) { // Within 5 seconds of expiration
        setIsCheckingExpiration(true);
        try {
          const response = await fetch(`/api/bid-sessions/${session.id || session._id}/check-time-expiration`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.timeExpired) {
              // Refresh the session data
              window.location.reload();
            }
          }
        } catch (error) {
          console.error('Error checking time expiration:', error);
        } finally {
          setIsCheckingExpiration(false);
        }
      }
    };

    const interval = setInterval(checkExpiration, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [session, timeRemaining, isCheckingExpiration]);

  if (!session || (session.status !== 'active' && session.status !== 'paused' && session.status !== 'scheduled')) {
    return null;
  }

  const currentParticipant = session.participants?.find(p => p.position === session.currentParticipant - 1);
  const nextParticipant = session.participants?.find(p => p.position === session.currentParticipant);
  const upcomingParticipants = session.participants?.slice(session.currentParticipant, session.currentParticipant + 3);

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

  const handleAutoAssign = () => {
    if (onAutoAssign && currentParticipant) {
      const userId = currentParticipant.user.id || currentParticipant.user._id;
      onAutoAssign(session.id || session._id, userId);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Play className="w-5 h-5 mr-2 text-green-600" />
          Admin Session Control
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
          </div>
        </div>

        {currentParticipant && currentParticipant.user ? (
          <div className="p-4 rounded-lg border-2 border-blue-500 bg-blue-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {currentParticipant.user?.firstName} {currentParticipant.user?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {currentParticipant.user?.rank} - {currentParticipant.user?.position}
                  </p>
                  <p className="text-xs text-gray-400">
                    Priority: #{currentParticipant.bidPriority} | Employee ID: {currentParticipant.user?.employeeId}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Position: {currentParticipant.position + 1} of {session.participants?.length || 0}
                </p>
                <p className="text-sm text-gray-500">
                  Has Bid: {currentParticipant.hasBid ? 'Yes' : 'No'}
                </p>
              </div>
            </div>
            
                         {/* Admin Controls */}
             <div className="mt-4 flex items-center justify-between">
               <div className="flex items-center space-x-2">
                 <Button
                   onClick={handleAutoAssign}
                   variant="secondary"
                   size="sm"
                   className="text-purple-600 hover:text-purple-800"
                 >
                   <RotateCcw className="w-4 h-4 mr-1" />
                   Move to Back
                 </Button>
               </div>
              <div className="flex items-center space-x-2">
                                 {session.status === 'active' ? (
                   <Button
                     onClick={() => onPauseSession?.(session.id || session._id)}
                     variant="secondary"
                     size="sm"
                     className="text-yellow-600 hover:text-yellow-800"
                   >
                     <Pause className="w-4 h-4 mr-1" />
                     Pause
                   </Button>
                 ) : (
                   <Button
                     onClick={() => onResumeSession?.(session.id || session._id)}
                     variant="secondary"
                     size="sm"
                     className="text-green-600 hover:text-green-800"
                   >
                     <Play className="w-4 h-4 mr-1" />
                     Resume
                   </Button>
                 )}
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
      {nextParticipant && nextParticipant.user && (
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 flex items-center mb-3">
            <Users className="w-4 h-4 mr-2" />
            Next in Queue
          </h4>
          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
                  <User className="w-4 h-4 text-gray-600" />
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
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Participants */}
      {upcomingParticipants && upcomingParticipants.length > 0 && upcomingParticipants.some(p => p.user) && (
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 flex items-center mb-3">
            <Eye className="w-4 h-4 mr-2" />
            Upcoming (Next 3)
          </h4>
          <div className="space-y-2">
                         {upcomingParticipants.filter(p => p.user).map((participant, index) => (
               <div key={participant.user.id || participant.user._id} className="p-2 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-100">
                      <span className="text-xs font-medium text-gray-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {participant.user?.firstName} {participant.user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {participant.user?.rank} - Priority: #{participant.bidPriority}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">
                    Position {participant.position + 1}
                  </span>
                </div>
              </div>
            ))}
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
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
          <span>Moved to Back: {session.movedToBackCount || 0}</span>
          <span>Total Participants: {session.participants?.length || 0}</span>
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

export default AdminTurnDisplay;
