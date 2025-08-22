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
  }, []);

  useEffect(() => {
    filterSessions();
  }, [filterSessions]);

  const handleCreateSession = async (data) => {
    try {
      console.log('Creating session with data:', data);
      
      // Add default settings
      const sessionData = {
        ...data,
        year: parseInt(data.year),
        bidWindowDuration: parseInt(data.bidWindowDuration),
        autoAssignTimeout: parseInt(data.autoAssignTimeout),
        settings: {
          allowMultipleBids: false,
          requirePositionMatch: true,
          allowCrossShiftBidding: false,
          maxBidAttempts: 3
        }
      };

      console.log('Session data being sent:', sessionData);
      
      const response = await api.post('/api/bid-sessions', sessionData);
      console.log('Create response:', response.data);
      
      setBidSessions([...bidSessions, response.data.bidSession]);
      setIsCreating(false);
      reset();
      toast.success('Bid session created successfully');
    } catch (error) {
      console.error('Error creating bid session:', error);
      console.error('Error response:', error.response?.data);
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
      await api.post(`/api/bid-sessions/${sessionId}/start`);
      await fetchBidSessions(); // Refresh the list
      toast.success('Bid session started successfully');
    } catch (error) {
      console.error('Error starting bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to start bid session');
    }
  };

  const handlePauseSession = async (sessionId) => {
    try {
      await api.post(`/api/bid-sessions/${sessionId}/pause`);
      await fetchBidSessions(); // Refresh the list
      toast.success('Bid session paused successfully');
    } catch (error) {
      console.error('Error pausing bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to pause bid session');
    }
  };

  const handleResumeSession = async (sessionId) => {
    try {
      await api.post(`/api/bid-sessions/${sessionId}/resume`);
      await fetchBidSessions(); // Refresh the list
      toast.success('Bid session resumed successfully');
    } catch (error) {
      console.error('Error resuming bid session:', error);
      toast.error(error.response?.data?.error || 'Failed to resume bid session');
    }
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
                    {formatDate(session.scheduledStart)} - {formatDate(session.scheduledEnd)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Participants:</span>
                  <span className="font-medium">{session.participantCount || 0}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Bid Window Duration:</span>
                  <span className="font-medium">{session.bidWindowDuration || 5} minutes</span>
                </div>

                <div className="flex items-center text-sm">
                  <Settings className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    Auto-assign Timeout: {session.autoAssignTimeout || 2} minutes
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
                  {(session.status === 'draft' || session.status === 'scheduled') && (
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
                    <Button
                      onClick={() => handlePauseSession(session._id)}
                      variant="ghost"
                      size="sm"
                      className="text-orange-600 hover:text-orange-800"
                    >
                      <Pause className="w-4 h-4" />
                    </Button>
                  )}
                  {session.status === 'paused' && (
                    <Button
                      onClick={() => handleResumeSession(session._id)}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  {...register('year', { required: 'Year is required', min: 2024 })}
                  className="input"
                  placeholder="2024"
                  defaultValue="2024"
                />
                {errors.year && (
                  <p className="mt-1 text-sm text-red-600">{errors.year.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Start
                  </label>
                  <input
                    type="datetime-local"
                    {...register('scheduledStart', { required: 'Scheduled start is required' })}
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
                    {...register('scheduledEnd', { required: 'Scheduled end is required' })}
                    className="input"
                  />
                  {errors.scheduledEnd && (
                    <p className="mt-1 text-sm text-red-600">{errors.scheduledEnd.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bid Window Duration (minutes)
                  </label>
                  <input
                    type="number"
                    {...register('bidWindowDuration', { required: 'Bid window duration is required', min: 1, max: 60 })}
                    className="input"
                    placeholder="5"
                    defaultValue="5"
                  />
                  {errors.bidWindowDuration && (
                    <p className="mt-1 text-sm text-red-600">{errors.bidWindowDuration.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto Assign Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    {...register('autoAssignTimeout', { required: 'Auto assign timeout is required', min: 1, max: 30 })}
                    className="input"
                    placeholder="2"
                    defaultValue="2"
                  />
                  {errors.autoAssignTimeout && (
                    <p className="mt-1 text-sm text-red-600">{errors.autoAssignTimeout.message}</p>
                  )}
                </div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <input
                  type="number"
                  {...registerEdit('year', { required: 'Year is required', min: 2024 })}
                  className="input"
                  placeholder="2024"
                />
                {editErrors.year && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.year.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Start
                  </label>
                  <input
                    type="datetime-local"
                    {...registerEdit('scheduledStart', { required: 'Scheduled start is required' })}
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
                    {...registerEdit('scheduledEnd', { required: 'Scheduled end is required' })}
                    className="input"
                  />
                  {editErrors.scheduledEnd && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.scheduledEnd.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bid Window Duration (minutes)
                  </label>
                  <input
                    type="number"
                    {...registerEdit('bidWindowDuration', { required: 'Bid window duration is required', min: 1, max: 60 })}
                    className="input"
                    placeholder="5"
                  />
                  {editErrors.bidWindowDuration && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.bidWindowDuration.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Auto Assign Timeout (minutes)
                  </label>
                  <input
                    type="number"
                    {...registerEdit('autoAssignTimeout', { required: 'Auto assign timeout is required', min: 1, max: 30 })}
                    className="input"
                    placeholder="2"
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
                    {formatDate(selectedSession.scheduledStart)} - {formatDate(selectedSession.scheduledEnd)}
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
                    Bid window duration: {selectedSession.bidWindowDuration || 5} minutes
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <BarChart3 className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">
                    Auto-assign timeout: {selectedSession.autoAssignTimeout || 2} minutes
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
