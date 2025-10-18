import React, { useState, useEffect } from 'react';
import { ShoppingCart, User, MapPin, Phone, Plus, Minus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const SalesManagement = ({ token, shopId }) => {
  const [cart, setCart] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [customerDetails, setCustomerDetails] = useState({
    firstName: '',
    lastName: '',
    address: '',
    phone: '',
    email: ''
  });
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAvailableItems();
    fetchSalesHistory();
  }, [shopId]);

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

  const fetchSalesHistory = async () => {
    try {
      // Simulated sales history
      setSalesHistory([
        {
          id: 'S001',
          customer: { firstName: 'John', lastName: 'Doe' },
          items: [{ name: 'Chair Type A', quantity: 2 }],
          total: 400,
          date: '2024-01-15',
          status: 'Completed'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch sales history');
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
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => prev.map(item => 
      item._id === itemId ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    toast.info('Cart cleared');
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price || 200) * item.quantity, 0);
  };

  const processSale = async () => {
    if (cart.length === 0) {
      toast.info('Please add items to cart');
      return;
    }

    if (!customerDetails.firstName || !customerDetails.phone) {
      toast.error('Customer first name and phone are required');
      return;
    }

    setLoading(true);
    try {
      const saleData = {
        shopId,
        customer: customerDetails,
        items: cart.map(item => ({
          itemId: item._id,
          quantity: item.quantity,
          furnitureType: item.furnitureType,
          withHeadrest: item.withHeadrest,
          price: item.price || 200
        })),
        total: calculateTotal()
      };

      await axios.post('/api/sales', saleData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Sale recorded successfully');
      setCart([]);
      setCustomerDetails({
        firstName: '',
        lastName: '',
        address: '',
        phone: '',
        email: ''
      });
      fetchSalesHistory();
    } catch (error) {
      toast.error('Failed to process sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Sales Management</h2>
            <p className="text-gray-600">Process customer sales and manage transactions</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-green-50 px-4 py-2 rounded-lg">
              <span className="text-green-800 font-medium">
                Today's Sales: ${salesHistory.reduce((sum, sale) => sum + sale.total, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Available Items */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Items</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {availableItems.map(item => (
              <div key={item._id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div>
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-sm text-gray-500">
                    {item.furnitureType} • {item.withHeadrest ? 'With Headrest' : 'No Headrest'}
                  </p>
                  <p className="text-sm font-medium text-indigo-600">${item.price || 200}</p>
                </div>
                <button
                  onClick={() => addToCart(item)}
                  className="flex items-center space-x-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Cart & Customer Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Cart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Current Sale</h3>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear Cart</span>
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>No items in cart</p>
                <p className="text-sm">Add items from the available items list</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <img
                        src={item.image?.[0] || '/placeholder-image.jpg'}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-500">{item.furnitureType}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-12 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item._id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">
                          ${((item.price || 200) * item.quantity).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">${item.price || 200} each</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item._id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Cart Total */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Total:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Customer Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 text-gray-400 mr-2" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={customerDetails.firstName}
                  onChange={(e) => setCustomerDetails({...customerDetails, firstName: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={customerDetails.lastName}
                  onChange={(e) => setCustomerDetails({...customerDetails, lastName: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Doe"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  Address
                </label>
                <input
                  type="text"
                  value={customerDetails.address}
                  onChange={(e) => setCustomerDetails({...customerDetails, address: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  Phone *
                </label>
                <input
                  type="tel"
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails({...customerDetails, email: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="john.doe@example.com"
                />
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={processSale}
                disabled={loading}
                className="w-full mt-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
              >
                {loading ? 'Processing Sale...' : `Complete Sale - $${calculateTotal().toFixed(2)}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesManagement;