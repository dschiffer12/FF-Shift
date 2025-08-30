import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const NotificationSettings = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [preferences, setPreferences] = useState({
    notifications: true,
    emailNotifications: true,
    smsNotifications: false,
    bidReminders: true
  });
  
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/preferences');
      setPreferences(response.data.preferences);
      setPhoneNumber(response.data.phoneNumber || '');
    } catch (error) {
      console.error('Error loading preferences:', error);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      await api.put('/notifications/preferences', preferences);
      setMessage('Notification preferences updated successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      setError('Failed to update notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhoneNumber = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      await api.put('/notifications/phone', { phoneNumber });
      setMessage('Phone number updated successfully!');
    } catch (error) {
      console.error('Error saving phone number:', error);
      setError(error.response?.data?.error || 'Failed to update phone number');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Notification Settings
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

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* General Notifications */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            General Notifications
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Enable Notifications
                </label>
                <p className="text-sm text-gray-500">
                  Receive notifications about bid sessions
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.notifications}
                  onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Bid Reminders
                </label>
                <p className="text-sm text-gray-500">
                  Receive reminders about upcoming bid sessions
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.bidReminders}
                  onChange={(e) => handlePreferenceChange('bidReminders', e.target.checked)}
                  disabled={!preferences.notifications}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${
                  preferences.notifications ? 'bg-gray-200' : 'bg-gray-100'
                }`}></div>
              </label>
            </div>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Email Notifications
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email Notifications
                </label>
                <p className="text-sm text-gray-500">
                  Receive notifications via email
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                  disabled={!preferences.notifications}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${
                  preferences.notifications ? 'bg-gray-200' : 'bg-gray-100'
                }`}></div>
              </label>
            </div>
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            SMS Notifications
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  SMS Notifications
                </label>
                <p className="text-sm text-gray-500">
                  Receive urgent notifications via text message (5 minutes before your bid time)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.smsNotifications}
                  onChange={(e) => handlePreferenceChange('smsNotifications', e.target.checked)}
                  disabled={!preferences.notifications}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${
                  preferences.notifications ? 'bg-gray-200' : 'bg-gray-100'
                }`}></div>
              </label>
            </div>

            {preferences.smsNotifications && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={handleSavePhoneNumber}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your phone number to receive SMS notifications
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="border-t pt-6">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Notification Preferences'}
          </button>
        </div>
      </div>

      {/* Information Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">
          Notification Schedule
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Email reminders:</strong> Sent the day before your bid session</li>
          <li>• <strong>SMS notifications:</strong> Sent 5 minutes before your bid time starts</li>
          <li>• <strong>Email notifications:</strong> Sent when your bid time begins</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationSettings;
