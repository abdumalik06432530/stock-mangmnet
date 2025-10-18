import React, { useState, useEffect } from 'react';
import { Menu, X, Package, Store, ShoppingCart, Users, BarChart3 } from 'lucide-react';
import OrderManagement from './OrderManagement';
import StockControl from './StockControl';
import SalesManagement from './SalesManagement';
import DashboardOverview from './DashboardOverview';

const ShopkeeperDashboard = ({ token, shopId }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [shopData, setShopData] = useState(null);

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
    { id: 'orders', name: 'Orders', icon: Package },
    { id: 'stock', name: 'Stock Control', icon: Store },
    { id: 'sales', name: 'Sales', icon: ShoppingCart },
    { id: 'customers', name: 'Customers', icon: Users },
  ];

  useEffect(() => {
    // Fetch shop data
    const fetchShopData = async () => {
      try {
        // Simulated shop data
        setShopData({
          name: `Shop ${shopId}`,
          address: '123 Main Street',
          manager: 'John Doe',
          phone: '+1-555-0123'
        });
      } catch (error) {
        console.error('Failed to fetch shop data:', error);
      }
    };

    if (shopId) {
      fetchShopData();
    }
  }, [shopId]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardOverview token={token} shopId={shopId} />;
      case 'orders':
        return <OrderManagement token={token} shopId={shopId} />;
      case 'stock':
        return <StockControl token={token} shopId={shopId} />;
      case 'sales':
        return <SalesManagement token={token} shopId={shopId} />;
      default:
        return <DashboardOverview token={token} shopId={shopId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center">
            <Store className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-xl font-bold text-gray-900">FurniturePro</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <div className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Shop Info */}
        {shopData && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            <div className="text-sm text-gray-600">
              <div className="font-medium text-gray-900">{shopData.name}</div>
              <div className="truncate">{shopData.address}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="ml-2 text-2xl font-semibold text-gray-900">
                {navigation.find(item => item.id === activeTab)?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Shop: {shopId}</span>
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600">SK</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {renderActiveTab()}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default ShopkeeperDashboard;