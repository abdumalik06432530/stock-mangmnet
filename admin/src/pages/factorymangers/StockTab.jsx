import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Warehouse, AlertCircle, RefreshCw, Plus } from 'lucide-react';
import { backendUrl } from '../../config';

const StockTab = ({ stock, setStock, loading, fetchStock, token }) => {
  const [newStock, setNewStock] = useState({ productType: '', quantity: '', price: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [accessoriesData, setAccessoriesData] = useState({});

  const productTypes = ['Chair', 'Table', 'Sofa', 'Cabinet', 'Shelf', 'Bed'];
  const accessoryTypes = ['Cushions', 'Screws', 'Legs', 'Handles', 'Backrest', 'Mattress'];

  const addStockItem = async (productData) => {
    try {
      const res = await axios.post(
        `${backendUrl}/api/factory/stock/request`,
        { ...productData, status: 'Pending' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success('Stock addition request sent for admin approval');
        return true;
      }
    } catch (err) {
      console.error('Failed to request stock addition', err);
      toast.error(err.response?.data?.message || 'Failed to request stock addition');
    }
    return false;
  };

  const addAccessories = async (productId, accessories) => {
    try {
      const res = await axios.put(
        `${backendUrl}/api/factory/stock/${productId}/accessories`,
        { accessories },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setStock((prev) =>
          prev.map((item) =>
            item._id === productId ? { ...item, accessories } : item
          )
        );
        toast.success('Accessories added successfully');
      }
    } catch (err) {
      console.error('Failed to add accessories', err);
      toast.error(err.response?.data?.message || 'Failed to add accessories');
    }
  };

  const handleAddStock = async () => {
    if (!newStock.productType || !newStock.quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    const success = await addStockItem(newStock);
    if (success) {
      setNewStock({ productType: '', quantity: '', price: '' });
      setShowAddForm(false);
    }
  };

  const handleAddAccessories = async (productId) => {
    const accessories = accessoriesData[productId];
    if (!accessories || accessories.length === 0) {
      toast.error('Please select at least one accessory');
      return;
    }
    await addAccessories(productId, accessories);
    setAccessoriesData((prev) => ({ ...prev, [productId]: [] }));
  };

  const lowStockItems = stock.filter((item) => item.quantity < 10);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Section */}
      <div className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Stock Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
          aria-label="Toggle add new product form"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Add Stock Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Add New Product</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Product Type</label>
              <select
                value={newStock.productType}
                onChange={(e) => setNewStock({ ...newStock, productType: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                aria-label="Select product type"
              >
                <option value="">Select product type</option>
                {productTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={newStock.quantity}
                onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter quantity"
                aria-label="Quantity"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={newStock.price}
                onChange={(e) => setNewStock({ ...newStock, price: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter price"
                aria-label="Price"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={handleAddStock}
              className="px-4 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
              aria-label="Request stock addition"
            >
              Request Stock Addition
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-1 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 text-xs"
              aria-label="Cancel stock addition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
              <div>
                <h3 className="text-base font-semibold text-red-900">Low Stock Alerts</h3>
                <p className="text-xs text-red-700">
                  {lowStockItems.length} products are running low on stock
                </p>
              </div>
            </div>
            <button
              onClick={fetchStock}
              className="px-4 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
              aria-label="Refresh stock"
            >
              Refresh Stock
            </button>
          </div>
        </div>
      )}

      {/* Stock List */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900">Current Stock Levels</h3>
          <button
            onClick={fetchStock}
            className="flex items-center space-x-2 px-4 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-xs"
            aria-label="Refresh stock"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        ) : stock.length === 0 ? (
          <div className="text-center py-6">
            <Warehouse className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-600">No stock data available</p>
            <p className="text-xs text-gray-400">Add products to see stock levels</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {stock.map((item) => (
              <div
                key={item._id}
                className={`border rounded-lg p-3 hover:shadow-lg transition-all duration-200 ${
                  item.quantity < 10 ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 text-base capitalize">{item.productType}</h4>
                  <Warehouse
                    className={`h-5 w-5 ${
                      item.quantity < 10 ? 'text-red-600' :
                      item.quantity < 20 ? 'text-yellow-600' : 'text-green-600'
                    }`}
                    aria-hidden="true"
                  />
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">{item.quantity}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.quantity < 10 ? 'bg-red-100 text-red-800' :
                        item.quantity < 20 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}
                    >
                      {item.quantity < 10 ? 'Low' : item.quantity < 20 ? 'Medium' : 'Good'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        item.quantity < 10 ? 'bg-red-500' :
                        item.quantity < 20 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (item.quantity / 50) * 100)}%` }}
                    ></div>
                  </div>
                  {item.price && (
                    <p className="text-xs text-gray-600">Price: ${item.price}</p>
                  )}
                </div>

                <div className="border-t pt-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Add Accessories
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {accessoryTypes.map((accessory) => (
                      <label key={accessory} className="flex items-center space-x-1">
                        <input
                          type="checkbox"
                          checked={accessoriesData[item._id]?.includes(accessory) || false}
                          onChange={(e) => {
                            const currentAccessories = accessoriesData[item._id] || [];
                            if (e.target.checked) {
                              setAccessoriesData((prev) => ({
                                ...prev,
                                [item._id]: [...currentAccessories, accessory]
                              }));
                            } else {
                              setAccessoriesData((prev) => ({
                                ...prev,
                                [item._id]: currentAccessories.filter(a => a !== accessory)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          aria-label={`Add ${accessory} to ${item.productType}`}
                        />
                        <span className="text-xs text-gray-700">{accessory}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={() => handleAddAccessories(item._id)}
                    className="w-full px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-xs shadow-sm hover:shadow-md"
                    aria-label={`Add accessories to ${item.productType}`}
                  >
                    Add Accessories
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockTab;