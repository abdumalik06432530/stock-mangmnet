// Simple in-browser simulator for shopkeeper actions.
// Stores state in localStorage under key 'shopkeeper_sim_v1'.
const LS_KEY = 'shopkeeper_sim_v1';

function nowId(prefix = 'ID') {
  return `${prefix}${Date.now().toString(36)}`;
}

function getState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { shops: {} };
    return JSON.parse(raw);
  } catch (e) {
    return { shops: {} };
  }
}

function setState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function ensureShop(shopId) {
  const state = getState();
  if (!state.shops) state.shops = {};
  if (!state.shops[shopId]) {
    // default sample stock
    state.shops[shopId] = {
      stock: {
        chair_withHeadrest: 10,
        chair_noHeadrest: 8,
        table_standard: 5,
      },
      orders: [],
      sales: [],
      stats: { deliveries: 0, salesCount: 0 }
    };
    setState(state);
  }
  return state.shops[shopId];
}

export function getStock(shopId) {
  const shop = ensureShop(shopId);
  return { ...shop.stock };
}

export function getOrders(shopId) {
  const shop = ensureShop(shopId);
  return [...shop.orders];
}

export function getSales(shopId) {
  const shop = ensureShop(shopId);
  return [...shop.sales];
}

export function placeFactoryOrder(shopId, orderData) {
  // orderData: { items: [{ furnitureType, quantity, withHeadrest, itemId? }] }
  const state = getState();
  if (!state.shops) state.shops = {};
  const shop = ensureShop(shopId);
  const order = {
    _id: nowId('O'),
    shopId,
    items: orderData.items || [],
    status: 'Pending',
    createdAt: new Date().toISOString()
  };
  state.shops[shopId].orders.unshift(order);
  setState(state);
  return order;
}

export function confirmDelivery(shopId, orderId) {
  const state = getState();
  const shop = ensureShop(shopId);
  const orders = state.shops[shopId].orders;
  const idx = orders.findIndex(o => o._id === orderId);
  if (idx === -1) return null;
  const ord = orders[idx];
  if (ord.status === 'Delivered') return ord;
  // Mark delivered
  ord.status = 'Delivered';
  ord.deliveredAt = new Date().toISOString();
  // Update stock: each item in order increments corresponding stock key
  ord.items.forEach(it => {
    const key = `${it.furnitureType}${it.withHeadrest ? '_withHeadrest' : '_noHeadrest'}`;
    if (!state.shops[shopId].stock[key]) state.shops[shopId].stock[key] = 0;
    state.shops[shopId].stock[key] += (it.quantity || 0);
  });
  // update stats
  state.shops[shopId].stats.deliveries = (state.shops[shopId].stats.deliveries || 0) + 1;
  setState(state);
  return ord;
}

export function recordSale(shopId, saleData) {
  // saleData: { customer, items: [{ furnitureType, quantity, withHeadrest, price }], total }
  const state = getState();
  ensureShop(shopId);
  const shop = state.shops[shopId];
  // Check stock sufficiency
  for (const it of saleData.items) {
    const key = `${it.furnitureType}${it.withHeadrest ? '_withHeadrest' : '_noHeadrest'}`;
    const available = shop.stock[key] || 0;
    if (available < (it.quantity || 0)) {
      throw new Error(`Insufficient stock for ${key}`);
    }
  }
  // Deduct
  saleData.items.forEach(it => {
    const key = `${it.furnitureType}${it.withHeadrest ? '_withHeadrest' : '_noHeadrest'}`;
    shop.stock[key] = (shop.stock[key] || 0) - (it.quantity || 0);
  });
  const sale = {
    _id: nowId('S'),
    shopId,
    customer: saleData.customer,
    items: saleData.items,
    total: saleData.total || 0,
    createdAt: new Date().toISOString(),
    status: 'Completed'
  };
  shop.sales.unshift(sale);
  shop.stats.salesCount = (shop.stats.salesCount || 0) + 1;
  setState(state);
  return sale;
}

export function getSummary(shopId) {
  const shop = ensureShop(shopId);
  const lowStockItems = Object.values(shop.stock).filter(q => q < 5).length;
  const totalOrders = shop.orders.length;
  const pendingOrders = shop.orders.filter(o => o.status === 'Pending').length;
  const totalSales = shop.sales.reduce((s, sale) => s + (sale.total || 0), 0);
  const customerCount = 0; // not tracked in simulator
  return {
    totalOrders,
    pendingOrders,
    totalSales,
    lowStockItems,
    customerCount,
    recentActivity: [
      ...shop.sales.slice(0,3).map(s => ({ type: 'sale', description: `Sold ${s.items.reduce((a,i)=>a+i.quantity,0)} items`, time: 'recent', amount: s.total })),
      ...shop.orders.slice(0,3).map(o => ({ type: 'order', description: `Order ${o._id} placed`, time: 'recent', items: o.items.length })),
    ]
  };
}

export default {
  getStock,
  getOrders,
  getSales,
  placeFactoryOrder,
  confirmDelivery,
  recordSale,
  getSummary
};
