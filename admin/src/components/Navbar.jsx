import React, { useState } from 'react';
import { LogOut, Settings, Bell, User, Menu } from 'lucide-react';
import { assets } from '../assets/assets';

const Navbar = ({ setToken, toggleSidebar }) => {
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    setLoggingOut(true);
    // Simulate logout delay for feedback (e.g., API call)
    setTimeout(() => {
      setToken('');
      setLoggingOut(false);
    }, 500);
  };

  return (
    <header className="flex items-center justify-between px-3 md:px-4 py-2 bg-white border-b border-gray-100 sticky top-0 z-50">
      {/* Left Section - Logo and Menu */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors md:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <img
            src={assets.logo}
            alt="Admin Panel Logo"
            className="w-auto h-6 sm:h-7 md:h-8 object-contain"
          />
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-gray-900 leading-tight">Admin Panel</h1>
            <p className="text-xs text-gray-500 leading-tight">Dashboard</p>
          </div>
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          className="relative p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Settings */}
        <button
          className="p-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="User menu"
          >
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-white" />
            </div>
            <span className="hidden sm:block text-xs font-medium text-gray-700">Admin</span>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">admin@example.com</p>
              </div>
              <button className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                Profile Settings
              </button>
              <button className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                System Preferences
              </button>
              <div className="border-t border-gray-100 mt-1">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loggingOut ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-red-600"></div>
                  ) : (
                    <LogOut className="h-3 w-3" />
                  )}
                  {loggingOut ? 'Logging out...' : 'Logout'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Separate Logout Button (Desktop) */}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-lg text-xs font-medium hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-sm disabled:opacity-50"
          aria-label="Log out"
        >
          {loggingOut ? (
            <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-white"></div>
          ) : (
            <LogOut className="h-3 w-3" />
          )}
          <span className="hidden lg:inline">Logout</span>
        </button>
      </div>

      {/* Overlay for dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </header>
  );
};

export default Navbar;