import React, { useState, useEffect } from 'react';
import { Package, Truck, Plus, Search } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const OrderManagement = ({ token, shopId }) => {
  const [orders, setOrders] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchAvailableItems();
  }, [shopId]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`/api/shops/${shopId}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      toast.error('Failed to fetch orders');
    }
  };

  const fetchAvailableItems = async () => {
    try {
      const response = await axios.get('/api/items', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableItems(response.data.items || []);
    } catch (error) {
      toast.error('Failed to fetch available items');
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i._id === item._id);
      if (existing) {
        return prev.map(i => 
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item._id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(item => 
      item._id === itemId ? { ...item, quantity } : item
    ));
  };

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.info('Please add items to cart');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        shopId,
        items: cart.map(item => ({
          itemId: item._id,
          quantity: item.quantity,
          furnitureType: item.furnitureType,
          withHeadrest: item.withHeadrest
        }))
      };

      await axios.post('/api/orders', orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Order submitted successfully');
      setCart([]);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to submit order');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const pendingOrders = orders.filter(order => order.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
            <p className="text-gray-600">Manage factory orders and track deliveries</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Items */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Available Items</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredItems.map(item => (
              <div key={item._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-4">
                  <img
                    src={item.image?.[0] || '/placeholder-image.jpg'}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    <p className="text-sm text-gray-500">
                      {item.furnitureType} • {item.withHeadrest ? 'With Headrest' : 'No Headrest'}
                    </p>
                    <p className="text-sm font-medium text-indigo-600">Stock: {item.quantity}</p>
                  </div>
                </div>
                <button
                  onClick={() => addToCart(item)}
                  className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cart & Order Summary */}
        <div className="space-y-6">
          {/* Cart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Order Cart</h3>
              <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-medium">
                {totalCartItems} items
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>Your cart is empty</p>
                <p className="text-sm">Add items from the available items list</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cart.map(item => (
                  <div key={item._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-500">{item.furnitureType}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {cart.length > 0 && (
              <button
                onClick={submitOrder}
                disabled={loading}
                className="w-full mt-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting Order...' : 'Submit Order to Factory'}
              </button>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
            <div className="space-y-3">
              {orders.slice(0, 5).map(order => (
                <div key={order._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Order #{order._id.slice(-6)}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;