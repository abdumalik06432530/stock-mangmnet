import { useState, useEffect, useCallback } from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle, BarChart3, X } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { backendUrl } from '../../config';
import shopkeeperSim from '../../utils/shopkeeperSim';
import sanitizeMessage from '../../utils/sanitizeMessage';

const StockControl = ({ token, shopId }) => {
  if (!token) {
    toast.error('You are not authorized to access this page. Please log in.');
    return null;
  }

  // State for stock
  const [stock, setStock] = useState({});
  const [stockHistory, setStockHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // State for new item form
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    subCategory: '',
    price: '',
    quantity: '',
    description: '',
    accessoryQuantities: {},
    type: '',
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Predefined categories
  const predefinedCategories = ['Chair', 'Table', 'Shelf', 'Others'];

  // Accessory options for chairs
  const accessoryOptions = [
    'Arm',
    'Mechanism',
    'Headrest',
    'Castor',
    'Chrome',
    'Gas Lift',
    'Cup Holder',
    'Chair Back',
  ];

  // Fetch stock and history
  const fetchStock = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await axios.get(`${backendUrl}/api/shops/${shopId}/stock`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStock(response.data.stock || {});
    } catch (error) {
      try {
        const sim = shopkeeperSim.getStock(shopId);
        setStock(sim || {});
      } catch (e) {
        toast.error(sanitizeMessage(e.message) || 'Failed to fetch stock data');
      }
    } finally {
      setIsFetching(false);
    }
  }, [shopId, token]);

  const fetchStockHistory = useCallback(async () => {
    setIsFetching(true);
    try {
      const response = await axios.get(`${backendUrl}/api/shops/${shopId}/stock/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStockHistory(response.data.history || []);
    } catch (error) {
      toast.error(
        error.response?.status === 401
          ? 'Unauthorized: Please log in again'
          : sanitizeMessage(error.response?.data?.message) || 'Failed to fetch stock history'
      );
    } finally {
      setIsFetching(false);
    }
  }, [shopId, token]);

  useEffect(() => {
    fetchStock();
    fetchStockHistory();
  }, [fetchStock, fetchStockHistory]);

  // Listen for sidebar-triggered prefetch events
  useEffect(() => {
    const handler = (e) => {
      try {
        const targetShopId = e?.detail?.shopId;
        if (!targetShopId || targetShopId === shopId) {
          fetchStock();
          fetchStockHistory();
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('shop:fetchStock', handler);
    return () => window.removeEventListener('shop:fetchStock', handler);
  }, [shopId, fetchStock, fetchStockHistory]);

  // Handle new item form
  const handleAccessoryChange = (acc, value) => {
    setNewItem((prev) => ({
      ...prev,
      accessoryQuantities: {
        ...prev.accessoryQuantities,
        [acc]: value ? parseInt(value, 10) : '',
      },
    }));
  };

  const submitNewItem = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.category || !newItem.subCategory || !newItem.quantity || !newItem.price) {
      toast.info('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        shopId,
        name: newItem.name,
        category: newItem.category,
        subCategory: newItem.subCategory,
        price: parseFloat(newItem.price),
        quantity: parseInt(newItem.quantity, 10),
        description: newItem.description,
        accessoryQuantities: newItem.category === 'Chair' ? newItem.accessoryQuantities : undefined,
        type: newItem.category !== 'Chair' && !isCustomCategory ? newItem.type : undefined,
      };

      const response = await axios.post(`${backendUrl}/api/stock/requests`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.data.success) {
        toast.success('New item request submitted for admin approval');
        setNewItem({
          name: '',
          category: '',
          subCategory: '',
          price: '',
          quantity: '',
          description: '',
          accessoryQuantities: {},
          type: '',
        });
        setIsCustomCategory(false);
      } else {
        toast.error(sanitizeMessage(response.data.message));
      }
    } catch (error) {
      toast.error(
        error.response?.status === 401
          ? 'Unauthorized: Please log in again'
          : sanitizeMessage(error.response?.data?.message) || 'Failed to submit new item request'
      );
    } finally {
      setLoading(false);
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

  const lowStockItems = Object.entries(stock).filter(([, quantity]) => quantity < 5);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 p-6 md:p-12">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-extrabold text-gray-900">Stock Control</h2>
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
              onClick={() => {
                fetchStock();
                fetchStockHistory();
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              aria-label="Refresh stock data"
            >
              Refresh Stock
            </button>
          </div>
        </div>
      </div>

      {isFetching && (
        <div className="text-center py-4">
          <svg
            className="animate-spin h-8 w-8 text-indigo-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span className="text-gray-500">Loading data...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Management */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add New Item Form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <form
              onSubmit={submitNewItem}
              className="max-w-4xl mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100 transition-all duration-300"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <span className="text-indigo-600">➕</span> Add New Item
              </h3>
              <div className="space-y-6">
                <div>
                  <label htmlFor="item-name" className="block mb-2 text-sm font-semibold text-gray-700">
                    Item Name *
                  </label>
                  <input
                    id="item-name"
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="Enter item name"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Item name"
                  />
                </div>
                <div>
                  <label htmlFor="category" className="block mb-2 text-sm font-semibold text-gray-700">
                    Category *
                  </label>
                  {isCustomCategory ? (
                    <input
                      id="category"
                      type="text"
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      placeholder="Enter custom category"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Custom category"
                    />
                  ) : (
                    <select
                      id="category"
                      value={newItem.category}
                      onChange={(e) => {
                        setNewItem({ ...newItem, category: e.target.value });
                        setIsCustomCategory(e.target.value === 'Others');
                      }}
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Select category"
                    >
                      <option value="">Select Category</option>
                      {predefinedCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label htmlFor="subcategory" className="block mb-2 text-sm font-semibold text-gray-700">
                    Subcategory *
                  </label>
                  <input
                    id="subcategory"
                    type="text"
                    value={newItem.subCategory}
                    onChange={(e) => setNewItem({ ...newItem, subCategory: e.target.value })}
                    placeholder="Enter subcategory"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Subcategory"
                  />
                </div>
                <div>
                  <label htmlFor="price" className="block mb-2 text-sm font-semibold text-gray-700">
                    Price ($)*
                  </label>
                  <input
                    id="price"
                    type="number"
                    step="0.01"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="Enter price"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Item price"
                  />
                </div>
                <div>
                  <label htmlFor="quantity" className="block mb-2 text-sm font-semibold text-gray-700">
                    Initial Quantity *
                  </label>
                  <input
                    id="quantity"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    placeholder="Enter initial quantity"
                    min="1"
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Initial quantity"
                  />
                </div>
                <div>
                  <label htmlFor="description" className="block mb-2 text-sm font-semibold text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Enter item description"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Item description"
                  />
                </div>
                {newItem.category === 'Chair' && (
                  <div>
                    <p className="mb-3 text-sm font-semibold text-gray-700">Chair Accessories Quantities</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accessoryOptions.map((acc) => (
                        <div key={acc}>
                          <label htmlFor={`acc-${acc}`} className="block mb-2 text-sm font-semibold text-gray-700">
                            {acc} Quantity
                          </label>
                          <input
                            id={`acc-${acc}`}
                            type="number"
                            value={newItem.accessoryQuantities[acc] || ''}
                            onChange={(e) => handleAccessoryChange(acc, e.target.value)}
                            placeholder={`Enter ${acc} quantity`}
                            min="0"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            aria-label={`${acc} quantity`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {newItem.category && newItem.category !== 'Chair' && !isCustomCategory && (
                  <div>
                    <label htmlFor="type" className="block mb-2 text-sm font-semibold text-gray-700">
                      Type
                    </label>
                    <input
                      id="type"
                      type="text"
                      value={newItem.type}
                      onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                      placeholder="Enter type"
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Item type"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Submit new item request"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-5 w-5 mr-2 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                      </svg>
                      Submitting Request...
                    </span>
                  ) : (
                    <>
                      <span>➕</span> Request New Item
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

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

          {/* Stock Chart Placeholder */}
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
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Stock Movements</h3>
            <div className="space-y-3">
              {stockHistory.length === 0 && <p className="text-center text-gray-500">No recent movements</p>}
              {stockHistory.slice(0, 5).map((record) => (
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
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${record.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                      {record.type === 'in' ? '+' : ''}{record.change}
                    </span>
                    <button
                      onClick={() => setSelectedTransaction(record)}
                      className="text-indigo-600 hover:text-indigo-700 text-sm"
                      aria-label={`View details for transaction ${record.id}`}
                    >
                      Details
                    </button>
                  </div>
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
              <button
                onClick={async () => {
                  try {
                    const orders = shopkeeperSim.getOrders(shopId);
                    const pending = orders.find((o) => o.status === 'Pending');
                    if (!pending) {
                      toast.info('No pending deliveries to simulate');
                      return;
                    }
                    const delivered = shopkeeperSim.confirmDelivery(shopId, pending._id);
                    if (delivered) {
                      toast.success(`Delivery simulated: ${pending._id}`);
                      await fetchStock();
                      await fetchStockHistory();
                    } else {
                      toast.error('Failed to simulate delivery');
                    }
                  } catch (e) {
                    console.error(e);
                    toast.error(sanitizeMessage(e.message) || 'Failed to simulate delivery');
                  }
                }}
                className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-left"
                aria-label="Simulate delivery"
              >
                Simulate Delivery
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Transaction #{selectedTransaction.id}</h3>
              <button
                onClick={() => setSelectedTransaction(null)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close transaction details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p>
              <strong>Item:</strong> {selectedTransaction.item.replace('_', ' ')}
            </p>
            <p>
              <strong>Type:</strong> {selectedTransaction.type === 'in' ? 'Stock In' : 'Stock Out'}
            </p>
            <p>
              <strong>Change:</strong> {selectedTransaction.type === 'in' ? '+' : ''}{selectedTransaction.change}
            </p>
            <p>
              <strong>Reason:</strong> {selectedTransaction.reason}
            </p>
            <p>
              <strong>Date:</strong> {new Date(selectedTransaction.date).toLocaleDateString()}
            </p>
            {selectedTransaction.customer && (
              <>
                <p>
                  <strong>Customer:</strong> {selectedTransaction.customer.firstName}{' '}
                  {selectedTransaction.customer.lastName}
                </p>
                {selectedTransaction.customer.phone && (
                  <p>
                    <strong>Phone:</strong> {selectedTransaction.customer.phone}
                  </p>
                )}
                {selectedTransaction.customer.email && (
                  <p>
                    <strong>Email:</strong> {selectedTransaction.customer.email}
                  </p>
                )}
                {selectedTransaction.customer.address && (
                  <p>
                    <strong>Address:</strong> {selectedTransaction.customer.address}
                  </p>
                )}
              </>
            )}
            <button
              onClick={() => setSelectedTransaction(null)}
              className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              aria-label="Close transaction details"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockControl;