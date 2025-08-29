import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Building2, 
  SkipForward, 
  ArrowDown, 
  Play, 
  Pause, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import api, { endpoints } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';

const BidHistory = ({ sessionId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      // eslint-disable-next-line no-console
      console.log('Fetching history for sessionId:', sessionId);
      setLoading(true);
      
      // Add a small delay to simulate loading
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const response = await api.get(endpoints.bidSessions.history(sessionId));
      // eslint-disable-next-line no-console
      console.log('History API response:', response.data);
      setHistory(response.data.history || []);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error fetching bid history:', error);
      // eslint-disable-next-line no-console
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      setError(error.message);
      toast.error('Failed to load bid history');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('BidHistory component received sessionId:', sessionId);
    if (sessionId) {
      fetchHistory();
    }
  }, [sessionId, fetchHistory]);

  const getActionIcon = (action) => {
    switch (action) {
      case 'bid_submitted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'turn_skipped':
        return <SkipForward className="w-4 h-4 text-yellow-600" />;
      case 'moved_to_back':
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      case 'auto_assigned':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'session_started':
        return <Play className="w-4 h-4 text-blue-600" />;
      case 'session_paused':
        return <Pause className="w-4 h-4 text-yellow-600" />;
      case 'session_resumed':
        return <Play className="w-4 h-4 text-green-600" />;
      case 'session_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionText = (action) => {
    switch (action) {
      case 'bid_submitted':
        return 'Bid Submitted';
      case 'turn_skipped':
        return 'Turn Skipped';
      case 'moved_to_back':
        return 'Moved to Back';
      case 'auto_assigned':
        return 'Auto Assigned';
      case 'session_started':
        return 'Session Started';
      case 'session_paused':
        return 'Session Paused';
      case 'session_resumed':
        return 'Session Resumed';
      case 'session_completed':
        return 'Session Completed';
      default:
        return action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'bid_submitted':
        return 'bg-green-50 border-green-200';
      case 'turn_skipped':
        return 'bg-yellow-50 border-yellow-200';
      case 'moved_to_back':
        return 'bg-red-50 border-red-200';
      case 'auto_assigned':
        return 'bg-orange-50 border-orange-200';
      case 'session_started':
        return 'bg-blue-50 border-blue-200';
      case 'session_paused':
        return 'bg-yellow-50 border-yellow-200';
      case 'session_resumed':
        return 'bg-green-50 border-green-200';
      case 'session_completed':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading History</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchHistory}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No History Yet</h3>
        <p className="text-gray-600">No actions have been recorded for this session.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Session History</h3>
        <button
          onClick={fetchHistory}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-3">
        {history.map((item, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${getActionColor(item.action)}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getActionIcon(item.action)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-gray-900">
                      {getActionText(item.action)}
                    </span>
                    {item.userName && (
                      <span className="text-sm text-gray-600">
                        by {item.userName}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </div>
                
                {item.details && (
                  <p className="text-sm text-gray-700 mt-1">
                    {item.details}
                  </p>
                )}
                
                {(item.stationName || item.shift || item.position) && (
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                    {item.stationName && (
                      <div className="flex items-center space-x-1">
                        <Building2 className="w-3 h-3" />
                        <span>{item.stationName}</span>
                      </div>
                    )}
                    {item.shift && (
                      <span>{item.shift} Shift</span>
                    )}
                    {item.position && (
                      <span>{item.position}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BidHistory;
