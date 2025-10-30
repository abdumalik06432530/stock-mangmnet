import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { LayoutDashboard, Plus, List, Package, Users, User } from 'lucide-react';

const Sidebar = () => {
  return (
    <div className="fixed bottom-0 w-full sm:static sm:w-16 md:w-60 min-h-[60px] sm:min-h-screen bg-white text-gray-800 shadow-lg sm:shadow-xl flex flex-row sm:flex-col border-t sm:border-t-0 sm:border-r border-gray-200 z-50 animate-fade-in">
      {/* Navigation */}
      <nav className="flex flex-row sm:flex-col gap-2 sm:gap-3 sm:mt-8 px-2 sm:px-4 text-sm font-semibold overflow-x-auto sm:overflow-x-visible">
        <SidebarLink to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <SidebarLink to="/add" icon={Plus} label="Add Items" />
        <SidebarLink to="/list" icon={List} label="List Items" />
        <SidebarLink to="/orders" icon={Package} label="Orders" />
        <SidebarLink to="/users" icon={Users} label="Users" />
        <SidebarLink to="/profile" icon={User} label="Profile" />
      </nav>

      {/* Footer */}
      <div className="hidden sm:block mt-auto p-4 text-xs text-gray-500 border-t border-gray-200 bg-gray-50 hover:bg-gray-100 transition-all duration-200">
        © 2025 Malik Dev. All rights reserved.
      </div>
    </div>
  );
};

const SidebarLink = ({ to, icon: Icon, label }) => {
  return (
    <NavLink
      to={to}
      aria-label={`Navigate to ${label}`}
      className={({ isActive }) =>
        `relative flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-xl transition-all duration-200 group
          ${isActive
            ? 'bg-indigo-600 text-white shadow-md hover:shadow-lg'
            : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600'}`
      }
    >
      <div className="flex items-center justify-center">
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </div>
      
      {/* Text label - visible on medium+ screens */}
      <span className="hidden md:inline font-medium text-sm">{label}</span>
      
      {/* Tooltip for mobile and small screens */}
      <span className="absolute left-1/2 -translate-x-1/2 -top-10 sm:left-auto sm:right-[-80px] sm:top-1/2 sm:-translate-y-1/2 bg-gray-900 text-white text-xs rounded-lg py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 sm:min-w-[80px] sm:text-center">
        {label}
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 sm:top-1/2 sm:-translate-y-1/2 sm:left-full sm:border-t-transparent sm:border-l-gray-900"></div>
      </span>
    </NavLink>
  );
};

SidebarLink.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
};

export default Sidebar;