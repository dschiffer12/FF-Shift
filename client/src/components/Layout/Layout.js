import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Users, 
  Building2, 
  Clock, 
  User, 
  LogOut, 
  Menu, 
  X,
  BarChart3,
  Shield,
  Target,
  TrendingUp
} from 'lucide-react';
import Logo from '../UI/Logo';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Bidding', href: '/bidding', icon: Target },
    { name: 'Profile', href: '/profile', icon: User },
    ...(user?.isAdmin ? [
      { name: 'Admin Dashboard', href: '/admin', icon: BarChart3 },
      { name: 'User Management', href: '/admin/users', icon: Users },
      { name: 'Seniority Management', href: '/admin/seniority', icon: TrendingUp },
      { name: 'Station Management', href: '/admin/stations', icon: Building2 },
      { name: 'Bid Sessions', href: '/admin/bid-sessions', icon: Clock },
    ] : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (href) => {
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen bg-rigroster-offWhite">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
          <div className="flex items-center justify-between p-4 border-b border-rigroster-border">
            <div className="flex items-center space-x-3">
              <Logo size="md" />
              <span className="text-xl font-bold text-rigroster-text">RigRoster</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-rigroster-text hover:bg-rigroster-lightGray rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link ${location.pathname === item.href ? 'nav-link-active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-rigroster-border">
            <button
              onClick={handleLogout}
              className="w-full nav-link text-left"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-grow bg-white border-r border-rigroster-border">
          <div className="flex items-center p-4 border-b border-rigroster-border">
            <div className="flex items-center space-x-3">
              <Logo size="lg" />
              <span className="text-xl font-bold text-rigroster-text">RigRoster</span>
            </div>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`nav-link ${location.pathname === item.href ? 'nav-link-active' : ''}`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-rigroster-border">
            <button
              onClick={handleLogout}
              className="w-full nav-link text-left"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 bg-white border-b border-rigroster-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-rigroster-text hover:bg-rigroster-lightGray rounded-md"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-rigroster-textLight">
                Welcome, {user?.firstName} {user?.lastName}
              </div>
              {user?.isAdmin && (
                <span className="badge badge-info">Admin</span>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
