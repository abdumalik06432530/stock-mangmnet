import { NavLink } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Package, Store, ShoppingCart, DollarSign } from 'lucide-react';

const ShopSidebar = ({ shopId, onFetchStock, onFetchOrders, onScrollToSales }) => {
  return (
    <div className="fixed bottom-0 w-full sm:static sm:w-16 md:w-64 min-h-[60px] sm:min-h-screen bg-indigo-800 text-white shadow-lg sm:shadow-2xl flex flex-row sm:flex-col border-t sm:border-t-0 sm:border-r border-indigo-900 z-50">
      {/* Header */}
      <div className="p-4 flex items-center justify-between sm:justify-start">
        <h2 className="hidden md:block text-lg font-bold">Shop {shopId}</h2>
      </div>

      {/* Navigation */}
      <nav className="flex flex-row sm:flex-col gap-2 sm:gap-3 sm:mt-4 px-2 sm:px-5 text-sm font-semibold overflow-x-auto sm:overflow-x-visible">

        {/* More detailed overview (DashboardOverview.jsx) */}
        <ShopSidebarLink
          to="/shopkeepers/dashboard"
          icon={Package}
          label="Overview"
          emoji="📊"
        />

        {/* Orders management (OrderManagement.jsx) */}
        <ShopSidebarLink
          to="/shopkeepers/orders"
          icon={ShoppingCart}
          label="Order Management"
          emoji="🛒"
          onClick={onFetchOrders}
        />

        {/* Sales management (SalesManagement.jsx) */}
        <ShopSidebarLink
          to="/shopkeepers/sales"
          icon={DollarSign}
          label="Sales Management"
          emoji="💵"
          onClick={onScrollToSales}
        />

        {/* Stock control (StockControl.jsx) */}
        <ShopSidebarLink
          to="/shopkeepers/stock"
          icon={Store}
          label="Stock Control"
          emoji="🏪"
          onClick={() => {
            try {
              // call optional prop handler
              onFetchStock && onFetchStock();
              // dispatch a global event so the StockControl page (if mounted) can react immediately
              window.dispatchEvent(new CustomEvent('shop:fetchStock', { detail: { shopId } }));
            } catch (e) {
              // noop
            }
          }}
        />



        {/* (Dashboard, Request Item, Assistant, and Profile links removed by request) */}
      </nav>

      {/* Footer */}
      <div className="hidden sm:block mt-auto p-5 text-xs text-indigo-300 border-t border-indigo-700 bg-indigo-900">
        © 2025 Shopkeepers App. All rights reserved.
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

ShopSidebar.defaultProps = {
  shopId: '',
  onFetchStock: () => {},
  onFetchOrders: () => {},
  onScrollToSales: () => {},
};

const ShopSidebarLink = ({ to, icon: Icon, label, emoji, onClick }) => {
  const hasIcon = Boolean(Icon);
  return (
    <NavLink
      to={to}
      aria-label={label}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-3 rounded-xl transition-colors duration-200 group
          ${isActive
            ? 'bg-indigo-600 text-white shadow-md sm:shadow-lg'
            : 'hover:bg-indigo-700 hover:text-white text-indigo-200'}`
      }
    >
      <div className={`flex items-center gap-2 sm:gap-3 ${hasIcon ? 'justify-start' : 'justify-center'}`}>
        {hasIcon ? (
          <Icon size={20} className="w-5 h-5 sm:w-6 sm:h-6" />
        ) : (
          <span className="text-base sm:text-lg">{emoji}</span>
        )}
      </div>
      
      {/* Text label - visible on medium+ screens */}
      <span className="hidden md:inline font-medium">{label}</span>
      
      {/* Tooltip for mobile and small screens */}
      <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 sm:hidden">
        {label}
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
      </span>
    </NavLink>
  );
};

ShopSidebarLink.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.elementType,
  label: PropTypes.string.isRequired,
  emoji: PropTypes.string,
  onClick: PropTypes.func,
};

export default ShopSidebar;