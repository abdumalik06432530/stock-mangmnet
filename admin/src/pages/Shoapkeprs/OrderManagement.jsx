import React, { useState, useEffect } from 'react';
import { Package, X } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { backendUrl } from '../../config';
import shopkeeperSim from '../../utils/shopkeeperSim';
import sanitizeMessage from '../../utils/sanitizeMessage';

const OrderManagement = ({ token = null, shopId = '' }) => {
  if (!token) {
    toast.error('You are not authorized to access this page. Please log in.');
    return null;
  }

  // State for form
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [category, setCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [type, setType] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // State for orders
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Predefined categories
  const predefinedCategories = ['Chair', 'Table', 'Shelf', 'Others'];

  // Fetch products and orders on mount
  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, [shopId]);

  const fetchProducts = async () => {
    setIsFetching(true);
    try {
      const response = await axios.get(`${backendUrl}/api/product/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data.products || []);
    } catch (error) {
      toast.error(
        error.response?.status === 401
          ? 'Unauthorized: Please log in again'
          : sanitizeMessage(error.response?.data?.message) || 'Failed to fetch products'
      );
    } finally {
      setIsFetching(false);
    }
  };

  const fetchOrders = async () => {
    setIsFetching(true);
    try {
      let response;
      if (shopId) {
        response = await axios.get(`${backendUrl}/api/shops/${shopId}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(response.data.orders || []);
      } else {
        response = await axios.get(`${backendUrl}/api/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrders(response.data.orders || response.data || []);
      }
    } catch (error) {
      toast.error(
        error.response?.status === 401
          ? 'Unauthorized: Please log in again'
          : sanitizeMessage(error.response?.data?.message) || 'Failed to fetch orders'
      );
    } finally {
      setIsFetching(false);
    }
  };

  // Update form fields when a product is selected
  useEffect(() => {
    if (selectedProductId) {
      const product = products.find((p) => p._id === selectedProductId);
      if (product) {
        setCategory(product.category);
        setSubCategory(product.subCategory);
        setType(product.type || '');
        setIsCustomCategory(product.category === 'Others');
      }
    } else {
      setCategory('');
      setSubCategory('');
      setType('');
      setIsCustomCategory(false);
    }
  }, [selectedProductId, products]);

  // Reset type when category changes
  useEffect(() => {
    if (category === 'Chair') {
      setType('');
    }
    if (category !== 'Others') {
      setIsCustomCategory(false);
    }
  }, [category]);

  const submitOrder = async (e) => {
    e.preventDefault();

    if (!selectedProductId && !isCustomCategory) {
      toast.info('Please select a product or specify a custom item');
      return;
    }
    if (!category || (!subCategory && !isCustomCategory) || quantity < 1) {
      toast.info('Please fill all required fields and set a valid quantity');
      return;
    }

    setLoading(true);
    try {
      const product = selectedProductId
        ? products.find((p) => p._id === selectedProductId)
        : null;

      const item = {
        productId: selectedProductId || undefined,
        name: product ? product.name : 'Custom Item',
        description: product ? product.description : '',
        furnitureType: isCustomCategory ? subCategory : product?.subCategory || subCategory,
        category: isCustomCategory ? category : product?.category || category,
        quantity: parseInt(quantity, 10),
        type: category !== 'Chair' && !isCustomCategory ? type : undefined,
      };

      const orderToSend = {
        shop: shopId || undefined,
        furnitureType: item.furnitureType,
        type: item.type || item.category,
        quantity: item.quantity,
        status: 'Pending',
        shopkeeper: (() => {
          try {
            const u = localStorage.getItem('user');
            const user = u ? JSON.parse(u) : null;
            return (user && (user.username || user._id)) || '';
          } catch {
            return '';
          }
        })(),
        createdAt: new Date().toISOString(),
      };

      const response = await axios.post(`${backendUrl}/api/orders`, orderToSend, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.data.success) {
        toast.success('Order submitted successfully');
        setSelectedProductId('');
        setQuantity(1);
        setCategory('');
        setSubCategory('');
        setType('');
        setIsCustomCategory(false);
        fetchOrders();
      } else {
        toast.error(sanitizeMessage(response.data.message));
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Unauthorized: Please log in again');
      } else if (error.response?.status === 400 && (error.response.data?.message || '').includes('stock')) {
        toast.error('Order rejected by factory: Insufficient stock');
      } else {
        try {
          const simOrder = shopkeeperSim.placeFactoryOrder(shopId, {
            items: [
              {
                productId: selectedProductId || undefined,
                name: products.find((p) => p._id === selectedProductId)?.name || 'Custom Item',
                furnitureType: isCustomCategory ? subCategory : subCategory,
                category: isCustomCategory ? category : category,
                quantity: parseInt(quantity, 10),
                type: category !== 'Chair' && !isCustomCategory ? type : undefined,
              },
            ],
          });
          toast.success(`Order submitted (sim): ${simOrder._id}`);
          setSelectedProductId('');
          setQuantity(1);
          setCategory('');
          setSubCategory('');
          setType('');
          setIsCustomCategory(false);
          setOrders((prev) => [simOrder, ...prev]);
        } catch (simErr) {
          console.error(simErr);
          toast.error(sanitizeMessage(simErr.message) || 'Failed to submit order');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    setLoading(true);
    try {
      await axios.delete(`${backendUrl}/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Order canceled successfully');
      fetchOrders();
    } catch (error) {
      toast.error(
        error.response?.status === 401
          ? 'Unauthorized: Please log in again'
          : sanitizeMessage(error.response?.data?.message) || 'Failed to cancel order'
      );
    } finally {
      setLoading(false);
    }
  };

  // Group products by category for dropdown
  const categories = [...new Set(products.map((p) => p.category)), 'Others'];
  const subcategories = selectedProductId
    ? [products.find((p) => p._id === selectedProductId)?.subCategory]
    : category && !isCustomCategory
    ? [...new Set(products.filter((p) => p.category === category).map((p) => p.subCategory))]
    : [];

  const pendingOrders = orders.filter((order) => (order.status || '').toLowerCase() === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 p-2 md:p-4 space-y-2">
      {/* Header */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm p-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Order Management</h2>
            <p className="text-gray-600 text-[11px]">Record and track factory orders</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-1.5 py-0.25 rounded-lg">
              <span className="text-orange-800 font-medium text-[10px]">
                {pendingOrders.length} Pending Orders
              </span>
            </div>
          </div>
        </div>
      </div>

      {isFetching && (
        <div className="text-center py-2">
          <svg
            className="animate-spin h-4 w-4 text-indigo-600 mx-auto"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <span className="text-gray-500 text-[10px]">Loading data...</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Order Form */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm p-2">
          <form
            onSubmit={submitOrder}
            className="max-w-md mx-auto p-2 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-100 transition-all duration-200"
          >
            <h3 className="text-[11px] font-semibold text-gray-900 mb-1.5 flex items-center gap-1.5">
              <Package className="h-3 w-3 text-indigo-600" /> Create New Order
            </h3>
            <div className="space-y-2">
              {/* Product Selection */}
              <div>
                <label htmlFor="product" className="block mb-0.5 text-[10px] font-medium text-gray-700">
                  Select Product
                </label>
                <select
                  id="product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  aria-label="Select product"
                >
                  <option value="">Select a product or custom item</option>
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.category}: {product.subCategory})
                    </option>
                  ))}
                  <option value="custom">Custom Item (Others)</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block mb-0.5 text-[10px] font-medium text-gray-700">
                  Category
                </label>
                {isCustomCategory ? (
                  <input
                    id="category"
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Enter custom category"
                    required
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    aria-label="Custom category"
                  />
                ) : (
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setIsCustomCategory(e.target.value === 'Others');
                    }}
                    required
                    disabled={selectedProductId && !isCustomCategory}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    aria-label="Select category"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Subcategory */}
              <div>
                <label htmlFor="subcategory" className="block mb-0.5 text-[10px] font-medium text-gray-700">
                  Subcategory
                </label>
                {isCustomCategory ? (
                  <input
                    id="subcategory"
                    type="text"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    placeholder="Enter custom subcategory"
                    required
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    aria-label="Custom subcategory"
                  />
                ) : (
                  <select
                    id="subcategory"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    required
                    disabled={selectedProductId && !isCustomCategory}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    aria-label="Select subcategory"
                  >
                    <option value="">Select Subcategory</option>
                    {subcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label htmlFor="quantity" className="block mb-0.5 text-[10px] font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  min="1"
                  required
                  className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  aria-label="Order quantity"
                />
              </div>

              {/* Type for Non-Chair */}
              {category && category !== 'Chair' && !isCustomCategory && (
                <div>
                  <label htmlFor="type" className="block mb-0.5 text-[10px] font-medium text-gray-700">
                    Type
                  </label>
                  <input
                    id="type"
                    type="text"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="Enter type"
                    required
                    disabled={selectedProductId && !isCustomCategory}
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg bg-gray-50 text-[10px] text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                    aria-label="Item type"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold px-2 py-1 rounded-lg hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Submit order"
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
                    Submitting...
                  </span>
                ) : (
                  <>
                    <Package className="h-3 w-3" /> Submit Order
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Orders */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm p-2">
          <h3 className="text-[11px] font-semibold text-gray-900 mb-1.5">Recent Orders</h3>
          <div className="space-y-1">
            {orders.length === 0 && <p className="text-center text-gray-500 text-[10px]">No recent orders</p>}
            {orders.slice(0, 5).map((order) => (
              <div
                key={order._id}
                className="flex items-center justify-between p-1.5 border border-gray-200 rounded-lg hover:bg-gradient-to-r from-gray-50 to-gray-100 transition-all duration-200"
              >
                <div>
                  <p className="font-medium text-gray-900 text-[10px]">Order #{order._id.slice(-6)}</p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <span
                    className={`px-1.5 py-0.25 rounded-full text-[10px] font-medium ${
                      order.status === 'Delivered'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'Processing'
                        ? 'bg-blue-100 text-blue-800'
                        : order.status === 'Rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {order.status}
                  </span>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="text-indigo-600 hover:text-indigo-700 text-[10px]"
                    aria-label={`View details for order ${order._id}`}
                  >
                    Details
                  </button>
                  {(order.status || '').toLowerCase() === 'pending' && (
                    <button
                      onClick={() => cancelOrder(order._id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 text-[10px] disabled:opacity-50"
                      aria-label={`Cancel order ${order._id}`}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-2 max-w-xs w-full">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-[11px] font-semibold text-gray-900">
                Order #{selectedOrder._id.slice(-6)}
              </h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close order details"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            <p className="text-[10px]">
              <strong>Status:</strong> {selectedOrder.status}
            </p>
            <p className="text-[10px]">
              <strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString()}
            </p>
            <p className="text-[10px]">
              <strong>Items:</strong>
            </p>
            <ul className="list-disc pl-4 text-[10px]">
              {selectedOrder.items.map((item, index) => (
                <li key={index}>
                  {item.name} ({item.furnitureType}, Qty: {item.quantity})
                  {item.type && <span>, Type: {item.type}</span>}
                </li>
              ))}
            </ul>
            {selectedOrder.status === 'Rejected' && selectedOrder.rejectionReason && (
              <p className="text-[10px]">
                <strong>Reason:</strong> {selectedOrder.rejectionReason}
              </p>
            )}
            <button
              onClick={() => setSelectedOrder(null)}
              className="mt-1.5 w-full px-1.5 py-0.25 bg-indigo-600 text-white text-[10px] rounded-lg hover:bg-indigo-700 hover:shadow-md transition-all duration-200"
              aria-label="Close order details"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;