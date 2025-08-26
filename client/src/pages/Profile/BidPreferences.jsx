import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { 
  Save, 
  X, 
  Bell, 
  Target, 
  Clock, 
  Building2
} from 'lucide-react';
import Button from '../../components/UI/Button';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import api from '../../services/api';
import toast from 'react-hot-toast';

const BidPreferences = ({ onClose }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { isDirty },
    reset,
    watch
  } = useForm();

  const autoBidEnabled = watch('autoBid');

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/preferences');
      const prefs = response.data.preferences || {};
      reset({
        preferredShifts: prefs.preferredShifts || [],
        preferredStations: prefs.preferredStations || [],
        autoBid: prefs.autoBid || false,
        notifications: prefs.notifications || false,
        emailNotifications: prefs.emailNotifications || false,
        smsNotifications: prefs.smsNotifications || false,
        bidReminders: prefs.bidReminders || false,
        autoBidStrategy: prefs.autoBidStrategy || 'preferred',
        maxBidAttempts: prefs.maxBidAttempts || 3,
        bidTimeout: prefs.bidTimeout || 30
      });
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const onSubmit = async (data) => {
    try {
      setSaving(true);
      await api.put('/users/preferences', data);
      toast.success('Preferences updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error(error.response?.data?.error || 'Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-xl rounded-xl bg-white">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bid Preferences</h2>
            <p className="mt-2 text-gray-600">Customize your bidding experience</p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Preferred Shifts */}
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <h3 className="text-xl font-medium text-gray-900 flex items-center">
                <Clock className="w-6 h-6 mr-3" />
                Preferred Shifts
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {['Day', 'Night', 'Swing', '24/48', '48/96'].map((shift) => (
                  <label key={shift} className="flex items-center">
                    <input
                      type="checkbox"
                      value={shift}
                      {...register('preferredShifts')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{shift}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Preferred Stations */}
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <h3 className="text-xl font-medium text-gray-900 flex items-center">
                <Building2 className="w-6 h-6 mr-3" />
                Preferred Stations
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {['Station 1', 'Station 2', 'Station 3', 'Station 4', 'Station 5', 'Station 6'].map((station) => (
                  <label key={station} className="flex items-center">
                    <input
                      type="checkbox"
                      value={station}
                      {...register('preferredStations')}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{station}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Auto-Bid Settings */}
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <h3 className="text-xl font-medium text-gray-900 flex items-center">
                <Target className="w-6 h-6 mr-3" />
                Auto-Bid Settings
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enable Auto-Bid</label>
                  <p className="text-xs text-gray-500">Automatically place bids based on your preferences</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('autoBid')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {autoBidEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-primary-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto-Bid Strategy
                    </label>
                    <select
                      {...register('autoBidStrategy')}
                      className="input"
                    >
                      <option value="preferred">Preferred stations first</option>
                      <option value="closest">Closest to home</option>
                      <option value="seniority">Highest seniority</option>
                      <option value="random">Random selection</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Bid Attempts
                      </label>
                      <input
                        type="number"
                        {...register('maxBidAttempts', { min: 1, max: 10 })}
                        className="input"
                        min="1"
                        max="10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bid Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        {...register('bidTimeout', { min: 10, max: 300 })}
                        className="input"
                        min="10"
                        max="300"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="card">
            <div className="px-6 py-5 border-b border-rigroster-border">
              <h3 className="text-xl font-medium text-gray-900 flex items-center">
                <Bell className="w-6 h-6 mr-3" />
                Notification Settings
              </h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enable Notifications</label>
                  <p className="text-xs text-gray-500">Receive notifications about bid sessions</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('notifications')}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('emailNotifications')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Email Notifications</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('smsNotifications')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">SMS Notifications</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('bidReminders')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Bid Reminders</span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-8 border-t border-rigroster-border">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving || !isDirty}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BidPreferences;
