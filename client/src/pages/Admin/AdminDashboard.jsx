import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Building2, 
  Clock, 
  Award, 
  BarChart3, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Shield,
  UserPlus,
  Plus,
  Eye,
  Edit3,
  Trash2,
  RefreshCw,
  Download,
  Pause,
  User,
  WifiOff
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import BiddingSessions from '../../components/Bidding/BiddingSessions';
import BidNotification from '../../components/Bidding/BidNotification';
import api, { endpoints } from '../../services/api';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalStations: 0,
    activeBidSessions: 0,
    completedBidSessions: 0,
    pendingApprovals: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [bidSessions, setBidSessions] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeBidWindows, setActiveBidWindows] = useState([]);
  
  const systemStatus = {
    database: 'online',
    email: 'online',
    notifications: 'online',
    lastBackup: new Date().toISOString()
  };

  // Add countdown timer state
  const [currentTime, setCurrentTime] = useState(new Date());

  const updateActiveBidWindows = useCallback(() => {
    const active = bidSessions.filter(session => 
      session.status === 'active' && session.currentParticipant
    );
    setActiveBidWindows(active);
  }, [bidSessions]);

  const updateStats = useCallback(() => {
    // Update stats based on current data
    setStats(prev => ({
      ...prev,
      activeUsers: onlineUsers.filter(u => u.isOnline).length,
      activeBidSessions: bidSessions.filter(s => s.status === 'active').length,
      completedBidSessions: bidSessions.filter(s => s.status === 'completed').length
    }));
  }, [onlineUsers, bidSessions]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsResponse, activityResponse] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/recent-activity')
      ]);
      
      setStats(statsResponse.data);
      setRecentActivity(activityResponse.data.activities || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserActivity = useCallback(async () => {
    try {
      const response = await api.get('/admin/user-activity');
      setUserActivity(response.data.activities || []);
    } catch (error) {
      console.error('Error fetching user activity:', error);
    }
  }, []);

  const fetchBidSessions = useCallback(async () => {
    try {
      const response = await api.get(endpoints.bidSessions.list);
      setBidSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching bid sessions:', error);
    }
  }, []);

  const fetchOnlineUsers = useCallback(async () => {
    try {
      const response = await api.get('/admin/online-users');
      setOnlineUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchUserActivity();
    fetchBidSessions();
    fetchOnlineUsers();
  }, [fetchDashboardData, fetchUserActivity, fetchBidSessions, fetchOnlineUsers]);

  // Add countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update active bid windows when bid sessions change
  useEffect(() => {
    updateActiveBidWindows();
  }, [bidSessions, updateActiveBidWindows]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Listen for real-time updates
    const handleUserActivity = (data) => {
      setUserActivity(prev => [data, ...prev.slice(0, 19)]); // Keep last 20 activities
      updateStats();
    };

    const handleBidSessionUpdate = (data) => {
      setBidSessions(prev => 
        prev.map(session => 
          session.id === data.sessionId 
            ? { ...session, ...data.updates }
            : session
        )
      );
      updateActiveBidWindows();
    };

    const handleUserOnlineStatus = (data) => {
      setOnlineUsers(prev => {
        const existing = prev.find(u => u.userId === data.userId);
        if (existing) {
          return prev.map(u => 
            u.userId === data.userId 
              ? { ...u, isOnline: data.isOnline, lastSeen: data.lastSeen }
              : u
          );
        } else {
          return [...prev, data];
        }
      });
    };

    const handleNewBidSession = (data) => {
      setBidSessions(prev => [data.session, ...prev]);
      updateStats();
    };

    const handleBidSessionStarted = (data) => {
      setBidSessions(prev => 
        prev.map(session => 
          session.id === data.sessionId 
            ? { ...session, status: 'active', startedAt: data.startedAt }
            : session
        )
      );
      updateActiveBidWindows();
      toast.success(`Bid session "${data.sessionName}" has started!`);
    };

    const handleBidSessionCompleted = (data) => {
      setBidSessions(prev => 
        prev.map(session => 
          session.id === data.sessionId 
            ? { ...session, status: 'completed', completedAt: data.completedAt }
            : session
        )
      );
      updateActiveBidWindows();
      toast.success(`Bid session "${data.sessionName}" has completed!`);
    };

    // Socket event listeners
    socket.on('user-activity', handleUserActivity);
    socket.on('bid-session-update', handleBidSessionUpdate);
    socket.on('user-online-status', handleUserOnlineStatus);
    socket.on('new-bid-session', handleNewBidSession);
    socket.on('bid-session-started', handleBidSessionStarted);
    socket.on('bid-session-completed', handleBidSessionCompleted);

    // Join admin room for notifications
    socket.emit('join-admin-room');

    return () => {
      socket.off('user-activity', handleUserActivity);
      socket.off('bid-session-update', handleBidSessionUpdate);
      socket.off('user-online-status', handleUserOnlineStatus);
      socket.off('new-bid-session', handleNewBidSession);
      socket.off('bid-session-started', handleBidSessionStarted);
      socket.off('bid-session-completed', handleBidSessionCompleted);
    };
  }, [socket, isConnected, updateStats, updateActiveBidWindows]);

  const handleQuickAction = (action) => {
    switch (action) {
      case 'create-user':
        navigate('/admin/users');
        break;
      case 'create-station':
        navigate('/admin/stations');
        break;
      case 'start-bid-session':
        navigate('/admin/bid-sessions');
        break;
      case 'view-live-draft':
        // Scroll to the Live Draft Experience section
        const liveDraftSection = document.querySelector('[data-section="live-draft"]');
        if (liveDraftSection) {
          liveDraftSection.scrollIntoView({ behavior: 'smooth' });
        }
        break;
      case 'view-seniority':
        navigate('/admin/seniority');
        break;
      case 'export-data':
        toast.success('Exporting data...');
        break;
      default:
        break;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'text-green-600 bg-green-100';
      case 'offline':
        return 'text-red-600 bg-red-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="w-4 h-4" />;
      case 'offline':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getBidSessionStatusColor = (status) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeRemaining = (endTime) => {
    if (!endTime) return 'N/A';
    const end = new Date(endTime);
    const diff = end - currentTime;
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-3 text-gray-600">
            Welcome back, {user?.firstName}. Here's what's happening with your shift bidding system.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {activeBidWindows.length > 0 && activeBidWindows[0] && (
            <BidNotification 
              session={activeBidWindows[0]} 
              socket={socket} 
              isConnected={isConnected} 
            />
          )}
          <Button
            onClick={() => fetchDashboardData()}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => handleQuickAction('export-data')}
            variant="primary"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8">
        {/* Total Users */}
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
            </div>
            <div className="mt-5 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-green-600">+12% from last month</span>
            </div>
          </div>
        </div>

        {/* Active Users */}
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeUsers}</p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <Activity className="w-7 h-7 text-green-600" />
              </div>
            </div>
            <div className="mt-5 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-green-600">+8% from last week</span>
            </div>
          </div>
        </div>

        {/* Total Stations */}
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Stations</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalStations}</p>
              </div>
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-purple-600" />
              </div>
            </div>
            <div className="mt-5 flex items-center text-sm">
              <span className="text-gray-500">No change</span>
            </div>
          </div>
        </div>

        {/* Active Bid Sessions */}
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.activeBidSessions}</p>
              </div>
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                <Clock className="w-7 h-7 text-orange-600" />
              </div>
            </div>
            <div className="mt-5 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-green-600">+2 this week</span>
            </div>
          </div>
        </div>

        {/* Completed Sessions */}
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.completedBidSessions}</p>
              </div>
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Award className="w-7 h-7 text-indigo-600" />
              </div>
            </div>
            <div className="mt-5 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-green-600">+15% this month</span>
            </div>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pendingApprovals}</p>
              </div>
              <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-yellow-600" />
              </div>
            </div>
            <div className="mt-5 flex items-center text-sm">
              <TrendingDown className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-red-600">-3 from yesterday</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Bid Windows Section */}
      {activeBidWindows.length > 0 && (
        <div className="card">
          <div className="px-6 py-5 border-b border-rigroster-border">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-medium text-gray-900">Active Bid Windows</h3>
              <span className="text-sm text-gray-500">
                {activeBidWindows.length} active session{activeBidWindows.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeBidWindows.map((session) => (
                <div key={session.id} className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{session.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBidSessionStatusColor(session.status)}`}>
                      Active
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Current Participant:</span>
                      <span className="font-medium">{session.currentParticipant || 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Time Remaining:</span>
                      <span className="font-medium text-orange-600">
                        {formatTimeRemaining(session.currentBidEnd)}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Progress:</span>
                      <span className="font-medium">
                        {session.completedBids || 0}/{session.totalParticipants || 0}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex space-x-2">
                    <Button
                      onClick={() => navigate(`/admin/bid-sessions`)}
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    <Button
                      onClick={() => navigate(`/admin/bid-sessions`)}
                      variant="primary"
                      size="sm"
                      className="flex-1"
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Draft Experience - Admin View */}
      {activeBidWindows.length > 0 && activeBidWindows[0] && (
        <div className="card" data-section="live-draft">
          <div className="px-6 py-5 border-b border-rigroster-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-medium text-gray-900 flex items-center">
                  <BarChart3 className="w-6 h-6 mr-3" />
                  Live Draft Experience - Admin View
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Monitor the bidding process in real-time with comprehensive analytics
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">
                  Session: {activeBidWindows[0].name}
                </span>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <BiddingSessions session={activeBidWindows[0]} currentUser={user} isAdmin={true} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <Button
                  onClick={() => handleQuickAction('create-user')}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <UserPlus className="w-4 h-4 mr-3" />
                  Create New User
                </Button>
                <Button
                  onClick={() => handleQuickAction('create-station')}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <Plus className="w-4 h-4 mr-3" />
                  Add New Station
                </Button>
                <Button
                  onClick={() => handleQuickAction('start-bid-session')}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <Calendar className="w-4 h-4 mr-3" />
                  Start Bid Session
                </Button>
                {activeBidWindows.length > 0 && (
                  <Button
                    onClick={() => handleQuickAction('view-live-draft')}
                    variant="primary"
                    className="w-full justify-start"
                  >
                    <BarChart3 className="w-4 h-4 mr-3" />
                    View Live Draft
                  </Button>
                )}
                <Button
                  onClick={() => handleQuickAction('view-seniority')}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <TrendingUp className="w-4 h-4 mr-3" />
                  View Seniority List
                </Button>
                <Button
                  onClick={() => handleQuickAction('manage-permissions')}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <Shield className="w-4 h-4 mr-3" />
                  Manage Permissions
                </Button>
                <Button
                  onClick={() => handleQuickAction('system-settings')}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  System Settings
                </Button>
              </div>
            </div>
          </div>

          {/* Online Users */}
          <div className="card mt-6">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Online Users</h3>
                <span className="text-sm text-gray-500">
                  {onlineUsers.filter(u => u.isOnline).length} online
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {onlineUsers.filter(u => u.isOnline).slice(0, 5).map((user) => (
                  <div key={user.userId} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{user.rank}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-500">Online</span>
                    </div>
                  </div>
                ))}
                {onlineUsers.filter(u => u.isOnline).length === 0 && (
                  <div className="text-center py-4">
                    <WifiOff className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No users online</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="card mt-6">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">System Status</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {Object.entries(systemStatus).map(([service, status]) => (
                  <div key={service} className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(status)}
                      <span className="ml-2 text-sm font-medium text-gray-700 capitalize">
                        {service.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500">
                    Last backup: {new Date(systemStatus.lastBackup).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent System Activity */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 gap-6">
            {/* Recent System Activity */}
            <div className="card">
              <div className="card-header">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Recent System Activity</h3>
                  <Button variant="secondary" size="sm">
                    View All
                  </Button>
                </div>
              </div>
              <div className="card-body">
                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.slice(0, 6).map((activity, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {activity.type === 'user' && <Users className="w-4 h-4 text-gray-600" />}
                          {activity.type === 'station' && <Building2 className="w-4 h-4 text-gray-600" />}
                          {activity.type === 'bid' && <Clock className="w-4 h-4 text-gray-600" />}
                          {activity.type === 'system' && <Settings className="w-4 h-4 text-gray-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {activity.description}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {activity.action === 'view' && (
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {activity.action === 'edit' && (
                            <Button variant="ghost" size="sm">
                              <Edit3 className="w-4 h-4" />
                            </Button>
                          )}
                          {activity.action === 'delete' && (
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default AdminDashboard;
