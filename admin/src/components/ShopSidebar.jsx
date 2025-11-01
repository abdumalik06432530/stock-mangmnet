import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Package, ShoppingCart, DollarSign, Store } from 'lucide-react';

const ShopSidebar = ({ shopId = '', onFetchStock = () => {}, onFetchOrders = () => {}, onScrollToSales = () => {} }) => {
  return (
    <div className="fixed bottom-0 w-full sm:static sm:w-16 md:w-64 min-h-[60px] sm:min-h-screen bg-white text-gray-800 shadow-lg sm:shadow-xl flex flex-row sm:flex-col border-t sm:border-t-0 sm:border-r border-gray-200 z-50 animate-fade-in">
      {/* Header */}
      <div className="p-3 sm:p-4 flex items-center justify-between sm:justify-start">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-indigo-600" aria-hidden="true" />
          <h2 className="hidden md:block text-lg font-bold text-gray-900">Shopkeepers Dashboard</h2>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-row sm:flex-col gap-2 sm:gap-3 sm:mt-4 px-2 sm:px-4 text-sm font-semibold overflow-x-auto sm:overflow-x-visible">
        <ShopSidebarLink to="/shopkeepers/dashboard" icon={Package} label="Overview" />
        <ShopSidebarLink to="/shopkeepers/orders" icon={ShoppingCart} label="Order Management" onClick={onFetchOrders} />
        <ShopSidebarLink to="/shopkeepers/sales" icon={DollarSign} label="Sales Management" onClick={onScrollToSales} />
        <ShopSidebarLink
          to="/shopkeepers/stock"
          icon={Store}
          label="Stock Control"
          onClick={() => {
            try {
              onFetchStock && onFetchStock();
              window.dispatchEvent(new CustomEvent('shop:fetchStock', { detail: { shopId } }));
            } catch (e) {
              // No-op
            }
          }}
        />
      </nav>

      {/* Footer */}
      <div className="hidden sm:block mt-auto p-4 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
        © {new Date().getFullYear()} Shopkeepers App. All rights reserved.
      </div>
    </div>
  );
};

ShopSidebar.propTypes = {
  shopId: PropTypes.string,
  onFetchStock: PropTypes.func,
  onFetchOrders: PropTypes.func,
  onScrollToSales: PropTypes.func,
};

const ShopSidebarLink = ({ to, icon: Icon, label, onClick }) => {
  return (
    <NavLink
      to={to}
      aria-label={`Navigate to ${label}`}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 rounded-xl transition-colors duration-200
          ${isActive ? 'bg-indigo-600 text-white shadow-md border-l-4 border-indigo-600' : 'text-gray-700'}`
      }
    >
      <div className="flex items-center justify-center">
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
      </div>
      
      {/* Text label - visible on medium+ screens */}
      <span className="hidden md:inline font-medium text-sm">{label}</span>
      
      {/* Tooltip for mobile and small screens */}
      <span className="absolute left-1/2 -translate-x-1/2 -top-10 sm:left-auto sm:right-[-100px] sm:top-1/2 sm:-translate-y-1/2 bg-gray-900 text-white text-xs rounded-lg py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 sm:min-w-[120px] sm:text-center">
        {label}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 sm:top-1/2 sm:-translate-y-1/2 sm:left-full sm:border-t-transparent sm:border-l-gray-900"></div>
      </span>
    </NavLink>
  );
};

ShopSidebarLink.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
};

export default ShopSidebar;