import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { Home, Package, Settings, LogOut } from 'lucide-react';

const FactorySidebar = ({ orders }) => {
  // Calculate order summary (handle case where orders may be undefined)
  const olist = Array.isArray(orders) ? orders : [];
  const pendingOrders = olist.filter(o => o.status === 'Pending' || !o.status).length;
  const processingOrders = olist.filter(o => o.status === 'Processing').length;

  return (
    <div className="w-64 bg-white shadow-sm h-screen p-6 flex flex-col justify-between border-r border-gray-200">
      <div>
        {/* Logo/Title */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-xl">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Factory Dashboard</h2>
              <p className="text-sm text-gray-500">Manage your operations</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          <NavLink
            to="/factory"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Home className="h-5 w-5" />
            <span className="font-medium">Dashboard</span>
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Package className="h-5 w-5" />
            <span className="font-medium">Orders</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
              }`
            }
          >
            <Settings className="h-5 w-5" />
            <span className="font-medium">Settings</span>
          </NavLink>
        </nav>

        {/* Order Summary */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Pending Orders</span>
              <span className="font-medium text-orange-600">{pendingOrders}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Processing Orders</span>
              <span className="font-medium text-blue-600">{processingOrders}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Orders</span>
              <span className="font-medium text-gray-900">{olist.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div>
        <button
          className="w-full flex items-center space-x-3 p-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

FactorySidebar.propTypes = {
  orders: PropTypes.array,
};

FactorySidebar.defaultProps = {
  orders: [],
};

export default FactorySidebar;