import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AlertTriangle, X } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { backendUrl } from '../../config';
import shopkeeperSim from '../../utils/shopkeeperSim';
import sanitizeMessage from '../../utils/sanitizeMessage';

const StockControl = ({ token, shopId }) => {

  // State for stock
  const [stock, setStock] = useState({});
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false); // Toggle for add item modal

  // State for new item form
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    subCategory: '',
    quantity: '',
    description: '',
    type: '',
  });
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // Predefined categories
  const predefinedCategories = ['Chair', 'Table', 'Shelf', 'Others'];

  // Fetch stock
  const fetchStock = useCallback(async () => {
    setIsFetching(true);
    try {
      // Prefer fetching items (components, backs, etc.) and aggregate into a simple stock map
      // If a shopId is provided, prefer fetching shop-specific items which include
      // both accessories and delivered finished-products (created as Item records
      // tied to the shop). When no shopId is present, fall back to fetching
      // global items and products separately.
      const itemsUrl = `${backendUrl}/api/items${shopId ? `?shop=${shopId}` : ''}`;
      const itemsRes = await axios.get(itemsUrl, { headers: { Authorization: `Bearer ${token}` } });

      const items = Array.isArray(itemsRes.data) ? itemsRes.data : (itemsRes.data.items || []);

      // build a simple stock map: label -> total quantity
      const map = {};
      const labelFor = (it) => {
        if (!it) return 'unknown';
        if (it.type === 'back' && it.model) return `${it.model} (back)`;
        if (it.model) return `${it.model} (${it.type})`;
        return `${it.type}`;
      };

      // Items to always hide from StockControl list (accessories/components)
      const excluded = new Set([
        'arm',
        'mechanism',
        'headrest',
        'castor',
        'chrome',
        'gaslift',
        'cupholder',
        'office chair_(back)',
        'back'
      ].map((s) => s.toLowerCase()));

      for (const it of items) {
        // If viewing a specific shop, show only finished products (type === 'product')
        // and limit to finished furniture (chairs) only — hide accessory/component
        // stocks such as arms, mechanisms, castors, etc.
        if (shopId) {
          if (String((it.type || '')).toLowerCase() !== 'product') continue;
          const ft = (it.furnitureType || it.type || it.model || '').toString().toLowerCase();
          // Only include chairs for shop-level stock view. If you want to include
          // other finished goods (tables, shelves), add them to this list.
          if (!['chair', 'chairs'].includes(ft) && !(String(it.model || '').toLowerCase().includes('chair'))) continue;
        }

        const label = labelFor(it).replace(/\s+/g, '_').toLowerCase();
        // hide explicit excluded accessory items from the stock control view
        const rawType = (it.type || '').toString().toLowerCase();
        const rawModel = (it.model || '').toString().toLowerCase();
        if (excluded.has(rawType) || excluded.has(rawModel)) continue;
        map[label] = (map[label] || 0) + (Number(it.quantity || 0));
      }

      // Note: we use Items collection only. Finished products that were
      // delivered to a shop are represented as Items of type 'product' tied
      // to that shop, so there's no need to read from the global products DB
      // for shop-visible stock.

      setStock(map);
    } catch (error) {
      // fallback to local simulation if server endpoints are unreachable
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

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // Listen for sidebar-triggered prefetch events
  useEffect(() => {
    const handler = (e) => {
      try {
        const targetShopId = e?.detail?.shopId;
        // If the event contains an updated `item`, apply it optimistically to the local stock map
        const updatedItem = e?.detail?.item;
        const delta = Number(e?.detail?.delta || 0);
        if (updatedItem && String(updatedItem.shop) === String(shopId)) {
          // compute label used by this component
          const labelFor = (it) => {
            if (!it) return 'unknown';
            if (it.type === 'back' && it.model) return `${it.model} (back)`;
            if (it.model) return `${it.model} (${it.type})`;
            return `${it.type}`;
          };
          const label = labelFor(updatedItem).replace(/\s+/g, '_').toLowerCase();
          setStock((prev) => {
            const next = { ...prev };
            if (delta && delta !== 0) {
              next[label] = (Number(next[label] || 0) + delta);
            } else {
              // if delta not provided, fallback to using returned item.quantity as authoritative
              next[label] = Number(updatedItem.quantity || next[label] || 0);
            }
            return next;
          });
          // also exit early (we already applied update)
          return;
        }

        // otherwise, if the event targets this shop (or has no target), refresh
        if (!targetShopId || targetShopId === shopId) {
          fetchStock();
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('shop:fetchStock', handler);
    return () => window.removeEventListener('shop:fetchStock', handler);
  }, [shopId, fetchStock]);

  const submitNewItem = async (e) => {
    e.preventDefault();
    // When a shopId is provided, shops can only request finished products
    // (not accessories). Validate accordingly.
    if (shopId) {
      if (!newItem.name || !newItem.quantity) {
        toast.info('Please fill all required fields');
        return;
      }
    } else {
      if (!newItem.name || !newItem.category || !newItem.subCategory || !newItem.quantity) {
        toast.info('Please fill all required fields');
        return;
      }
    }

    setLoading(true);
    try {
      // items/request API expects: { type, model, furnitureType, quantity, optional, requester }
      // If shopId is present, force requests to be for finished products.
      const payload = shopId
        ? {
            type: 'product',
            model: newItem.name,
            furnitureType: (newItem.category || 'product').toString().toLowerCase(),
            quantity: parseInt(newItem.quantity, 10),
            optional: false,
            shop: shopId,
            requester: shopId,
          }
        : {
            type: (newItem.type || newItem.name).toString().toLowerCase().replace(/\s+/g, '_'),
            model: newItem.name,
            furnitureType: (newItem.category || '').toString().toLowerCase(),
            quantity: parseInt(newItem.quantity, 10),
            optional: false,
            shop: shopId || undefined,
            requester: shopId || undefined,
          };

      const response = await axios.post(`${backendUrl}/api/items/request`, payload, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.data && response.data.success) {
        toast.success('New item request submitted for admin approval');
        setNewItem({
          name: '',
          category: '',
          subCategory: '',
          quantity: '',
          description: '',
          type: '',
        });
        setIsCustomCategory(false);
        setShowAddForm(false);
        fetchStock();
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

  const handleOrderClick = (label) => {
    // prefill add form for ordering more of the given item
    const name = label.replace(/_/g, ' ').replace(/\([^)]*\)/g, '').trim();
    setNewItem((s) => ({ ...s, name, category: 'Chair', subCategory: '', quantity: '1' }));
    setShowAddForm(true);
  };

  const getStockLevelColor = (quantity) => {
    if (quantity === 0) return 'text-red-600 bg-red-50';
    if (quantity < 5) return 'text-orange-600 bg-amber-50';
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

  // If not authenticated, show Unauthorized message (hooks above still run)
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-gray-50 to-purple-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md w-full text-center">
          <h3 className="text-base font-bold text-gray-900">Unauthorized</h3>
          <p className="text-xs text-gray-600 mt-2">Please log in to access Stock Control.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 p-2 md:p-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-2 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Stock Control</h2>
            <p className="text-gray-600 text-[11px]">Monitor and manage your shop inventory</p>
          </div>
          <div className="flex items-center space-x-2">
            {lowStockItems.length > 0 && (
              <div className="bg-red-50 px-1.5 py-0.25 rounded-lg flex items-center space-x-1">
                <AlertTriangle className="h-2.5 w-2.5 text-red-600" />
                <span className="text-red-800 text-[11px] font-medium">
                  {lowStockItems.length} Low Stock Items
                </span>
              </div>
            )}
            <button
              onClick={() => fetchStock()}
              className="px-1.5 py-0.25 bg-indigo-600 text-white text-[11px] rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              aria-label="Refresh stock data"
            >
              Refresh Stock
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-1.5 py-0.25 bg-green-600 text-white text-[11px] rounded-lg hover:bg-green-700 transition-colors duration-200"
              aria-label="Show add item form"
            >
              Add New Item
            </button>
          </div>
        </div>
      </div>

      {isFetching && (
        <div className="text-center py-1.5">
          <svg
            className="animate-spin h-4 w-4 text-indigo-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span className="text-gray-500 text-[11px]">Loading data...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
        {/* Main Content (Current Stock Levels) */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm p-2">
            <h3 className="text-[11px] font-semibold text-gray-900 mb-1.5">Current Stock Levels</h3>
            <div className="mb-1.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-gray-700">
                  Total Unique Items: <span className="font-bold">{Object.keys(stock).length}</span>
                </p>
                <p className="text-[10px] font-medium text-gray-700">
                  Total Quantity: <span className="font-bold">
                    {Object.values(stock).reduce((sum, qty) => sum + qty, 0)}
                  </span>
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-3 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th scope="col" className="px-3 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th scope="col" className="px-3 py-1 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(stock).map(([item, quantity]) => (
                    <tr key={item} className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="px-3 py-1.5 whitespace-nowrap text-[10px] font-medium text-gray-900 capitalize">
                        {item.replace('_', ' ')}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-[10px] text-gray-500">
                        {quantity}
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap">
                        <span className={`px-1 py-0.25 rounded-full text-[10px] font-medium ${getStockLevelColor(quantity)}`}>
                          {getStockLevelText(quantity)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar (Low Stock Alerts) */}
        <div className="lg:col-span-1">
          {lowStockItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-2">
              <h3 className="text-[11px] font-semibold text-gray-900 mb-1 flex items-center">
                <AlertTriangle className="h-2.5 w-2.5 text-red-600 mr-1" />
                Low Stock Alerts
              </h3>
              <div className="space-y-1">
                {lowStockItems.map(([item, quantity]) => (
                  <div key={item} className="flex items-center justify-between p-1 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <p className="font-medium text-red-900 text-[11px] capitalize">
                        {item.replace('_', ' ')}
                      </p>
                      <p className="text-[10px] text-red-700">Only {quantity} left in stock</p>
                    </div>
                    <button onClick={() => handleOrderClick(item)} className="px-1.5 py-0.25 bg-red-600 text-white text-[10px] rounded-lg hover:bg-red-700 transition-colors duration-200">
                      Order
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add New Item Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-2 max-w-md w-full">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-base font-bold text-gray-900">Add New Item</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
                aria-label="Close add item form"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <form onSubmit={submitNewItem} className="space-y-2">
              <div>
                <label htmlFor="item-name" className="block text-[10px] font-semibold text-gray-700">
                  Item Name *
                </label>
                <input
                  id="item-name"
                  type="text"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Enter item name"
                  required
                  className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Item name"
                />
              </div>
              <div>
                <label htmlFor="category" className="block text-[10px] font-semibold text-gray-700">
                  Category *
                </label>
                {/* When viewing shop-specific stock, shops should not set accessory categories */}
                {!shopId && (
                  (isCustomCategory ? (
                    <input
                      id="category"
                      type="text"
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      placeholder="Enter custom category"
                      required
                      className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Select category"
                    >
                      <option value="">Select Category</option>
                      {predefinedCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  ))
                )}
              </div>
              <div>
                <label htmlFor="subcategory" className="block text-[10px] font-semibold text-gray-700">
                  Subcategory *
                </label>
                <input
                  id="subcategory"
                  type="text"
                  value={newItem.subCategory}
                  onChange={(e) => setNewItem({ ...newItem, subCategory: e.target.value })}
                  placeholder="Enter subcategory"
                  required
                  className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Subcategory"
                />
              </div>
              <div>
                <label htmlFor="quantity" className="block text-[10px] font-semibold text-gray-700">
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
                  className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Initial quantity"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-[10px] font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Enter item description"
                  className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Item description"
                />
              </div>
              {/* Only allow setting accessory 'type' when not a shop-specific request */}
              {!shopId && newItem.category && newItem.category !== 'Chair' && !isCustomCategory && (
                <div>
                  <label htmlFor="type" className="block text-[10px] font-semibold text-gray-700">
                    Type
                  </label>
                  <input
                    id="type"
                    type="text"
                    value={newItem.type}
                    onChange={(e) => setNewItem({ ...newItem, type: e.target.value })}
                    placeholder="Enter type"
                    className="w-full p-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Item type"
                  />
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold py-1 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Submit new item request"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-3 w-3 mr-1 text-white"
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
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white text-[11px] font-semibold py-1 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                  aria-label="Cancel add item"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockControl;

StockControl.propTypes = {
  token: PropTypes.string,
  shopId: PropTypes.string,
};