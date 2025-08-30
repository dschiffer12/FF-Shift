import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const NotificationManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [status, setStatus] = useState({});
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [notificationType, setNotificationType] = useState('email');
  
  // New state for scheduled notifications and history
  const [scheduledNotifications, setScheduledNotifications] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [historyPagination, setHistoryPagination] = useState({});
  const [activeTab, setActiveTab] = useState('status'); // status, test, scheduled, history

  useEffect(() => {
    loadStatus();
    loadUsers();
    loadSessions();
    loadScheduledNotifications();
    loadNotificationHistory();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await api.get('/notifications/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error loading notification status:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      // Handle different response structures
      const usersData = response.data.users || response.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const loadSessions = async () => {
    try {
      const response = await api.get('/bid-sessions');
      // Handle different response structures
      const sessionsData = response.data.sessions || response.data || [];
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      setSessions([]);
    }
  };

  const loadScheduledNotifications = async () => {
    try {
      const response = await api.get('/notifications/scheduled');
      setScheduledNotifications(response.data.scheduledNotifications || []);
    } catch (error) {
      console.error('Error loading scheduled notifications:', error);
      setScheduledNotifications([]);
    }
  };

  const loadNotificationHistory = async (page = 1) => {
    try {
      const response = await api.get(`/notifications/history?page=${page}&limit=20`);
      setNotificationHistory(response.data.history || []);
      setHistoryPagination(response.data.pagination || {});
    } catch (error) {
      console.error('Error loading notification history:', error);
      setNotificationHistory([]);
    }
  };

  const handleTestNotification = async () => {
    if (!selectedUser || !selectedSession) {
      setError('Please select both a user and a session');
      return;
    }

    try {
      setSending(true);
      setError('');
      setMessage('');

      const response = await api.post('/notifications/test', {
        userId: selectedUser,
        sessionId: selectedSession,
        type: notificationType
      });

      setMessage(response.data.message);
    } catch (error) {
      console.error('Error sending test notification:', error);
      setError(error.response?.data?.error || 'Failed to send test notification');
    } finally {
      setSending(false);
    }
  };

  const handleSendSessionNotification = async () => {
    if (!selectedSession) {
      setError('Please select a session');
      return;
    }

    try {
      setSending(true);
      setError('');
      setMessage('');

      const response = await api.post(`/notifications/session/${selectedSession}`, {
        type: notificationType
      });

      setMessage(response.data.message);
    } catch (error) {
      console.error('Error sending session notification:', error);
      setError(error.response?.data?.error || 'Failed to send session notification');
    } finally {
      setSending(false);
    }
  };

  const handleClearScheduled = async () => {
    try {
      setSending(true);
      setError('');
      setMessage('');

      const response = await api.delete('/notifications/scheduled');
      setMessage(response.data.message);
      loadStatus(); // Refresh status
      loadScheduledNotifications(); // Refresh scheduled notifications
    } catch (error) {
      console.error('Error clearing scheduled notifications:', error);
      setError(error.response?.data?.error || 'Failed to clear scheduled notifications');
    } finally {
      setSending(false);
    }
  };

  const verifyEmailService = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/verify/email');
      setMessage(`Email service: ${response.data.connected ? 'Connected' : 'Not connected'}`);
    } catch (error) {
      setError('Failed to verify email service');
    } finally {
      setLoading(false);
    }
  };

  const verifySMSService = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/verify/sms');
      setMessage(`SMS service: ${response.data.available ? 'Available' : 'Not available'}`);
    } catch (error) {
      setError('Failed to verify SMS service');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'sent': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  if (!user?.isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Notification Management
      </h2>

      {message && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'status', name: 'System Status' },
            { id: 'test', name: 'Test Notifications' },
            { id: 'scheduled', name: 'Scheduled Notifications' },
            { id: 'history', name: 'Notification History' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* System Status Tab */}
      {activeTab === 'status' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            System Status
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Scheduler Running:</span>
                <span className={`text-sm font-medium ${status.isRunning ? 'text-green-600' : 'text-red-600'}`}>
                  {status.isRunning ? 'Yes' : 'No'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Scheduled Notifications:</span>
                <span className="text-sm font-medium text-gray-900">
                  {status.scheduledCount || 0}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Email Service:</span>
                <span className={`text-sm font-medium ${status.emailServiceAvailable ? 'text-green-600' : 'text-red-600'}`}>
                  {status.emailServiceAvailable ? 'Available' : 'Not Available'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">SMS Service:</span>
                <span className={`text-sm font-medium ${status.smsServiceAvailable ? 'text-green-600' : 'text-red-600'}`}>
                  {status.smsServiceAvailable ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={verifyEmailService}
                disabled={loading}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 text-sm"
              >
                {loading ? 'Verifying...' : 'Verify Email Service'}
              </button>
              
              <button
                onClick={verifySMSService}
                disabled={loading}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 text-sm"
              >
                {loading ? 'Verifying...' : 'Verify SMS Service'}
              </button>
              
              <button
                onClick={handleClearScheduled}
                disabled={sending}
                className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 text-sm"
              >
                {sending ? 'Clearing...' : 'Clear Scheduled Notifications'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Notifications Tab */}
      {activeTab === 'test' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Test Notifications
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Type
              </label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select User
              </label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a user...</option>
                <option value="all">All Users</option>
                {Array.isArray(users) && users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Session
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a session...</option>
                {Array.isArray(sessions) && sessions.map(session => (
                  <option key={session._id} value={session._id}>
                    {session.name} ({session.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleTestNotification}
                disabled={sending || !selectedUser || !selectedSession}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Test Notification'}
              </button>
              
              <button
                onClick={handleSendSessionNotification}
                disabled={sending || !selectedSession}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send to All Session Participants'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled Notifications Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Scheduled Notifications
            </h3>
            <button
              onClick={loadScheduledNotifications}
              className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              Refresh
            </button>
          </div>
          
          {scheduledNotifications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No scheduled notifications found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Session ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {scheduledNotifications.map((notification, index) => (
                    <tr key={notification.key || index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {notification.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.timing}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.sessionId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.userId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          notification.scheduled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {notification.scheduled ? 'Scheduled' : 'Not Scheduled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Notification History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Notification History
            </h3>
            <button
              onClick={() => loadNotificationHistory(1)}
              className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              Refresh
            </button>
          </div>
          
          {notificationHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No notification history found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {notificationHistory.map((notification) => (
                      <tr key={notification.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {notification.type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {notification.recipient}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {notification.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            notification.status === 'sent' 
                              ? 'bg-green-100 text-green-800' 
                              : notification.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {notification.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {notification.sessionName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTimestamp(notification.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {historyPagination.pages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-sm text-gray-700">
                    Showing page {historyPagination.page} of {historyPagination.pages}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadNotificationHistory(historyPagination.page - 1)}
                      disabled={historyPagination.page <= 1}
                      className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => loadNotificationHistory(historyPagination.page + 1)}
                      disabled={historyPagination.page >= historyPagination.pages}
                      className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Information Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Notification System Information
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Email Service:</strong> Uses nodemailer with Gmail or custom SMTP</li>
          <li>• <strong>SMS Service:</strong> Uses Twilio for text messaging</li>
          <li>• <strong>Test Notifications:</strong> Send immediate notifications for testing</li>
          <li>• <strong>Session Notifications:</strong> Send to all participants in a session</li>
          <li>• <strong>Scheduled Notifications:</strong> Automatically sent based on bid timing</li>
          <li>• <strong>All Users Option:</strong> Send test notifications to all users in the system</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationManagement;
