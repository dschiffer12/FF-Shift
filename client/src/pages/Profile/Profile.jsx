import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Award, 
  Clock, 
  Building2,
  Save,
  Edit3,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Calendar,
  Target,
  Settings,
  BarChart3,
  Play,
  Pause,
  Users,
  Star,
  TrendingUp
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../services/api';
import toast from 'react-hot-toast';
import BidPreferences from './BidPreferences';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Bid session states
  const [currentSessions, setCurrentSessions] = useState([]);
  const [bidHistory, setBidHistory] = useState([]);
  const [bidPreferences, setBidPreferences] = useState({});
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showBidPreferences, setShowBidPreferences] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset
  } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || '',
      rank: user?.rank || '',
      position: user?.position || '',
      yearsOfService: user?.yearsOfService || 0,
      employeeId: user?.employeeId || '',
      emergencyContact: user?.emergencyContact || {
        name: '',
        phone: '',
        relationship: ''
      }
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch: watchPassword
  } = useForm();

  const newPassword = watchPassword('newPassword');

  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        rank: user.rank || '',
        position: user.position || '',
        yearsOfService: user.yearsOfService || 0,
        employeeId: user.employeeId || '',
        emergencyContact: user.emergencyContact || {
          name: '',
          phone: '',
          relationship: ''
        }
      });
    }
  }, [user, reset]);

  // Fetch bid session data
  useEffect(() => {
    fetchBidSessions();
    fetchBidHistory();
    fetchBidPreferences();
  }, []);

  const fetchBidSessions = async () => {
    try {
      setSessionsLoading(true);
      const response = await api.get('/api/bid-sessions/active');
      setCurrentSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Error fetching bid sessions:', error);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchBidHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await api.get('/api/users/bid-history');
      setBidHistory(response.data.bidHistory || []);
    } catch (error) {
      console.error('Error fetching bid history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchBidPreferences = async () => {
    try {
      const response = await api.get('/api/users/preferences');
      setBidPreferences(response.data.preferences || {});
    } catch (error) {
      console.error('Error fetching bid preferences:', error);
    }
  };

  const handlePreferencesUpdate = () => {
    fetchBidPreferences();
  };

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await api.put('/api/users/profile', data);
      updateUser(response.data.user);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data) => {
    setPasswordLoading(true);
    try {
      await api.put('/api/users/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      setIsChangingPassword(false);
      resetPassword();
      toast.success('Password changed successfully!');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    reset();
  };

  const handlePasswordCancel = () => {
    setIsChangingPassword(false);
    resetPassword();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getBidStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) {
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
          <h1 className="text-3xl font-bold text-gray-900">Profile Management</h1>
          <p className="mt-2 text-gray-600">
            Manage your personal information and bid session preferences
          </p>
        </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            variant="primary"
            size="sm"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      First Name
                    </label>
                    <input
                      type="text"
                      {...register('firstName', { required: 'First name is required' })}
                      disabled={!isEditing}
                      className={`input ${errors.firstName ? 'input-error' : ''} ${!isEditing ? 'bg-gray-50' : ''}`}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="w-4 h-4 inline mr-1" />
                      Last Name
                    </label>
                    <input
                      type="text"
                      {...register('lastName', { required: 'Last name is required' })}
                      disabled={!isEditing}
                      className={`input ${errors.lastName ? 'input-error' : ''} ${!isEditing ? 'bg-gray-50' : ''}`}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      {...register('email', { 
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address'
                        }
                      })}
                      disabled={!isEditing}
                      className={`input ${errors.email ? 'input-error' : ''} ${!isEditing ? 'bg-gray-50' : ''}`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      {...register('phone')}
                      disabled={!isEditing}
                      className={`input ${errors.phone ? 'input-error' : ''} ${!isEditing ? 'bg-gray-50' : ''}`}
                      placeholder="(555) 123-4567"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Address
                    </label>
                    <input
                      type="text"
                      {...register('address')}
                      disabled={!isEditing}
                      className={`input ${errors.address ? 'input-error' : ''} ${!isEditing ? 'bg-gray-50' : ''}`}
                      placeholder="123 Main St, City, State 12345"
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={loading}
                      disabled={loading || !isDirty}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Professional Information */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Professional Information</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Employee ID
                  </label>
                  <input
                    type="text"
                    {...register('employeeId')}
                    disabled={!isEditing}
                    className={`input ${errors.employeeId ? 'input-error' : ''} ${!isEditing ? 'bg-gray-50' : ''}`}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Award className="w-4 h-4 inline mr-1" />
                    Rank
                  </label>
                  <select
                    {...register('rank')}
                    disabled={!isEditing}
                    className={`input ${errors.rank ? 'input-error' : ''} ${!isEditing ? 'bg-gray-50' : ''}`}
                  >
                    <option value="">Select Rank</option>
                    <option value="Firefighter">Firefighter</option>
                    <option value="Engineer">Engineer</option>
                    <option value="Lieutenant">Lieutenant</option>
                    <option value="Captain">Captain</option>
                    <option value="Battalion Chief">Battalion Chief</option>
                    <option value="Deputy Chief">Deputy Chief</option>
                    <option value="Chief">Chief</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Award className="w-4 h-4 inline mr-1" />
                    Position
                  </label>
                  <select
                    {...register('position')}
                    disabled={!isEditing}
                    className={`input ${errors.position ? 'input-error' : ''} ${!isEditing ? 'bg-gray-50' : ''}`}
                  >
                    <option value="">Select Position</option>
                    <option value="Firefighter">Firefighter</option>
                    <option value="Paramedic">Paramedic</option>
                    <option value="EMT">EMT</option>
                    <option value="Driver">Driver</option>
                    <option value="Operator">Operator</option>
                    <option value="Officer">Officer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Years of Service
                  </label>
                  <input
                    type="number"
                    {...register('yearsOfService', { min: 0, max: 50 })}
                    disabled={!isEditing}
                    className={`input ${errors.yearsOfService ? 'input-error' : ''} ${!isEditing ? 'bg-gray-50' : ''}`}
                    min="0"
                    max="50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Contact Name
                  </label>
                  <input
                    type="text"
                    {...register('emergencyContact.name')}
                    disabled={!isEditing}
                    className={`input ${!isEditing ? 'bg-gray-50' : ''}`}
                    placeholder="Full Name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    {...register('emergencyContact.phone')}
                    disabled={!isEditing}
                    className={`input ${!isEditing ? 'bg-gray-50' : ''}`}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Relationship
                  </label>
                  <input
                    type="text"
                    {...register('emergencyContact.relationship')}
                    disabled={!isEditing}
                    className={`input ${!isEditing ? 'bg-gray-50' : ''}`}
                    placeholder="Spouse, Parent, etc."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Current Bid Sessions */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Current Bid Sessions</h3>
            </div>
            <div className="card-body">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : currentSessions.length > 0 ? (
                <div className="space-y-4">
                  {currentSessions.map((session) => (
                    <div key={session._id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-primary-600" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{session.name}</h4>
                            <p className="text-sm text-gray-500">{session.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSessionStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                          {session.status === 'active' && (
                            <Play className="w-4 h-4 text-green-600" />
                          )}
                          {session.status === 'paused' && (
                            <Pause className="w-4 h-4 text-orange-600" />
                          )}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {formatDate(session.scheduledStart)} - {formatDate(session.scheduledEnd)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-gray-600">
                            {session.participantCount || 0} participants
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Sessions</h3>
                  <p className="text-gray-600">
                    There are no active bid sessions at the moment.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Bid History */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Recent Bid History</h3>
            </div>
            <div className="card-body">
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : bidHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Session
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Station
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bidHistory.slice(0, 5).map((bid) => (
                        <tr key={bid._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(bid.createdAt)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {bid.session?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {bid.station?.name || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBidStatusColor(bid.status)}`}>
                              {bid.status || 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            #{bid.bidPriority || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Bid History</h3>
                  <p className="text-gray-600">
                    You haven't participated in any bid sessions yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Summary */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Profile Summary</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{user.rank}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Current Station:</span>
                    <span className="ml-auto font-medium text-gray-900">
                      {user.currentStation?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Years of Service:</span>
                    <span className="ml-auto font-medium text-gray-900">
                      {user.yearsOfService || 0}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Award className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Bid Priority:</span>
                    <span className="ml-auto font-medium text-gray-900">
                      #{user.bidPriority || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Star className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600">Seniority:</span>
                    <span className="ml-auto font-medium text-gray-900">
                      {user.seniority || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bid Statistics */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Bid Statistics</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Bids</span>
                  <span className="font-medium text-gray-900">{bidHistory.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Successful</span>
                  <span className="font-medium text-green-600">
                    {bidHistory.filter(bid => bid.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="font-medium text-blue-600">
                    {bidHistory.length > 0 
                      ? Math.round((bidHistory.filter(bid => bid.status === 'completed').length / bidHistory.length) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Sessions</span>
                  <span className="font-medium text-orange-600">
                    {currentSessions.filter(s => s.status === 'active').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bid Preferences */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Bid Preferences</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Preferred Shifts</span>
                  <span className="font-medium text-gray-900">
                    {bidPreferences.preferredShifts?.join(', ') || 'Any'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Preferred Stations</span>
                  <span className="font-medium text-gray-900">
                    {bidPreferences.preferredStations?.join(', ') || 'Any'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Auto-Bid</span>
                  <span className={`font-medium ${bidPreferences.autoBid ? 'text-green-600' : 'text-gray-600'}`}>
                    {bidPreferences.autoBid ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Notifications</span>
                  <span className={`font-medium ${bidPreferences.notifications ? 'text-green-600' : 'text-gray-600'}`}>
                    {bidPreferences.notifications ? 'On' : 'Off'}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => setShowBidPreferences(true)}
                variant="secondary"
                size="sm"
                className="w-full mt-4"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Preferences
              </Button>
            </div>
          </div>

          {/* Change Password */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Security</h3>
            </div>
            <div className="card-body">
              {!isChangingPassword ? (
                <Button
                  onClick={() => setIsChangingPassword(true)}
                  variant="secondary"
                  className="w-full"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Change Password
                </Button>
              ) : (
                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        {...registerPassword('currentPassword', { required: 'Current password is required' })}
                        className={`input pr-10 ${passwordErrors.currentPassword ? 'input-error' : ''}`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        {...registerPassword('newPassword', { 
                          required: 'New password is required',
                          minLength: { value: 8, message: 'Password must be at least 8 characters' }
                        })}
                        className={`input pr-10 ${passwordErrors.newPassword ? 'input-error' : ''}`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        {...registerPassword('confirmPassword', { 
                          required: 'Please confirm your password',
                          validate: value => value === newPassword || 'Passwords do not match'
                        })}
                        className={`input pr-10 ${passwordErrors.confirmPassword ? 'input-error' : ''}`}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handlePasswordCancel}
                      disabled={passwordLoading}
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      loading={passwordLoading}
                      disabled={passwordLoading}
                      size="sm"
                    >
                      Update Password
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Account Status */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900">Account Status</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Account Active</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Email Verified</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-600">Profile Complete</span>
                </div>
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-600">Last Updated: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Preferences Modal */}
      {showBidPreferences && (
        <BidPreferences 
          onClose={() => setShowBidPreferences(false)}
          onUpdate={handlePreferencesUpdate}
        />
      )}
    </div>
  );
};

export default Profile;
