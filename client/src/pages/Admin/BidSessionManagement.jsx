import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
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
  Square, 
  Users, 
  Clock, 
  Plus,
  Save,
  X,
  RefreshCw,
  Settings,
  BarChart3
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const BidSessionManagement = () => {
  const { user } = useAuth();
  const [bidSessions, setBidSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showSessionDetails, setShowSessionDetails] = useState(false);

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
      const response = await api.get('/api/bid-sessions');
      setBidSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching bid sessions:', error);
      toast.error('Failed to load bid sessions');
    } finally {
      setLoading(false);
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
      case 'pending':
        filtered = filtered.filter(session => session.status === 'pending');
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
  }, []);

  useEffect(() => {
    filterSessions();
  }, [filterSessions]);

  const handleCreateSession = async (data) => {
    try {
      const response = await api.post('/api/bid-sessions', data);
      setBidSessions([...bidSessions, response.data.bidSession]);
      setIsCreating(false);
      reset();
      toast.success('Bid session created successfully');
    } catch (error) {
      console.error('Error creating bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to create bid session');
    }
  };

  const handleUpdateSession = async (data) => {
    try {
      const response = await api.put(`/api/bid-sessions/${selectedSession._id}`, data);
      setBidSessions(bidSessions.map(session => 
        session._id === selectedSession._id ? response.data.bidSession : session
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
      await api.delete(`/api/bid-sessions/${sessionId}`);
      setBidSessions(bidSessions.filter(session => session._id !== sessionId));
      toast.success('Bid session deleted successfully');
    } catch (error) {
      console.error('Error deleting bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to delete bid session');
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      await api.post(`/bid-sessions/${sessionId}/start`);
      await fetchBidSessions(); // Refresh the list
      toast.success('Bid session started successfully');
    } catch (error) {
      console.error('Error starting bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to start bid session');
    }
  };

  const handlePauseSession = async (sessionId) => {
    try {
      await api.post(`/bid-sessions/${sessionId}/pause`);
      await fetchBidSessions(); // Refresh the list
      toast.success('Bid session paused successfully');
    } catch (error) {
      console.error('Error pausing bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to pause bid session');
    }
  };

  const handleStopSession = async (sessionId) => {
    try {
      await api.post(`/bid-sessions/${sessionId}/stop`);
      await fetchBidSessions(); // Refresh the list
      toast.success('Bid session stopped successfully');
    } catch (error) {
      console.error('Error stopping bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to stop bid session');
    }
  };

  const handleEditSession = (session) => {
    setSelectedSession(session);
    setEditValue('name', session.name || '');
    setEditValue('description', session.description || '');
    setEditValue('startDate', session.startDate ? new Date(session.startDate).toISOString().split('T')[0] : '');
    setEditValue('endDate', session.endDate ? new Date(session.endDate).toISOString().split('T')[0] : '');
    setEditValue('bidTimeLimit', session.bidTimeLimit || 300);
    setEditValue('autoAssign', session.autoAssign !== false);
    setIsEditing(true);
  };

  const handleViewSession = (session) => {
    setSelectedSession(session);
    setShowSessionDetails(true);
  };

  const getStatusColor = (session) => {
    switch (session.status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (session) => {
    switch (session.status) {
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending';
      case 'completed':
        return 'Completed';
      case 'paused':
        return 'Paused';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <div key={session._id} className="card hover:shadow-lg transition-shadow">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{session.name}</h3>
                    <p className="text-sm text-gray-500">{session.description}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(session)}`}>
                  {getStatusText(session)}
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    {formatDate(session.startDate)} - {formatDate(session.endDate)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Participants:</span>
                  <span className="font-medium">{session.participantCount || 0}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Bid Time Limit:</span>
                  <span className="font-medium">{formatTime(session.bidTimeLimit || 300)}</span>
                </div>

                <div className="flex items-center text-sm">
                  <Settings className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    Auto-assign: {session.autoAssign ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
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
                  {session.status === 'pending' && (
                    <Button
                      onClick={() => handleStartSession(session._id)}
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-800"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  {session.status === 'active' && (
                    <>
                      <Button
                        onClick={() => handlePauseSession(session._id)}
                        variant="ghost"
                        size="sm"
                        className="text-orange-600 hover:text-orange-800"
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                                             <Button
                         onClick={() => handleStopSession(session._id)}
                         variant="ghost"
                         size="sm"
                         className="text-red-600 hover:text-red-800"
                       >
                         <Square className="w-4 h-4" />
                       </Button>
                    </>
                  )}
                  {session.status === 'paused' && (
                    <Button
                      onClick={() => handleStartSession(session._id)}
                      variant="ghost"
                      size="sm"
                      className="text-green-600 hover:text-green-800"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDeleteSession(session._id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Bid Session</h3>
              <Button
                onClick={() => {
                  setIsCreating(false);
                  reset();
                }}
                variant="ghost"
                size="sm"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <form onSubmit={handleSubmit(handleCreateSession)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Session name is required' })}
                  className="input"
                  placeholder="e.g., Annual 2024 Shift Bid"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    {...register('startDate', { required: 'Start date is required' })}
                    className="input"
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    {...register('endDate', { required: 'End date is required' })}
                    className="input"
                  />
                  {errors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bid Time Limit (seconds)
                </label>
                <input
                  type="number"
                  {...register('bidTimeLimit', { required: 'Bid time limit is required', min: 30, max: 3600 })}
                  className="input"
                  placeholder="300"
                />
                {errors.bidTimeLimit && (
                  <p className="mt-1 text-sm text-red-600">{errors.bidTimeLimit.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('autoAssign')}
                    defaultChecked
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-assign if no bid</span>
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setIsCreating(false);
                    reset();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
                    Start Date
                  </label>
                  <input
                    type="date"
                    {...registerEdit('startDate', { required: 'Start date is required' })}
                    className="input"
                  />
                  {editErrors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.startDate.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    {...registerEdit('endDate', { required: 'End date is required' })}
                    className="input"
                  />
                  {editErrors.endDate && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.endDate.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bid Time Limit (seconds)
                </label>
                <input
                  type="number"
                  {...registerEdit('bidTimeLimit', { required: 'Bid time limit is required', min: 30, max: 3600 })}
                  className="input"
                />
                {editErrors.bidTimeLimit && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.bidTimeLimit.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...registerEdit('autoAssign')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-assign if no bid</span>
                </label>
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
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
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
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{selectedSession.name}</h4>
                  <p className="text-sm text-gray-500">{selectedSession.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    {formatDate(selectedSession.startDate)} - {formatDate(selectedSession.endDate)}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    {selectedSession.participantCount || 0} participants
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Settings className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    Bid time limit: {formatTime(selectedSession.bidTimeLimit || 300)}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <BarChart3 className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    Auto-assign: {selectedSession.autoAssign ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
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
        </div>
      )}
    </div>
  );
};

export default BidSessionManagement;
