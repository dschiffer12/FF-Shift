import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle, 
  User, 
  Building2, 
  X,
  TrendingUp
} from 'lucide-react';

const BidNotification = ({ session, socket, isConnected }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for new bid submissions
    const handleBidSubmitted = (data) => {
      const newNotification = {
        id: Date.now(),
        type: 'bid_submitted',
        message: `${data.userName || 'A user'} placed a bid for ${data.stationName || 'a station'}`,
        details: {
          station: data.stationName,
          shift: data.shift,
          position: data.position,
          userName: data.userName
        },
        timestamp: new Date()
      };

      setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep only last 5
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    };

    // Listen for turn updates
    const handleTurnUpdate = (data) => {
      const newNotification = {
        id: Date.now(),
        type: 'turn_update',
        message: `It's ${data.userName || 'someone'}'s turn to bid`,
        details: {
          userName: data.userName,
          position: data.position
        },
        timestamp: new Date()
      };

      setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
      }, 5000);
    };

    socket.on('bid-submitted', handleBidSubmitted);
    socket.on('turn-updated', handleTurnUpdate);

    return () => {
      socket.off('bid-submitted', handleBidSubmitted);
      socket.off('turn-updated', handleTurnUpdate);
    };
  }, [socket, isConnected]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'bid_submitted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'turn_update':
        return <User className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'bid_submitted':
        return 'bg-green-50 border-green-200';
      case 'turn_update':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (!session || session.status !== 'active') {
    return null;
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Live Updates</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              <div className="p-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border mb-2 ${getNotificationColor(notification.type)}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.message}
                        </p>
                        {notification.details && (
                          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                            {notification.details.station && (
                              <div className="flex items-center space-x-1">
                                <Building2 className="w-3 h-3" />
                                <span>{notification.details.station}</span>
                              </div>
                            )}
                            {notification.details.shift && (
                              <span>{notification.details.shift} Shift</span>
                            )}
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeNotification(notification.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">No recent updates</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BidNotification;
