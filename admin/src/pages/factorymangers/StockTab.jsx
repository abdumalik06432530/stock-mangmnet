import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { debounce } from 'lodash';
import { Package, Search, AlertCircle, Edit, Trash2, Plus, Minus, RefreshCw } from 'lucide-react';
import { backendUrl } from '../../config';
import sanitizeMessage from '../../utils/sanitizeMessage';

const ApprovalStockList = ({ token, stock, setStock, fetchStock }) => {
  // State
  const [newStock, setNewStock] = useState({
    name: '',
    description: '',
    category: '',
    subCategory: '',
    type: '',
    accessoryQuantities: {}
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingQuantity, setEditingQuantity] = useState('');
  const [editingAccessories, setEditingAccessories] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const categories = {
    Chair: ['Office Chair', 'Gaming Chair', 'Dining Chair'],
    Table: ['Dining Table', 'Coffee Table', 'Study Table'],
    Shelf: ['Bookshelf', 'Wall Shelf', 'Storage Shelf'],
    Others: ['Miscellaneous']
  };
  const accessoryOptions = [
    'Arm',
    'Mechanism',
    'Headrest',
    'Castor',
    'Chrome',
    'Gas Lift',
    'Cup Holder',
    'Chair Back'
  ];

  // Token validation
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-base font-bold text-gray-900">Unauthorized Access</h3>
          <p className="text-xs text-gray-600 mt-2">Please log in to access the Stock List.</p>
          <button
            onClick={() => (window.location.href = '/login')}
            className="mt-3 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
            aria-label="Go to login page"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Fetch pending requests
  const fetchPendingRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${backendUrl}/api/factory/stock/pending-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPendingRequests(res.data.requests || []);
      } else {
        setError(sanitizeMessage(res.data.message) || 'Failed to fetch pending requests');
        toast.error(sanitizeMessage(res.data.message) || 'Failed to fetch pending requests');
      }
    } catch (err) {
      console.error('Failed to fetch pending requests', err);
      setError(sanitizeMessage(err.response?.data?.message) || 'Failed to fetch pending requests');
      toast.error(sanitizeMessage(err.response?.data?.message) || 'Failed to fetch pending requests');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Send stock addition request
  const addStockRequest = useCallback(async (productData) => {
    try {
      const payload = {
        ...productData,
        status: 'Pending',
        accessoryQuantities: productData.category === 'Chair' ? productData.accessoryQuantities : undefined,
        type: productData.category === 'Chair' ? undefined : productData.type
      };
      const res = await axios.post(
        `${backendUrl}/api/factory/stock/request`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success('Stock addition request sent for admin approval');
        return true;
      }
    } catch (err) {
      console.error('Failed to request stock addition', err);
      toast.error(sanitizeMessage(err.response?.data?.message) || 'Failed to request stock addition');
    }
    return false;
  }, [token]);

  // Handle stock request submission
  const handleAddStock = useCallback(async () => {
    if (!newStock.name || !newStock.description || !newStock.category || !newStock.subCategory) {
      toast.error('Please fill all required fields');
      return;
    }
    if (newStock.category !== 'Chair' && !newStock.type) {
      toast.error('Please enter a type for non-chair products');
      return;
    }
    if (newStock.category === 'Chair' && Object.values(newStock.accessoryQuantities).every((val) => !val)) {
      toast.error('Please enter at least one accessory quantity for chairs');
      return;
    }

    const success = await addStockRequest(newStock);
    if (success) {
      setNewStock({ name: '', description: '', category: '', subCategory: '', type: '', accessoryQuantities: {} });
      setShowAddForm(false);
      fetchPendingRequests();
    }
  }, [newStock, addStockRequest, fetchPendingRequests]);

  // Handle category change
  const handleCategoryChange = useCallback((e) => {
    const selectedCategory = e.target.value;
    setNewStock((prev) => ({
      ...prev,
      category: selectedCategory,
      subCategory: categories[selectedCategory]?.[0] || '',
      accessoryQuantities: {},
      type: ''
    }));
  }, []);

  // Handle accessory change
  const handleAccessoryChange = useCallback((acc, value) => {
    setNewStock((prev) => ({
      ...prev,
      accessoryQuantities: {
        ...prev.accessoryQuantities,
        [acc]: value
      }
    }));
  }, []);

  // Get display quantity
  const getDisplayQuantity = useCallback((item) => {
    if (item.category === 'Chair' && item.accessoryQuantities && item.accessoryQuantities['Chair Back']) {
      return item.accessoryQuantities['Chair Back'] || 0;
    }
    return item.quantity || 0;
  }, []);

  // Edit main quantity
  const startEdit = useCallback((id, currentQuantity) => {
    setEditingId(id);
    setEditingQuantity(String(currentQuantity ?? 0));
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingQuantity('');
    setEditingAccessories({});
  }, []);

  const saveQuantity = useCallback(
    async (id, item) => {
      const quantity = parseInt(editingQuantity, 10);
      if (isNaN(quantity) || quantity < 0) {
        toast.error('Please enter a valid non-negative quantity');
        return;
      }

      try {
        let response;
        if (item.category === 'Chair') {
          const updatedAccessories = {
            ...item.accessoryQuantities,
            'Chair Back': quantity
          };
          response = await axios.put(
            `${backendUrl}/api/factory/stock/${id}/accessories`,
            { accessoryQuantities: updatedAccessories },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        } else {
          response = await axios.put(
            `${backendUrl}/api/factory/stock/${id}`,
            { quantity },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }

        if (response.data.success) {
          toast.success(sanitizeMessage(response.data.message) || 'Quantity updated');
          cancelEdit();
          fetchStock();
        } else {
          toast.error(sanitizeMessage(response.data.message));
        }
      } catch (error) {
        console.error('Update quantity error:', error);
        toast.error(sanitizeMessage(error.response?.data?.message) || 'Failed to update quantity');
      }
    },
    [editingQuantity, fetchStock, token, cancelEdit]
  );

  // Edit accessory quantity
  const startAccessoryEdit = useCallback((itemId, accessoryName, currentQuantity) => {
    setEditingAccessories((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [accessoryName]: String(currentQuantity ?? 0)
      }
    }));
  }, []);

  const cancelAccessoryEdit = useCallback((itemId, accessoryName) => {
    setEditingAccessories((prev) => {
      const newState = { ...prev };
      if (newState[itemId]) {
        delete newState[itemId][accessoryName];
        if (Object.keys(newState[itemId]).length === 0) {
          delete newState[itemId];
        }
      }
      return newState;
    });
  }, []);

  const saveAccessoryQuantity = useCallback(
    async (id, accessoryName, item) => {
      const quantity = parseInt(editingAccessories[id]?.[accessoryName], 10);
      if (isNaN(quantity) || quantity < 0) {
        toast.error('Please enter a valid non-negative quantity');
        return;
      }

      try {
        const updatedAccessories = {
          ...item.accessoryQuantities,
          [accessoryName]: quantity
        };
        const response = await axios.put(
          `${backendUrl}/api/factory/stock/${id}/accessories`,
          { accessoryQuantities: updatedAccessories },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          toast.active(sanitizeMessage(response.data.message) || 'Accessory quantity updated');
          cancelAccessoryEdit(id, accessoryName);
          fetchStock();
        } else {
          toast.error(sanitizeMessage(response.data.message));
        }
      } catch (error) {
        console.error('Update accessory quantity error:', error);
        toast.error(sanitizeMessage(error.response?.data?.message) || 'Failed to update accessory quantity');
      }
    },
    [editingAccessories, fetchStock, token, cancelAccessoryEdit]
  );

  // Add new accessory
  const addNewAccessory = useCallback(
    async (id, item) => {
      const accessoryName = prompt('Enter accessory name:');
      if (!accessoryName) return;

      const quantity = parseInt(prompt('Enter quantity:', '0'), 10);
      if (isNaN(quantity) || quantity < 0) {
        toast.error('Please enter a valid non-negative quantity');
        return;
      }

      try {
        const updatedAccessories = {
          ...item.accessoryQuantities,
          [accessoryName]: quantity
        };
        const response = await axios.put(
          `${backendUrl}/api/factory/stock/${id}/accessories`,
          { accessoryQuantities: updatedAccessories },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          toast.success('Accessory added successfully');
          fetchStock();
        } else {
          toast.error(sanitizeMessage(response.data.message));
        }
      } catch (error) {
        console.error('Add accessory error:', error);
        toast.error(sanitizeMessage(error.response?.data?.message) || 'Failed to add accessory');
      }
    },
    [fetchStock, token]
  );

  // Remove accessory
  const removeAccessory = useCallback(
    async (id, accessoryName, item) => {
      if (!confirm(`Remove accessory "${accessoryName}"?`)) return;

      try {
        const updatedAccessories = { ...item.accessoryQuantities };
        delete updatedAccessories[accessoryName];
        const response = await axios.put(
          `${backendUrl}/api/factory/stock/${id}/accessories`,
          { accessoryQuantities: updatedAccessories },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          toast.success('Accessory removed successfully');
          fetchStock();
        } else {
          toast.error(sanitizeMessage(response.data.message));
        }
      } catch (error) {
        console.error('Remove accessory error:', error);
        toast.error(sanitizeMessage(error.response?.data?.message) || 'Failed to remove accessory');
      }
    },
    [fetchStock, token]
  );

  // Remove stock item
  const removeStockItem = useCallback(
    async (id) => {
      if (!confirm('Delete stock item? This action cannot be undone.')) return;
      try {
        const response = await axios.delete(`${backendUrl}/api/factory/stock/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          toast.success(response.data.message);
          fetchStock();
        } else {
          toast.error(sanitizeMessage(response.data.message));
        }
      } catch (error) {
        console.error('Remove stock item error:', error);
        toast.error(sanitizeMessage(error.response?.data?.message) || 'Failed to remove stock item');
      }
    },
    [fetchStock, token]
  );

  // Toggle expandable row
  const toggleRow = useCallback((id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  // Memoized filtered stock
  const filteredStock = useMemo(() => {
    return stock.filter((item) => {
      const searchText = [
        item._id,
        item.name,
        item.category,
        item.subCategory,
        item.description,
        item.type || '',
        item.accessoryQuantities ? Object.keys(item.accessoryQuantities).join(' ') : ''
      ]
        .join(' ')
        .toLowerCase();
      return searchText.includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, stock]);

  // Fetch pending requests on mount
  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  // Component for rendering accessory details
  const AccessoryDetails = ({ item, isExpanded }) => (
    <div className={`mt-3 p-3 bg-gray-50 rounded-lg ${isExpanded ? 'block' : 'hidden'}`}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-xs font-semibold text-gray-700">Accessories</h4>
        <button
          onClick={(e) => {
            e.stopPropagation();
            addNewAccessory(item._id, item);
          }}
          className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-all duration-200"
          aria-label="Add new accessory"
        >
          <Plus className="h-3 w-3" />
          <span>Add Accessory</span>
        </button>
      </div>
      {item.accessoryQuantities && Object.keys(item.accessoryQuantities).length > 0 ? (
        <div className="space-y-2">
          {Object.entries(item.accessoryQuantities).map(([accessoryName, quantity]) => (
            <div key={accessoryName} className="flex items-center justify-between p-2 bg-white rounded border">
              <span className="text-xs font-medium text-gray-800 capitalize">{accessoryName}</span>
              <div className="flex items-center space-x-2">
                {editingAccessories[item._id]?.[accessoryName] !== undefined ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={editingAccessories[item._id][accessoryName]}
                      onChange={(e) =>
                        setEditingAccessories((prev) => ({
                          ...prev,
                          [item._id]: {
                            ...prev[item._id],
                            [accessoryName]: e.target.value
                          }
                        }))
                      }
                      min="0"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      aria-label={`Edit ${accessoryName} quantity`}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        saveAccessoryQuantity(item._id, accessoryName, item);
                      }}
                      className="p-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                      aria-label={`Save ${accessoryName} quantity`}
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelAccessoryEdit(item._id, accessoryName);
                      }}
                      className="p-1 bg-gray-400 text-white rounded hover:bg-gray-500 transition-colors"
                      aria-label="Cancel edit"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600 min-w-8 text-center">{quantity || 0}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startAccessoryEdit(item._id, accessoryName, quantity);
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
                      aria-label={`Edit ${accessoryName} quantity`}
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAccessory(item._id, accessoryName, item);
                      }}
                      className="p-1 text-red-600 hover:text-red-800 transition-colors"
                      aria-label={`Remove ${accessoryName}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-2">No accessories</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4 md:p-6 animate-fade-in">
      <div className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
          <div className="flex items-center space-x-2 mb-3 sm:mb-0">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Package className="h-5 w-5 text-indigo-600" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Stock Management</h2>
              <p className="text-xs text-gray-500">Manage your stock inventory and requests</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search stock..."
                onChange={(e) => debouncedSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                aria-label="Search stock by ID, name, category, subcategory, or description"
              />
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md text-xs"
              aria-label="Toggle stock request form"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Request New Stock</span>
            </button>
          </div>
        </div>

        {/* Add Stock Request Form */}
        {showAddForm && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Request New Stock</h3>
            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label htmlFor="name" className="block mb-1 text-xs font-semibold text-gray-700">
                  Product Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={newStock.name}
                  onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                  placeholder="Enter product name"
                  required
                  className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 hover:bg-white"
                  aria-label="Product name"
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block mb-1 text-xs font-semibold text-gray-700">
                  Product Description
                </label>
                <textarea
                  id="description"
                  value={newStock.description}
                  onChange={(e) => setNewStock({ ...newStock, description: e.target.value })}
                  placeholder="Describe the product"
                  required
                  rows={4}
                  className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 hover:bg-white"
                  aria-label="Product description"
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="category" className="block mb-1 text-xs font-semibold text-gray-700">
                    Category
                  </label>
                  <select
                    id="category"
                    value={newStock.category}
                    onChange={handleCategoryChange}
                    required
                    className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                    aria-label="Select product category"
                  >
                    <option value="">Select Category</option>
                    {Object.keys(categories).map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="subcategory" className="block mb-1 text-xs font-semibold text-gray-700">
                    Sub Category
                  </label>
                  <select
                    id="subcategory"
                    value={newStock.subCategory}
                    onChange={(e) => setNewStock({ ...newStock, subCategory: e.target.value })}
                    required
                    disabled={!newStock.category}
                    className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 disabled:opacity-50"
                    aria-label="Select product subcategory"
                  >
                    <option value="">Select Subcategory</option>
                    {newStock.category &&
                      categories[newStock.category]?.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Chair Accessories */}
              {newStock.category === 'Chair' && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-700">Chair Accessories Quantities</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {accessoryOptions.map((acc) => (
                      <div key={acc}>
                        <label htmlFor={`acc-${acc}`} className="block mb-1 text-xs font-semibold text-gray-700">
                          {acc} Quantity
                        </label>
                        <input
                          id={`acc-${acc}`}
                          type="number"
                          value={newStock.accessoryQuantities[acc] || ''}
                          onChange={(e) => handleAccessoryChange(acc, e.target.value)}
                          placeholder={`Enter ${acc} quantity`}
                          min="0"
                          className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                          aria-label={`${acc} quantity`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Type for Non-Chair */}
              {newStock.category && newStock.category !== 'Chair' && (
                <div>
                  <label htmlFor="type" className="block mb-1 text-xs font-semibold text-gray-700">
                    Type
                  </label>
                  <input
                    id="type"
                    type="text"
                    value={newStock.type}
                    onChange={(e) => setNewStock({ ...newStock, type: e.target.value })}
                    placeholder="Enter type"
                    required
                    className="w-full px-3 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200"
                    aria-label="Product type"
                  />
                </div>
              )}

              {/* Submit and Cancel */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleAddStock}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 text-xs flex items-center justify-center gap-2"
                  aria-label="Request stock addition"
                >
                  <Package className="h-4 w-4" aria-hidden="true" />
                  <span>Request Stock Addition</span>
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
          </div>
        )}

        {/* Pending Stock Requests */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-semibold text-gray-900">Pending Stock Requests</h3>
            <button
              onClick={fetchPendingRequests}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-xs"
              aria-label="Refresh pending requests"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>
          {isLoading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-blue-600 mx-auto"></div>
          ) : error ? (
            <div className="text-center py-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={fetchPendingRequests}
                className="mt-3 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-xs"
                aria-label="Retry loading requests"
              >
                Retry
              </button>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="text-center py-6">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-gray-600">No pending requests</p>
              <p className="text-xs text-gray-400">Send a new stock request to see it here</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_120px] items-center py-2 px-3 bg-indigo-50 rounded-lg text-xs font-semibold text-gray-800 shadow-sm">
                <span>Product Name</span>
                <span>Category</span>
                <span>Subcategory</span>
                <span>Quantity</span>
                <span>Status</span>
              </div>
              {pendingRequests.map((request) => (
                <div
                  key={request._id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_120px] items-center gap-3 py-3 px-3 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-gray-900 truncate hover:text-indigo-600 transition-colors duration-200">
                      {request.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 capitalize">{request.category}</div>
                  <div className="text-xs text-gray-600 capitalize">{request.subCategory}</div>
                  <div className="text-xs text-gray-600">
                    {request.category === 'Chair' ? request.accessoryQuantities?.['Chair Back'] || 0 : request.quantity || 0}
                  </div>
                  <div className="text-xs font-medium text-blue-600">{request.status}</div>
                  {request.description && (
                    <div className="col-span-1 md:col-span-5 text-xs text-gray-600">Description: {request.description}</div>
                  )}
                  {request.type && (
                    <div className="col-span-1 md:col-span-5 text-xs text-gray-600">Type: {request.type}</div>
                  )}
                  {request.category === 'Chair' && request.accessoryQuantities && Object.keys(request.accessoryQuantities).length > 0 && (
                    <div className="col-span-1 md:col-span-5">
                      <p className="text-xs font-semibold text-gray-700">Accessories:</p>
                      <div className="mt-1 space-y-1">
                        {Object.entries(request.accessoryQuantities).map(([acc, qty]) => (
                          <div key={acc} className="text-xs text-gray-600">
                            {acc}: {qty}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current Stock Levels */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-semibold text-gray-900">Current Stock Levels</h3>
            <button
              onClick={fetchStock}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 text-xs"
              aria-label="Refresh stock"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Refresh</span>
            </button>
          </div>
          {isLoading ? (
            <div className="animate-spin rounded-full h-12 w-12 border-t-3 border-blue-600 mx-auto"></div>
          ) : error ? (
            <div className="text-center py-6">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-red-600">{error}</p>
              <button
                onClick={fetchStock}
                className="mt-3 px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 text-xs"
                aria-label="Retry loading stock"
              >
                Retry
              </button>
            </div>
          ) : filteredStock.length === 0 ? (
            <div className="text-center py-6">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-gray-600">No stock data available</p>
              <p className="text-xs text-gray-400">Add products to see stock levels</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_120px] items-center py-2 px-3 bg-indigo-50 rounded-lg text-xs font-semibold text-gray-800 shadow-sm">
                <span>Product Name</span>
                <span>Category</span>
                <span>Subcategory</span>
                <span>Quantity</span>
                <span className="text-center">Actions</span>
              </div>
              {filteredStock.map((item) => (
                <div
                  key={item._id}
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_120px] items-center gap-3 py-3 px-3 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(item._id);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 text-xs"
                      aria-label={`Toggle details for ${item.name}`}
                    >
                      {expandedRows[item._id] ? '▼' : '▶'}
                    </button>
                    <span className="font-semibold text-sm text-gray-900 truncate hover:text-indigo-600 transition-colors duration-200">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 capitalize">{item.category}</div>
                  <div className="text-xs text-gray-600 capitalize">{item.subCategory}</div>
                  <div className="flex items-center space-x-2">
                    {editingId === item._id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editingQuantity}
                          onChange={(e) => setEditingQuantity(e.target.value)}
                          min="0"
                          className="w-16 px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          aria-label={`Edit quantity for ${item.name}`}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveQuantity(item._id, item);
                          }}
                          className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                          aria-label={`Save quantity for ${item.name}`}
                        >
                          Save
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEdit();
                          }}
                          className="px-2 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                          aria-label="Cancel quantity edit"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-600">{getDisplayQuantity(item)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(item._id, getDisplayQuantity(item));
                          }}
                          className="text-indigo-600 hover:text-indigo-800 text-xs"
                          aria-label={`Edit quantity for ${item.name}`}
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newName = prompt('Enter new product name:', item.name);
                        if (newName && newName !== item.name) {
                          axios
                            .put(
                              `${backendUrl}/api/factory/stock/${item._id}`,
                              { name: newName },
                              { headers: { Authorization: `Bearer ${token}` } }
                            )
                            .then((res) => {
                              toast.success('Product updated');
                              fetchStock();
                            })
                            .catch((err) => {
                              toast.error('Failed to update product');
                            });
                        }
                      }}
                      className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      aria-label={`Edit ${item.name}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStockItem(item._id);
                      }}
                      className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-xs hover:bg-red-100 transition-all duration-200 shadow-sm hover:shadow-md"
                      aria-label={`Remove ${item.name}`}
                    >
                      Delete
                    </button>
                  </div>
                  <div className="col-span-1 md:col-span-5">
                    <AccessoryDetails item={item} isExpanded={expandedRows[item._id]} />
                    {item.description && (
                      <div className="text-xs text-gray-600 mt-2">Description: {item.description}</div>
                    )}
                    {item.type && (
                      <div className="text-xs text-gray-600 mt-1">Type: {item.type}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalStockList;