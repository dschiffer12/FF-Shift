import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  User, 
  Building2, 
  Users, 
  Target, 
  Play, 
  Pause, 
  CheckCircle,
  AlertTriangle,
  Eye,
  BarChart3,
  TrendingUp,
  Calendar,
  RefreshCw
} from 'lucide-react';
import api, { endpoints } from '../../services/api';
import LoadingSpinner from '../UI/LoadingSpinner';
import toast from 'react-hot-toast';
import Button from '../UI/Button';

const BiddingSessions = ({ session, currentUser, isAdmin = false }) => {
  const [recentBids, setRecentBids] = useState([]);
  const [upcomingUsers, setUpcomingUsers] = useState([]);
  const [allBids, setAllBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllBids, setShowAllBids] = useState(false);
  const [, setCurrentTime] = useState(new Date());

  const fetchRecentBids = useCallback(async () => {
    try {
      const response = await api.get(endpoints.bidSessions.history(session.id || session._id));
      const history = response.data.history || [];
      
      // Filter for actual bids (not session events) and get last 5
      const bids = history
        .filter(item => item.action === 'bid_submitted')
        .slice(0, 5);
      
      setRecentBids(bids);
    } catch (error) {
      console.error('Error fetching recent bids:', error);
    }
  }, [session.id, session._id]);

  const fetchUpcomingUsers = useCallback(async () => {
    if (!session.participants) return;

    const currentIndex = session.currentParticipant - 1;
    const upcoming = session.participants
      .slice(currentIndex + 1, currentIndex + 4) // Next 3 users
      .filter(p => p.user); // Ensure user exists

    setUpcomingUsers(upcoming);
  }, [session.participants, session.currentParticipant]);

  const fetchAllBids = useCallback(async () => {
    try {
      const response = await api.get(endpoints.bidSessions.history(session.id || session._id));
      const history = response.data.history || [];
      
      // Filter for actual bids only
      const bids = history.filter(item => item.action === 'bid_submitted');
      setAllBids(bids);
    } catch (error) {
      console.error('Error fetching all bids:', error);
    }
  }, [session.id, session._id]);

  const fetchSessionData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      await Promise.all([
        fetchRecentBids(),
        fetchUpcomingUsers(),
        fetchAllBids()
      ]);
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast.error('Failed to load session data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchRecentBids, fetchUpcomingUsers, fetchAllBids]);

  useEffect(() => {
    if (session) {
      fetchSessionData();
    }
  }, [session, fetchSessionData]);

  // Update time every second for real-time display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-refresh session data every 30 seconds
  useEffect(() => {
    if (!session) return;

    const refreshTimer = setInterval(() => {
      fetchSessionData(true);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(refreshTimer);
  }, [session, fetchSessionData]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getBidStatusIcon = (bid) => {
    if (bid.status === 'completed') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (bid.status === 'pending') return <Clock className="w-4 h-4 text-yellow-600" />;
    return <AlertTriangle className="w-4 h-4 text-gray-600" />;
  };

  const getPriorityColor = (priority) => {
    if (priority <= 5) return 'text-green-600 bg-green-100';
    if (priority <= 10) return 'text-blue-600 bg-blue-100';
    if (priority <= 15) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
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
      {/* Header with Session Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {session.name}
            </h2>
            <p className="text-gray-600 mb-4">{session.description}</p>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-gray-600">
                  {session.participants?.length || 0} Participants
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-600" />
                <span className="text-sm text-gray-600">
                  {session.completedBids || 0} Bids Completed
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-gray-600">
                  {session.bidWindowDuration || 5} min windows
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              session.status === 'active' ? 'bg-green-100 text-green-800' :
              session.status === 'paused' ? 'bg-orange-100 text-orange-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {session.status === 'active' ? <Play className="w-4 h-4 mr-1" /> :
               session.status === 'paused' ? <Pause className="w-4 h-4 mr-1" /> :
               <Calendar className="w-4 h-4 mr-1" />}
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bids */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
                           <div className="flex items-center justify-between">
               <h3 className="text-xl font-medium text-gray-900 flex items-center">
                 <TrendingUp className="w-6 h-6 mr-3" />
                 Recent Bids
                 {isAdmin && (
                   <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                     Admin View
                   </span>
                 )}
               </h3>
               <Button
                 variant="secondary"
                 size="sm"
                 onClick={() => fetchSessionData(true)}
                 disabled={refreshing}
               >
                 <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                 {refreshing ? 'Refreshing...' : 'Refresh'}
               </Button>
             </div>
            </div>
            <div className="p-6">
              {recentBids.length > 0 ? (
                <div className="space-y-4">
                  {recentBids.map((bid, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {bid.userName || 'Unknown User'}
                            </p>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                              {bid.stationName && (
                                <div className="flex items-center space-x-1">
                                  <Building2 className="w-3 h-3" />
                                  <span>{bid.stationName}</span>
                                </div>
                              )}
                              {bid.shift && (
                                <span>{bid.shift} Shift</span>
                              )}
                              {bid.position && (
                                <span>{bid.position}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center space-x-2">
                              {getBidStatusIcon(bid)}
                              <span className="text-sm text-gray-500">
                                {formatTime(bid.timestamp)}
                              </span>
                            </div>
                            {bid.bidPriority && (
                              <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(bid.bidPriority)}`}>
                                Priority #{bid.bidPriority}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Recent Bids</h3>
                  <p className="text-gray-600">No bids have been placed yet in this session.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upcoming Users */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <h3 className="text-xl font-medium text-gray-900 flex items-center">
                <Users className="w-6 h-6 mr-3" />
                Upcoming
              </h3>
            </div>
            <div className="p-6">
              {upcomingUsers.length > 0 ? (
                <div className="space-y-4">
                  {upcomingUsers.map((participant, index) => (
                    <div key={participant.user._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          index === 0 ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <User className={`w-4 h-4 ${
                            index === 0 ? 'text-green-600' : 'text-blue-600'
                          }`} />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {participant.user.firstName} {participant.user.lastName}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">
                            {participant.user.rank}
                          </span>
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(participant.bidPriority)}`}>
                            #{participant.bidPriority}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="text-sm text-gray-500">
                          {index === 0 ? 'Next' : `#${index + 1}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Users</h3>
                  <p className="text-gray-600">All participants have completed their turns.</p>
                </div>
              )}
            </div>
          </div>

          {/* Session Stats */}
          <div className="card mt-6">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <h3 className="text-xl font-medium text-gray-900 flex items-center">
                <BarChart3 className="w-6 h-6 mr-3" />
                Session Stats
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Progress</span>
                  <span className="text-lg font-bold text-blue-600">
                    {session.participants?.length > 0 
                      ? Math.round(((session.completedBids || 0) / session.participants.length) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Completed</span>
                  <span className="text-lg font-bold text-green-600">
                    {session.completedBids || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Remaining</span>
                  <span className="text-lg font-bold text-orange-600">
                    {(session.participants?.length || 0) - (session.completedBids || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Avg Time</span>
                  <span className="text-lg font-bold text-purple-600">
                    {session.bidWindowDuration || 5}m
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* All Bids View */}
      <div className="card">
        <div className="px-6 py-5 border-b border-rigroster-border">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-3" />
              All Bids History
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAllBids(!showAllBids)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showAllBids ? 'Hide' : 'Show'} All
            </Button>
          </div>
        </div>
        {showAllBids && (
          <div className="p-6">
            {allBids.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Station
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Shift
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allBids.map((bid, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTime(bid.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bid.userName || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bid.stationName || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bid.shift || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bid.position || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {bid.bidPriority && (
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(bid.bidPriority)}`}>
                              #{bid.bidPriority}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getBidStatusIcon(bid)}
                            <span className="text-sm text-gray-900">
                              {bid.status || 'Unknown'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Bids Yet</h3>
                <p className="text-gray-600">No bids have been placed in this session.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BiddingSessions;
