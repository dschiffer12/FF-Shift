import React from 'react';
import NotificationManagement from '../../components/Admin/NotificationManagement';

const NotificationManagementPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Notification Management</h1>
        <p className="mt-2 text-gray-600">
          Manage email and SMS notifications for the bidding system
        </p>
      </div>
      
      <NotificationManagement />
    </div>
  );
};

export default NotificationManagementPage;
