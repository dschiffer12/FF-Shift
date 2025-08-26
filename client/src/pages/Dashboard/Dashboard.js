import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Building2, 
  Clock, 
  Award, 
  CheckCircle,
  AlertTriangle,
  Play,
  Pause,
  Timer,
  TrendingUp,
  Bell,
  ArrowRight,
  RefreshCw,
  Settings,
  FileText,
  BarChart3
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api, { endpoints } from '../../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [currentBidSession, setCurrentBidSession] = useState(null);
  const [userBidStatus, setUserBidStatus] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchCurrentBidSession(),
        fetchUserBidStatus(),
        fetchRecentActivity(),
        fetchNotifications()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    
    if (socket) {
      socket.on('bid-session-update', handleBidSessionUpdate);
      socket.on('user-turn', handleUserTurn);
      socket.on('notification', handleNotification);
      
      return () => {
        socket.off('bid-session-update');
        socket.off('user-turn');
        socket.off('notification');
      };
    }
  }, [socket, fetchDashboardData]);

  const fetchCurrentBidSession = async () => {
    try {
      const response = await api.get(endpoints.bidSessions.current);
      // The endpoint returns { sessions: [...] }, so we need to find the active one
      const sessions = response.data.sessions || [];
      const activeSession = sessions.find(s => s.status === 'active' || s.status === 'paused');
      setCurrentBidSession(activeSession || null);
    } catch (error) {
      console.error('Error fetching current bid session:', error);
    }
  };

  const fetchUserBidStatus = async () => {
    try {
      const response = await api.get('/users/bid-status');
      setUserBidStatus(response.data);
    } catch (error) {
      console.error('Error fetching user bid status:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await api.get('/users/recent-activity');
      setRecentActivity(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/users/notifications');
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleBidSessionUpdate = (data) => {
    setCurrentBidSession(data.session);
    toast.success('Bid session updated!', { icon: '🔄' });
  };

  const handleUserTurn = (data) => {
    setUserBidStatus(prev => ({ ...prev, isUserTurn: true, timeRemaining: data.timeRemaining }));
    toast.success('It\'s your turn to bid!', { 
      icon: '🎯',
      duration: 10000
    });
  };

  const handleNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    toast.success(notification.message, { icon: '🔔' });
  };

  const getBidStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'waiting': return 'text-yellow-600 bg-yellow-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'paused': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getBidStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Play className="w-4 h-4" />;
      case 'waiting': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const stats = [
    {
      name: 'Years of Service',
      value: user?.yearsOfService || 0,
      icon: Award,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: user?.yearsOfService ? `+${user.yearsOfService} years` : '+0 years',
      changeType: 'positive'
    },
    {
      name: 'Current Station',
      value: user?.currentStation?.name || 'Unassigned',
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: user?.currentStation?.number ? `Station ${user.currentStation.number}` : 'No assignment'
    },
    {
      name: 'Current Shift',
      value: user?.currentShift || 'N/A',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: user?.currentShift ? `Shift ${user.currentShift}` : 'Not assigned'
    },
    {
      name: 'Bid Priority',
      value: user?.bidPriority || 'N/A',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: user?.bidPriority ? `#${user.bidPriority} in queue` : 'Not in queue'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-lg">
        <div className="px-8 py-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="mt-3 text-primary-100">
                {user?.rank || 'N/A'} • {user?.position || 'N/A'} • Employee #{user?.employeeId || 'N/A'}
              </p>
              <div className="mt-6 flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 text-primary-200" />
                  <span className="text-primary-100 text-sm">
                    {user?.currentStation?.name || 'No station assigned'}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-primary-200" />
                  <span className="text-primary-100 text-sm">
                    Shift {user?.currentShift || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Bid Session Alert */}
      {currentBidSession && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Timer className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-yellow-900">
                  Active Bid Session: {currentBidSession.name || 'Unnamed Session'}
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  {currentBidSession.description || 'No description available'}
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  Status: {currentBidSession.status} • Participants: {currentBidSession.participantCount || 0}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2 ${getBidStatusColor(currentBidSession.status)}`}>
                {getBidStatusIcon(currentBidSession.status)}
                <span className="capitalize">{currentBidSession.status}</span>
              </div>
              <Button
                onClick={() => navigate('/bidding')}
                variant="primary"
                size="sm"
              >
                Join Session
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* No Active Session Alert */}
      {!currentBidSession && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-blue-900">
                  No Active Bid Sessions
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  There are currently no active bid sessions. Check the bidding interface for available sessions.
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/bidding')}
              variant="secondary"
              size="sm"
            >
              View Sessions
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* User Turn Alert */}
      {userBidStatus?.isUserTurn && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-900">
                  It's your turn to bid!
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  Time remaining: {formatTime(userBidStatus.timeRemaining)}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate('/bidding')}
              variant="danger"
              size="sm"
            >
              Bid Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`w-7 h-7 ${stat.color}`} />
                    </div>
                    <div className="ml-5">
                      <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    </div>
                  </div>
                  {stat.change && (
                    <div className="text-right">
                      <p className={`text-xs font-medium ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {stat.change}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Bid Status */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium text-gray-900">Current Bid Status</h3>
                <Button
                  onClick={fetchDashboardData}
                  variant="ghost"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="p-6">
              {currentBidSession ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-4 h-4 rounded-full ${
                        currentBidSession.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}></div>
                      <span className="text-lg font-medium text-gray-900">
                        {currentBidSession.name || 'Unnamed Session'}
                      </span>
                    </div>
                    <div className={`px-3 py-1 text-sm font-medium rounded-full ${getBidStatusColor(currentBidSession.status)}`}>
                      {currentBidSession.status}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div>
                      <span className="text-gray-600">Your Position:</span>
                      <span className="ml-3 font-medium">
                        {userBidStatus?.position ? `#${userBidStatus.position}` : 'Not in queue'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Participants:</span>
                      <span className="ml-3 font-medium">{currentBidSession.participantCount || currentBidSession.participants?.length || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Time Limit:</span>
                      <span className="ml-3 font-medium">{formatTime((currentBidSession.bidWindowDuration || 5) * 60)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Session Period:</span>
                      <span className="ml-3 font-medium">
                        {currentBidSession.scheduledStart ? new Date(currentBidSession.scheduledStart).toLocaleDateString() : 'N/A'} - {currentBidSession.scheduledEnd ? new Date(currentBidSession.scheduledEnd).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-rigroster-border">
                    <p className="text-sm text-gray-600">
                      {currentBidSession.description || 'No description available'}
                    </p>
                    <Button
                      onClick={() => navigate('/bidding')}
                      variant="primary"
                      size="sm"
                    >
                      View Session
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                  <h3 className="text-xl font-medium text-gray-900 mb-3">No Active Bid Session</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    There are currently no active bid sessions. Check back later or contact your administrator.
                  </p>
                  <Button
                    onClick={() => navigate('/bid-history')}
                    variant="secondary"
                    size="sm"
                  >
                    View Past Sessions
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="space-y-8">
          {/* Notifications */}
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-medium text-gray-900">Notifications</h3>
                <Bell className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((notification, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="w-3 h-3 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center text-sm py-4">No new notifications</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <h3 className="text-xl font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        {activity.type === 'login' && <User className="w-5 h-5 text-gray-600" />}
                        {activity.type === 'bid' && <Award className="w-5 h-5 text-gray-600" />}
                        {activity.type === 'profile' && <Settings className="w-5 h-5 text-gray-600" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(activity.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Profile Updated</p>
                        <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <Clock className="w-6 h-6 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Last Login</p>
                        <p className="text-xs text-gray-500 mt-1">Today at 8:30 AM</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="card">
        <div className="px-6 py-5 border-b border-rigroster-border">
          <h3 className="text-xl font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Button 
              variant="secondary" 
              className="h-24 flex-col p-4"
              onClick={() => navigate('/profile')}
            >
              <User className="w-7 h-7 mb-3" />
              <span className="text-sm">Update Profile</span>
            </Button>
            <Button 
              variant="secondary" 
              className="h-24 flex-col p-4"
              onClick={() => navigate('/stations')}
            >
              <Building2 className="w-7 h-7 mb-3" />
              <span className="text-sm">View Stations</span>
            </Button>
            <Button 
              variant="secondary" 
              className="h-24 flex-col p-4"
              onClick={() => navigate('/bid-history')}
            >
              <FileText className="w-7 h-7 mb-3" />
              <span className="text-sm">Bid History</span>
            </Button>
            <Button 
              variant="secondary" 
              className="h-24 flex-col p-4"
              onClick={() => navigate('/seniority')}
            >
              <BarChart3 className="w-7 h-7 mb-3" />
              <span className="text-sm">Seniority Info</span>
            </Button>
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <div className="px-6 py-5 border-b border-rigroster-border">
          <h3 className="text-xl font-medium text-gray-900">System Status</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Bidding System</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Real-time Updates</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Database</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
