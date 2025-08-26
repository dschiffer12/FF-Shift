import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Calendar, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Eye, 
  Play, 
  Pause, 
  Plus,
  Save,
  X,
  RefreshCw,
  History
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import AdminTurnDisplay from '../../components/Bidding/AdminTurnDisplay';
import BidHistory from '../../components/Bidding/BidHistory';
import api, { endpoints } from '../../services/api';
import toast from 'react-hot-toast';

const BidSessionManagement = () => {
  const [bidSessions, setBidSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [currentActiveSession, setCurrentActiveSession] = useState(null);
  const [selectedSessionForHistory, setSelectedSessionForHistory] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    formState: { errors: editErrors },
    reset: resetEdit,
    setValue: setEditValue
  } = useForm();

  const fetchBidSessions = async () => {
    try {
      setLoading(true);
      const response = await api.get(endpoints.bidSessions.list);
      const allSessions = response.data.sessions || [];
      setBidSessions(allSessions);
      
      // Find the currently active or paused session
      const activeSession = allSessions.find(s => s.status === 'active' || s.status === 'paused' || s.status === 'scheduled');
      setCurrentActiveSession(activeSession);
    } catch (error) {
      console.error('Error fetching bid sessions:', error);
      toast.error('Failed to load bid sessions');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const filterSessions = useCallback(() => {
    let filtered = bidSessions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(session => 
        session.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    switch (selectedFilter) {
      case 'active':
        filtered = filtered.filter(session => session.status === 'active');
        break;
      case 'draft':
        filtered = filtered.filter(session => session.status === 'draft');
        break;
      case 'scheduled':
        filtered = filtered.filter(session => session.status === 'scheduled');
        break;
      case 'completed':
        filtered = filtered.filter(session => session.status === 'completed');
        break;
      case 'paused':
        filtered = filtered.filter(session => session.status === 'paused');
        break;
      default:
        break;
    }

    setFilteredSessions(filtered);
  }, [bidSessions, searchTerm, selectedFilter]);

  useEffect(() => {
    fetchBidSessions();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    filterSessions();
  }, [filterSessions]);

  // Debug effect for selectedSessionForHistory
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('selectedSessionForHistory changed to:', selectedSessionForHistory);
  }, [selectedSessionForHistory]);

  const handleCreateSession = async (data) => {
    try {
      const sessionData = {
        ...data,
        participantIds: selectedUsers.map(user => user._id)
      };

      const response = await api.post(endpoints.bidSessions.create, sessionData);
      setBidSessions([...bidSessions, response.data.session]);
      setIsCreating(false);
      setSelectedUsers([]);
      reset();
      toast.success('Bid session created successfully');
    } catch (error) {
      console.error('Error creating bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to create bid session');
    }
  };

  const handleUpdateSession = async (data) => {
    try {
      const response = await api.put(endpoints.bidSessions.update(selectedSession.id || selectedSession._id), data);
      setBidSessions(bidSessions.map(session => 
        (session.id || session._id) === (selectedSession.id || selectedSession._id) ? response.data.session : session
      ));
      setIsEditing(false);
      setSelectedSession(null);
      resetEdit();
      toast.success('Bid session updated successfully');
    } catch (error) {
      console.error('Error updating bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to update bid session');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this bid session? This action cannot be undone.')) {
      return;
    }

    try {
      // eslint-disable-next-line no-console
      console.log('Attempting to delete session:', sessionId);
      const response = await api.delete(endpoints.bidSessions.delete(sessionId));
      // eslint-disable-next-line no-console
      console.log('Delete response:', response.data);
      setBidSessions(bidSessions.filter(session => (session.id || session._id) !== sessionId));
      toast.success('Bid session deleted successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting bid session:', error);
      // eslint-disable-next-line no-console
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || 'Failed to delete bid session');
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      await api.post(endpoints.bidSessions.start(sessionId));
      await fetchBidSessions(); // Refresh the list
      toast.success('Bid session started successfully');
    } catch (error) {
      console.error('Error starting bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to start bid session');
    }
  };

  const handlePauseSession = async (sessionId) => {
    try {
      // eslint-disable-next-line no-console
      console.log('Attempting to pause session:', sessionId);
      const response = await api.post(endpoints.bidSessions.pause(sessionId));
      // eslint-disable-next-line no-console
      console.log('Pause response:', response.data);
      await fetchBidSessions(); // Refresh the list
      toast.success('Bid session paused successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error pausing bid session:', error);
      // eslint-disable-next-line no-console
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || error.response?.data?.details || 'Failed to pause bid session');
    }
  };

  const handleResumeSession = async (sessionId) => {
    try {
      // eslint-disable-next-line no-console
      console.log('Attempting to resume session:', sessionId);
      const response = await api.post(endpoints.bidSessions.resume(sessionId));
      // eslint-disable-next-line no-console
      console.log('Resume response:', response.data);
      await fetchBidSessions(); // Refresh the list
      toast.success('Bid session resumed successfully');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error resuming bid session:', error);
      // eslint-disable-next-line no-console
      console.error('Error response:', error.response?.data);
      toast.error(error.response?.data?.error || error.response?.data?.details || 'Failed to resume bid session');
    }
  };

  const handleMoveToBack = async (sessionId, userId) => {
    try {
      await api.post(`/bid-sessions/${sessionId}/move-to-back`, { userId });
      await fetchBidSessions(); // Refresh the list
      toast.success('User moved to back of queue successfully');
    } catch (error) {
      console.error('Error moving user to back of queue:', error);
      toast.error(error.response?.data?.error || 'Failed to move user to back of queue');
    }
  };

  const handleUserToggle = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.find(u => u._id === user._id);
      if (isSelected) {
        return prev.filter(u => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleSelectAllUsers = () => {
    setSelectedUsers(users.filter(user => user.isActive));
  };

  const handleClearSelection = () => {
    setSelectedUsers([]);
  };

  const calculateSeniorityScore = (user) => {
    if (!user) return 0;
    
    // If user has a manual seniority score, use that
    if (user.manualSeniorityScore && user.manualSeniorityScore > 0) {
      return user.manualSeniorityScore;
    }
    
    let score = (user.yearsOfService || 0) * 10;
    
    const rankMultipliers = {
      'Firefighter': 1,
      'Engineer': 1.2,
      'Lieutenant': 1.5,
      'Captain': 2,
      'Battalion Chief': 3,
      'Deputy Chief': 4,
      'Chief': 5
    };
    
    const positionMultipliers = {
      'Firefighter': 1,
      'Paramedic': 1.3,
      'EMT': 1.1,
      'Driver': 1.2,
      'Operator': 1.4,
      'Officer': 1.5
    };
    
    score *= (rankMultipliers[user.rank] || 1);
    score *= (positionMultipliers[user.position] || 1);
    
    return Math.round(score);
  };

  const handleEditSession = (session) => {
    setSelectedSession(session);
    setEditValue('name', session.name || '');
    setEditValue('description', session.description || '');
    setEditValue('scheduledStart', session.scheduledStart ? new Date(session.scheduledStart).toISOString().slice(0, 16) : '');
    setEditValue('scheduledEnd', session.scheduledEnd ? new Date(session.scheduledEnd).toISOString().slice(0, 16) : '');
    setEditValue('year', session.year || 2024);
    setEditValue('bidWindowDuration', session.bidWindowDuration || 5);
    setEditValue('autoAssignTimeout', session.autoAssignTimeout || 2);
    setIsEditing(true);
  };

  const handleViewSession = (session) => {
    setSelectedSession(session);
    setShowSessionDetails(true);
  };

  const getStatusColor = (session) => {
    switch (session.status) {
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

  const getStatusText = (session) => {
    switch (session.status) {
      case 'draft':
        return 'Draft';
      case 'scheduled':
        return 'Scheduled';
      case 'active':
        return 'Active';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bid Session Management</h1>
          <p className="mt-2 text-gray-600">
            Create and manage shift bidding sessions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => {
              // eslint-disable-next-line no-console
              console.log('Test history button clicked');
              // eslint-disable-next-line no-console
              console.log('Setting selectedSessionForHistory to test-session-id');
              setSelectedSessionForHistory('test-session-id');
              // eslint-disable-next-line no-console
              console.log('State should now be set');
            }}
            variant="secondary"
            size="sm"
          >
            <History className="w-4 h-4 mr-2" />
            Test History
          </Button>
          <Button
            onClick={() => fetchBidSessions()}
            variant="secondary"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setIsCreating(true)}
            variant="primary"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Session
          </Button>
        </div>
      </div>

             {/* Active Session Turn Display */}
       {currentActiveSession && (
         <AdminTurnDisplay 
           session={currentActiveSession}
           onPauseSession={handlePauseSession}
           onResumeSession={handleResumeSession}
           onAutoAssign={handleMoveToBack}
         />
       )}

      {/* Search and Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search sessions by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="input"
              >
                <option value="all">All Sessions</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <div key={session.id || session._id} className="card hover:shadow-md transition-shadow">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 truncate">{session.name}</h3>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session)}`}>
                  {getStatusText(session)}
                </span>
              </div>
            </div>
            <div className="card-body">
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{session.description}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Year:</span>
                  <span className="font-medium">{session.year}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Start Date:</span>
                  <span className="font-medium">{formatDate(session.scheduledStart)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">End Date:</span>
                  <span className="font-medium">{formatDate(session.scheduledEnd)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Participants:</span>
                  <span className="font-medium">{session.participants?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Bid Window:</span>
                  <span className="font-medium">{session.bidWindowDuration} min</span>
                </div>
                {session.status === 'active' && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Progress:</span>
                    <span className="font-medium">
                      {session.completedBids || 0} / {session.participants?.length || 0}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="card-footer">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleViewSession(session)}
                    variant="ghost"
                    size="sm"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleEditSession(session)}
                    variant="ghost"
                    size="sm"
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => {
                      // eslint-disable-next-line no-console
                      console.log('History button clicked for session:', session.id || session._id);
                      setSelectedSessionForHistory(session.id || session._id);
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-800"
                    title="View Session History"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteSession(session.id || session._id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  {session.status === 'draft' && (
                    <Button
                      onClick={() => handleStartSession(session.id || session._id)}
                      variant="primary"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  )}
                  {session.status === 'active' && (
                    <Button
                      onClick={() => handlePauseSession(session.id || session._id)}
                      variant="secondary"
                      size="sm"
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  {session.status === 'paused' && (
                    <Button
                      onClick={() => handleResumeSession(session.id || session._id)}
                      variant="primary"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSessions.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Bid Sessions Found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedFilter !== 'all' 
              ? 'Try adjusting your search or filters.'
              : 'No bid sessions have been created yet.'
            }
          </p>
        </div>
      )}

      {/* Create Session Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Bid Session</h3>
              <Button
                onClick={() => {
                  setIsCreating(false);
                  setSelectedUsers([]);
                  reset();
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit(handleCreateSession)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Session Name
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Session name is required' })}
                    className="input"
                    placeholder="e.g., Annual 2024 Bid"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    {...register('year', { 
                      required: 'Year is required',
                      min: { value: 2024, message: 'Year must be 2024 or later' }
                    })}
                    className="input"
                    min="2024"
                    defaultValue="2024"
                  />
                  {errors.year && (
                    <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  className="input"
                  rows="3"
                  placeholder="Optional description of the bid session"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Start
                  </label>
                  <input
                    type="datetime-local"
                    {...register('scheduledStart', { required: 'Start date is required' })}
                    className="input"
                  />
                  {errors.scheduledStart && (
                    <p className="mt-1 text-sm text-red-600">{errors.scheduledStart.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled End
                  </label>
                  <input
                    type="datetime-local"
                    {...register('scheduledEnd', { required: 'End date is required' })}
                    className="input"
                  />
                  {errors.scheduledEnd && (
                    <p className="mt-1 text-sm text-red-600">{errors.scheduledEnd.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bid Window Duration (minutes)
                  </label>
                  <input
                    type="number"
                    {...register('bidWindowDuration', { 
                      required: 'Bid window duration is required',
                      min: { value: 1, message: 'Minimum 1 minute' },
                      max: { value: 60, message: 'Maximum 60 minutes' }
                    })}
                    className="input"
                    min="1"
                    max="60"
                    defaultValue="5"
                  />
                  {errors.bidWindowDuration && (
                    <p className="mt-1 text-sm text-red-600">{errors.bidWindowDuration.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto-Assign Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    {...register('autoAssignTimeout', { 
                      required: 'Auto-assign timeout is required',
                      min: { value: 1, message: 'Minimum 1 minute' },
                      max: { value: 30, message: 'Maximum 30 minutes' }
                    })}
                    className="input"
                    min="1"
                    max="30"
                    defaultValue="2"
                  />
                  {errors.autoAssignTimeout && (
                    <p className="mt-1 text-sm text-red-600">{errors.autoAssignTimeout.message}</p>
                  )}
                </div>
              </div>

              {/* User Selection Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">Select Participants</h4>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleSelectAllUsers}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleClearSelection}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
                
                <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {users.filter(user => user.isActive).map((user) => {
                      const isSelected = selectedUsers.find(u => u._id === user._id);
                      return (
                        <div
                          key={user._id}
                          className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer border ${
                            isSelected ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                          }`}
                          onClick={() => handleUserToggle(user)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleUserToggle(user)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.rank} - Priority: {calculateSeniorityScore(user)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Selected: {selectedUsers.length} users
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedUsers([]);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={selectedUsers.length === 0}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Create Session
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {isEditing && selectedSession && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Bid Session</h3>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  setSelectedSession(null);
                  resetEdit();
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleEditSubmit(handleUpdateSession)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  {...registerEdit('name', { required: 'Session name is required' })}
                  className="input"
                />
                {editErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  {...registerEdit('description')}
                  className="input"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Start
                  </label>
                  <input
                    type="datetime-local"
                    {...registerEdit('scheduledStart', { required: 'Start date is required' })}
                    className="input"
                  />
                  {editErrors.scheduledStart && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.scheduledStart.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled End
                  </label>
                  <input
                    type="datetime-local"
                    {...registerEdit('scheduledEnd', { required: 'End date is required' })}
                    className="input"
                  />
                  {editErrors.scheduledEnd && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.scheduledEnd.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    {...registerEdit('year', { 
                      required: 'Year is required',
                      min: { value: 2024, message: 'Year must be 2024 or later' }
                    })}
                    className="input"
                    min="2024"
                  />
                  {editErrors.year && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.year.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bid Window (min)
                  </label>
                  <input
                    type="number"
                    {...registerEdit('bidWindowDuration', { 
                      required: 'Bid window duration is required',
                      min: { value: 1, message: 'Minimum 1 minute' },
                      max: { value: 60, message: 'Maximum 60 minutes' }
                    })}
                    className="input"
                    min="1"
                    max="60"
                  />
                  {editErrors.bidWindowDuration && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.bidWindowDuration.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto Timeout (min)
                  </label>
                  <input
                    type="number"
                    {...registerEdit('autoAssignTimeout', { 
                      required: 'Auto-assign timeout is required',
                      min: { value: 1, message: 'Minimum 1 minute' },
                      max: { value: 30, message: 'Maximum 30 minutes' }
                    })}
                    className="input"
                    min="1"
                    max="30"
                  />
                  {editErrors.autoAssignTimeout && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.autoAssignTimeout.message}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setSelectedSession(null);
                    resetEdit();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update Session
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {showSessionDetails && selectedSession && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Session Details</h3>
              <Button
                onClick={() => {
                  setShowSessionDetails(false);
                  setSelectedSession(null);
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900">{selectedSession.name}</h4>
                <p className="text-sm text-gray-600">{selectedSession.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedSession)}`}>
                    {getStatusText(selectedSession)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Year:</span>
                  <span className="ml-2 font-medium">{selectedSession.year}</span>
                </div>
                <div>
                  <span className="text-gray-500">Start Date:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedSession.scheduledStart)}</span>
                </div>
                <div>
                  <span className="text-gray-500">End Date:</span>
                  <span className="ml-2 font-medium">{formatDate(selectedSession.scheduledEnd)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Participants:</span>
                  <span className="ml-2 font-medium">{selectedSession.participants?.length || 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Bid Window:</span>
                  <span className="ml-2 font-medium">{selectedSession.bidWindowDuration} minutes</span>
                </div>
              </div>
              
              {selectedSession.participants && selectedSession.participants.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Participants</h5>
                  <div className="max-h-60 overflow-y-auto border rounded-lg p-4">
                    <div className="space-y-2">
                                           {selectedSession.participants.map((participant, index) => (
                       <div key={participant.user.id || participant.user._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="font-medium">{index + 1}.</span>
                            <span className="ml-2">{participant.user.firstName} {participant.user.lastName}</span>
                            <span className="ml-2 text-sm text-gray-500">({participant.user.rank})</span>
                          </div>
                          <span className="text-sm text-gray-500">Priority: {participant.bidPriority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                onClick={() => {
                  setShowSessionDetails(false);
                  setSelectedSession(null);
                }}
                variant="secondary"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowSessionDetails(false);
                  handleEditSession(selectedSession);
                }}
                variant="primary"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Session History Modal */}
      {selectedSessionForHistory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Bid Session History
              </h3>
              <Button
                onClick={() => {
                  // eslint-disable-next-line no-console
                  console.log('Closing history modal');
                  setSelectedSessionForHistory(null);
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              <BidHistory sessionId={selectedSessionForHistory} />
            </div>
            
            <div className="flex items-center justify-end pt-4">
              <Button
                onClick={() => {
                  // eslint-disable-next-line no-console
                  console.log('Closing history modal');
                  setSelectedSessionForHistory(null);
                }}
                variant="secondary"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      

    </div>
  );
};

export default BidSessionManagement;
