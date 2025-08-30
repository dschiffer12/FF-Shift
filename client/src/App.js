import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Dashboard from './pages/Dashboard/Dashboard';
import BidInterface from './pages/BidInterface/BidInterface';
import Bidding from './pages/Bidding/Bidding';
import LiveBidding from './pages/Bidding/LiveBidding';
import Profile from './pages/Profile/Profile';
import Stations from './pages/Stations/Stations';
import BidHistory from './pages/BidHistory/BidHistory';
import Seniority from './pages/Seniority/Seniority';
import AdminDashboard from './pages/Admin/AdminDashboard';
import UserManagement from './pages/Admin/UserManagement';
import StationManagement from './pages/Admin/StationManagement';
import BidSessionManagement from './pages/Admin/BidSessionManagement';
import SeniorityManagement from './pages/Admin/SeniorityManagement';
import NotificationManagement from './pages/Admin/NotificationManagement';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !user.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return React.isValidElement(children) ? children : <div>Invalid component</div>;
};

// Public Route Component (redirects if already authenticated)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return React.isValidElement(children) ? children : <div>Invalid component</div>;
};

function App() {
  return (
    <SocketProvider>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/forgot-password" element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } />
          <Route path="/reset-password/:token" element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          } />

          {/* Protected Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="bidding" element={<Bidding />} />
            <Route path="live-bid/:sessionId" element={<LiveBidding />} />
            <Route path="bid/:sessionId" element={<BidInterface />} />
            <Route path="profile" element={<Profile />} />
            <Route path="stations" element={<Stations />} />
            <Route path="bid-history" element={<BidHistory />} />
            <Route path="seniority" element={<Seniority />} />
            
            {/* Admin Routes */}
            <Route path="admin" element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="admin/users" element={
              <ProtectedRoute requireAdmin>
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="admin/stations" element={
              <ProtectedRoute requireAdmin>
                <StationManagement />
              </ProtectedRoute>
            } />
            <Route path="admin/bid-sessions" element={
              <ProtectedRoute requireAdmin>
                <BidSessionManagement />
              </ProtectedRoute>
            } />
            <Route path="admin/seniority" element={
              <ProtectedRoute requireAdmin>
                <SeniorityManagement />
              </ProtectedRoute>
            } />
            <Route path="admin/notifications" element={
              <ProtectedRoute requireAdmin>
                <NotificationManagement />
              </ProtectedRoute>
            } />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </SocketProvider>
  );
}

export default App;
