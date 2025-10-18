import React from 'react';
import PropTypes from 'prop-types';
import { NavLink } from 'react-router-dom';
import { FaHome, FaBoxOpen, FaCog, FaSignOutAlt } from 'react-icons/fa';

const FactorySidebar = ({ orders }) => {
  // Calculate order summary (orders may be undefined if not passed)
  const olist = Array.isArray(orders) ? orders : [];
  const pendingOrders = olist.filter(o => o.status === 'Pending' || !o.status).length;
  const processingOrders = olist.filter(o => o.status === 'Processing').length;

  return (
    <div className="w-64 bg-white shadow-lg h-screen p-6 flex flex-col justify-between">
      <div>
        {/* Logo/Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-indigo-600">Factory Dashboard</h2>
          <p className="text-sm text-gray-500">Manage your operations</p>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          <NavLink
            to="/factory"
            className={({ isActive }) =>
              `flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                isActive ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <FaHome className="text-lg" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              `flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                isActive ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <FaBoxOpen className="text-lg" />
            <span>Orders</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center space-x-2 p-2 rounded-lg transition-colors ${
                isActive ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'
              }`
            }
          >
            <FaCog className="text-lg" />
            <span>Settings</span>
          </NavLink>
        </nav>

        {/* Order Summary */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Order Summary</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Pending Orders</span>
              <span className="font-medium text-indigo-600">{pendingOrders}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Processing Orders</span>
              <span className="font-medium text-green-600">{processingOrders}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Orders</span>
              <span className="font-medium text-gray-800">{orders.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div>
        <button
          className="w-full flex items-center space-x-2 p-2 text-gray-600 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
        >
          <FaSignOutAlt className="text-lg" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default FactorySidebar;

FactorySidebar.propTypes = {
  orders: PropTypes.array,
};

FactorySidebar.defaultProps = {
  orders: [],
};