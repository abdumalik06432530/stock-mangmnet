import { useEffect, useState } from 'react';
import SHOPKEEPER_SYSTEM_PROMPT from '../../config/shopkeeperPrompt';
// lightweight id generator (avoids adding external uuid dependency)
const genId = () => `id_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

// Simple parser-based assistant for shopkeeper commands. Stores simulated state in localStorage per shopId.
const STORAGE_PREFIX = 'shopkeeper_sim_';


const loadState = (shopId) => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + shopId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
};

const saveState = (shopId, state) => {
  try { localStorage.setItem(STORAGE_PREFIX + shopId, JSON.stringify(state)); } catch (e) { console.error('saveState error', e); }
};

const ShopkeeperAssistant = ({ shopId }) => {
  const [promptText] = useState(SHOPKEEPER_SYSTEM_PROMPT);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);
  const [state, setState] = useState(() => {
    const s = loadState(shopId);
    if (s) return s;
    // initial simulated state
    return {
      stock: { 'type A': 5, 'type B': 2 },
      orders: [],
      sales: [],
      deliveries: []
    };
  });

  useEffect(() => { saveState(shopId, state); }, [shopId, state]);

  const appendHistory = (role, text) => {
    setHistory(h => [...h, { id: genId(), role, text, date: new Date().toISOString() }]);
  };

  const placeOrder = (qty, type, withHeadrest) => {
    const orderId = `ORD-${Date.now()}`;
    const order = { id: orderId, qty, type, withHeadrest: !!withHeadrest, status: 'placed', createdAt: new Date().toISOString() };
    setState(s => ({ ...s, orders: [order, ...s.orders] }));
    appendHistory('assistant', `Order placed: ${orderId} — ${qty} chairs (${type})${withHeadrest ? ' with headrest' : ''}. Sent to factory.`);
    return order;
  };

  const simulateDelivery = (orderId) => {
    const ord = state.orders.find(o => o.id === orderId);
    if (!ord) { appendHistory('assistant', 'Order not found'); return; }
    // update shop stock
    setState(s => {
      const newStock = { ...s.stock };
      newStock[ord.type] = (newStock[ord.type] || 0) + ord.qty;
      const newOrders = s.orders.map(o => o.id === orderId ? { ...o, status: 'delivered', deliveredAt: new Date().toISOString() } : o);
      const delivery = { id: `DLV-${Date.now()}`, orderId: ord.id, qty: ord.qty, type: ord.type, date: new Date().toISOString() };
      return { ...s, stock: newStock, orders: newOrders, deliveries: [delivery, ...s.deliveries] };
    });
    appendHistory('assistant', `Delivery received for ${orderId}: Shop stock for ${ord.type} now ${ (state.stock[ord.type] || 0) + ord.qty }.`);
  };

  const addSale = ({ qty, type, customer }) => {
    const available = state.stock[type] || 0;
    if (available < qty) { appendHistory('assistant', `Not enough stock for ${type}. Available ${available}, requested ${qty}.`); return null; }
    const saleId = `SALE-${Date.now()}`;
    const sale = { id: saleId, qty, type, customer, date: new Date().toISOString() };
    setState(s => ({ ...s, stock: { ...s.stock, [type]: (s.stock[type] || 0) - qty }, sales: [sale, ...s.sales] }));
    appendHistory('assistant', `Sale recorded: ${saleId}. ${qty} x ${type} sold to ${customer.name}. Updated stock: ${(state.stock[type] || 0) - qty}`);
    return sale;
  };

  const handleCommand = (raw) => {
    const cmd = raw.trim();
    if (!cmd) return;
    appendHistory('user', cmd);

    // Simple parsing rules
    // 1) Order: e.g., "Order 5 chairs type A (with headrest)"
    const orderMatch = cmd.match(/order\s+(\d+)\s+chairs?\s*(?:type\s+([A-Za-z0-9\- ]+))?\s*(?:\(with headrest\))?/i);
    if (orderMatch) {
      const qty = Number(orderMatch[1]);
      const type = (orderMatch[2] || 'type A').trim();
      const withHeadrest = /with headrest/i.test(cmd);
      placeOrder(qty, type, withHeadrest);
      setInput('');
      return;
    }

    // 2) Simulate delivery: "deliver ORD-..." or "simulate delivery ORD-..."
    const deliverMatch = cmd.match(/(?:deliver|delivery|simulate delivery)\s+(ORD-\d+)/i);
    if (deliverMatch) {
      const oid = deliverMatch[1];
      simulateDelivery(oid);
      setInput('');
      return;
    }

    // 3) Add sale: "Add sale: 2 chairs type A to customer John Doe, address 123 Main St, phone 555-1234"
    const saleMatch = cmd.match(/add sale[:]?\s*(\d+)\s+chairs?\s*(?:type\s+([A-Za-z0-9\- ]+))?\s*to customer\s+([^,]+),\s*address\s+([^,]+),\s*phone\s+([0-9\-+ ]+)/i);
    if (saleMatch) {
      const qty = Number(saleMatch[1]);
      const type = (saleMatch[2] || 'type A').trim();
      const name = saleMatch[3].trim();
      const address = saleMatch[4].trim();
      const phone = saleMatch[5].trim();
      addSale({ qty, type, customer: { name, address, phone } });
      setInput('');
      return;
    }

    appendHistory('assistant', 'Invalid shopkeeper command.');
    setInput('');
  };

  return (
    <div className="bg-white p-4 rounded shadow">
      <h3 className="text-lg font-semibold mb-2">Shopkeeper Assistant</h3>
      <p className="text-xs text-gray-500 mb-3">System prompt:
        <span className="block whitespace-pre-wrap bg-gray-50 p-2 rounded text-xs mt-2">{promptText}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="p-3 border rounded">
          <h4 className="font-medium">Shop Stock</h4>
          <ul className="text-sm mt-2">
            {Object.entries(state.stock).map(([k,v]) => (
              <li key={k}>{k}: {v}</li>
            ))}
          </ul>
        </div>
        <div className="p-3 border rounded">
          <h4 className="font-medium">Recent Orders</h4>
          <ul className="text-sm mt-2">
            {state.orders.slice(0,5).map(o => <li key={o.id}>{o.id} — {o.qty} x {o.type} — {o.status}</li>)}
          </ul>
        </div>
      </div>

      <div className="mb-3">
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Enter shopkeeper command..." className="w-full border rounded px-2 py-2" />
        <div className="flex gap-2 mt-2">
          <button onClick={() => handleCommand(input)} className="px-3 py-1 bg-indigo-600 text-white rounded">Run Command</button>
          <button onClick={() => { setInput(''); setHistory([]); }} className="px-3 py-1 bg-gray-200 rounded">Clear</button>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto border rounded p-2">
        {history.map(h => (
          <div key={h.id} className="mb-2">
            <div className="text-xs text-gray-400">{new Date(h.date).toLocaleString()} — {h.role}</div>
            <div className={`p-2 rounded ${h.role === 'user' ? 'bg-indigo-50 text-indigo-900' : 'bg-green-50 text-green-900'}`}>{h.text}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <h4 className="font-medium">Quick actions</h4>
        <div className="flex gap-2 mt-2 flex-wrap">
          {state.orders.map(o => (
            <button key={o.id} onClick={() => simulateDelivery(o.id)} className="px-2 py-1 bg-green-600 text-white rounded text-sm">Simulate Delivery {o.id}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShopkeeperAssistant;
