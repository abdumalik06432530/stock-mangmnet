import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const StockControl = ({ token, shopId }) => {
  const [stock, setStock] = useState({});
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStock();
    fetchStockHistory();
  }, [shopId]);

  const fetchStock = async () => {
    try {
      const response = await axios.get(`/api/shops/${shopId}/stock`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStock(response.data.stock || {});
    } catch (error) {
      toast.error('Failed to fetch stock data');
    }
  };

  const fetchStockHistory = async () => {
    try {
      // Simulated stock history
      setStockHistory([
        { id: 1, item: 'chair_withHeadrest', change: 5, type: 'in', date: '2024-01-15', reason: 'Delivery' },
        { id: 2, item: 'chair_noHeadrest', change: -2, type: 'out', date: '2024-01-15', reason: 'Sale' },
        { id: 3, item: 'table_standard', change: 3, type: 'in', date: '2024-01-14', reason: 'Delivery' },
      ]);
    } catch (error) {
      console.error('Failed to fetch stock history');
    }
  };

  const getStockLevelColor = (quantity) => {
    if (quantity === 0) return 'text-red-600 bg-red-50';
    if (quantity < 5) return 'text-orange-600 bg-orange-50';
    if (quantity < 10) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStockLevelText = (quantity) => {
    if (quantity === 0) return 'Out of Stock';
    if (quantity < 5) return 'Low Stock';
    if (quantity < 10) return 'Medium Stock';
    return 'Well Stocked';
  };

  const lowStockItems = Object.entries(stock).filter(([_, quantity]) => quantity < 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Stock Control</h2>
            <p className="text-gray-600">Monitor and manage your shop inventory</p>
          </div>
          <div className="flex items-center space-x-4">
            {lowStockItems.length > 0 && (
              <div className="bg-red-50 px-4 py-2 rounded-lg flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 font-medium">
                  {lowStockItems.length} Low Stock Items
                </span>
              </div>
            )}
            <button
              onClick={fetchStock}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Refresh Stock
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Overview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stock Levels */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Stock Levels</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(stock).map(([item, quantity]) => (
                <div key={item} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 capitalize">
                      {item.replace('_', ' ')}
                    </h4>
                    <Package className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">{quantity}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStockLevelColor(quantity)}`}>
                      {getStockLevelText(quantity)}
                    </span>
                  </div>
                  {/* Stock Level Bar */}
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        quantity === 0 ? 'bg-red-500' :
                        quantity < 5 ? 'bg-orange-500' :
                        quantity < 10 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (quantity / 20) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Trend</h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>Stock trend visualization</p>
                <p className="text-sm">Chart would show stock movements over time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                Low Stock Alerts
              </h3>
              <div className="space-y-3">
                {lowStockItems.map(([item, quantity]) => (
                  <div key={item} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <p className="font-medium text-red-900 capitalize">
                        {item.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-red-700">Only {quantity} left in stock</p>
                    </div>
                    <button className="px-3 py-1 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors">
                      Order
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Stock Movements */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Movements</h3>
            <div className="space-y-3">
              {stockHistory.map(record => (
                <div key={record.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {record.type === 'in' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 capitalize">
                        {record.item.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-500">{record.reason}</p>
                    </div>
                  </div>
                  <span className={`font-medium ${
                    record.type === 'in' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {record.type === 'in' ? '+' : ''}{record.change}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-left">
                Request Stock Transfer
              </button>
              <button className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left">
                Generate Stock Report
              </button>
              <button className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left">
                Set Reorder Points
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockControl;