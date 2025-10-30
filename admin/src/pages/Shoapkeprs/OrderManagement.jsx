import React, { useState, useEffect } from 'react';
import { Package, X } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { backendUrl } from '../../config'; // Adjust path to your config
import shopkeeperSim from '../../utils/shopkeeperSim'; // Mock simulator
import sanitizeMessage from '../../utils/sanitizeMessage'; // Utility for sanitizing messages

const OrderManagement = ({ token, shopId }) => {
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
  const [accessoryQuantities, setAccessoryQuantities] = useState({});
  const [type, setType] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);

  // State for orders
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Predefined categories for non-custom selection
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
        // fallback to general orders endpoint when shopId is not available
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
        setAccessoryQuantities(product.accessoryQuantities || {});
        setType(product.type || '');
        setIsCustomCategory(product.category === 'Others');
      }
    } else {
      setCategory('');
      setSubCategory('');
      setAccessoryQuantities({});
      setType('');
      setIsCustomCategory(false);
    }
  }, [selectedProductId, products]);

  // Reset accessories and type when category changes
  useEffect(() => {
    if (category !== 'Chair') {
      setAccessoryQuantities({});
    }
    if (category === 'Chair') {
      setType('');
    }
    if (category !== 'Others') {
      setIsCustomCategory(false);
    }
  }, [category]);

  const handleAccessoryChange = (acc, value) => {
    setAccessoryQuantities((prev) => ({
      ...prev,
      [acc]: value ? parseInt(value, 10) : '',
    }));
  };

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
        accessories: category === 'Chair' ? accessoryQuantities : undefined,
        type: category !== 'Chair' && !isCustomCategory ? type : undefined,
      };

      // Map UI item to server Order shape
      const orderToSend = {
        shop: shopId || undefined,
        furnitureType: item.furnitureType,
        type: item.type || item.category,
        backModel: item.category === 'Chair' ? (product?.subCategory || item.name) : undefined,
        headrest: Boolean((item.accessories && (item.accessories.Headrest || item.accessories.headrest)) || false),
        quantity: item.quantity,
        status: 'Pending',
        shopkeeper: (() => { try { const u = localStorage.getItem('user'); const user = u ? JSON.parse(u) : null; return (user && (user.username || user._id)) || ''; } catch { return ''; } })(),
        createdAt: new Date().toISOString(),
      };

      const response = await axios.post(`${backendUrl}/api/orders`, orderToSend, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (response.data.success) {
        toast.success('Order submitted successfully');
        // Reset form
        setSelectedProductId('');
        setQuantity(1);
        setCategory('');
        setSubCategory('');
        setAccessoryQuantities({});
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
                accessories: category === 'Chair' ? accessoryQuantities : undefined,
                type: category !== 'Chair' && !isCustomCategory ? type : undefined,
              },
            ],
          });
          toast.success(`Order submitted (sim): ${simOrder._id}`);
          setSelectedProductId('');
          setQuantity(1);
          setCategory('');
          setSubCategory('');
          setAccessoryQuantities({});
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-gray-50 to-purple-50 p-6 md:p-12">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-4xl font-extrabold text-gray-900">Order Management</h2>
            <p className="text-gray-600">Record and track factory orders</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-orange-50 px-4 py-2 rounded-lg">
              <span className="text-orange-800 font-medium">
                {pendingOrders.length} Pending Orders
              </span>
            </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Form */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <form
            onSubmit={submitOrder}
            className="max-w-4xl mx-auto p-8 bg-white rounded-2xl shadow-xl border border-gray-100 transition-all duration-300"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <span className="text-indigo-600">➕</span> Create New Order
            </h3>

            <div className="space-y-6">
              {/* Product Selection */}
              <div>
                <label htmlFor="product" className="block mb-2 text-sm font-semibold text-gray-700">
                  Select Product
                </label>
                <select
                  id="product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <label htmlFor="category" className="block mb-2 text-sm font-semibold text-gray-700">
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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
                <label htmlFor="subcategory" className="block mb-2 text-sm font-semibold text-gray-700">
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Custom subcategory"
                  />
                ) : (
                  <select
                    id="subcategory"
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    required
                    disabled={selectedProductId && !isCustomCategory}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
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
                <label htmlFor="quantity" className="block mb-2 text-sm font-semibold text-gray-700">
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Order quantity"
                />
              </div>

              {/* Chair Accessories: removed per request — only overall quantity is required */}

              {/* Type for Non-Chair */}
              {category && category !== 'Chair' && !isCustomCategory && (
                <div>
                  <label htmlFor="type" className="block mb-2 text-sm font-semibold text-gray-700">
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    aria-label="Item type"
                  />
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Submit order"
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
                    Submitting Order...
                  </span>
                ) : (
                  <>
                    <span>➕</span> Submit Order
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-center text-gray-500">No recent orders</p>}
            {orders.slice(0, 5).map((order) => (
              <div key={order._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Order #{order._id.slice(-6)}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
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
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                    aria-label={`View details for order ${order._id}`}
                  >
                    Details
                  </button>
                  {(order.status || '').toLowerCase() === 'pending' && (
                    <button
                      onClick={() => cancelOrder(order._id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 text-sm disabled:opacity-50"
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
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Order #{selectedOrder._id.slice(-6)}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close order details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p>
              <strong>Status:</strong> {selectedOrder.status}
            </p>
            <p>
              <strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleDateString()}
            </p>
            <p>
              <strong>Items:</strong>
            </p>
            <ul className="list-disc pl-5">
              {selectedOrder.items.map((item, index) => (
                <li key={index}>
                  {item.name} ({item.furnitureType}, Qty: {item.quantity})
                  {item.accessories && (
                    <ul className="list-circle pl-5">
                      {Object.entries(item.accessories).map(([acc, qty]) =>
                        qty > 0 ? (
                          <li key={acc}>
                            {acc}: {qty}
                          </li>
                        ) : null
                      )}
                    </ul>
                  )}
                  {item.type && <span>, Type: {item.type}</span>}
                </li>
              ))}
            </ul>
            {selectedOrder.status === 'Rejected' && selectedOrder.rejectionReason && (
              <p>
                <strong>Rejection Reason:</strong> {selectedOrder.rejectionReason}
              </p>
            )}
            <button
              onClick={() => setSelectedOrder(null)}
              className="mt-4 w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
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