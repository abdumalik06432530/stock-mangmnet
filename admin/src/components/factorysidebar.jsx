// React import removed (JSX runtime assumed)
import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';

const ShopkeepersSidebar = () => {
  // Factory sidebar: navigation removed per request — shop/shopkeeper pages will use ShopSidebar instead
  const menuItems = [];

  return (
    <div className="w-48 bg-gradient-to-br from-white to-gray-50 shadow-sm h-screen p-4 flex flex-col justify-between border-r border-gray-200">
      {/* Navigation */}
      <nav className="space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-sm ${
                  isActive
                    ? 'bg-indigo-100 text-indigo-700 border-l-2 border-indigo-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span className="font-medium">{item.name}</span>
            </NavLink>
          ))}
        </nav>

      {/* Logout Button */}
      <div>
        <button className="w-full flex items-center space-x-3 p-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-200 text-sm">
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default ShopkeepersSidebar;