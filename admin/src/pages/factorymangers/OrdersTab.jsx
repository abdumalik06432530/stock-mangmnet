// src/pages/factorymangers/OrdersTab.jsx
import React, { useState, useMemo } from 'react';

const ORDER_STATUSES = ['Pending', 'Approved', 'Processing', 'Out for Delivery', 'Delivered'];
const DRIVERS = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Lee', 'Tom Brown'];

const MOCK_ORDERS = [
  { id: 1001, customer: 'Acme Corp', items: ['Pump×2', 'Valve×5'], status: 'Pending', driver: null, total: 4850 },
  { id: 1002, customer: 'Beta Ltd', items: ['Beam×10'], status: 'Approved', driver: null, total: 9200 },
  { id: 1003, customer: 'Gamma Tech', items: ['Panel Pro'], status: 'Processing', driver: null, total: 5600 },
  { id: 1004, customer: 'Delta Log', items: ['Motor×3'], status: 'Processing', driver: null, total: 12800 },
  { id: 1005, customer: 'Omega Mfg', items: ['Belt 20m'], status: 'Approved', driver: null, total: 3400 },
];

export default function OrdersTab() {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [selected, setSelected] = useState(null);
  const [driver, setDriver] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const filtered = useMemo(() => orders.filter(o =>
    (o.customer.toLowerCase().includes(search.toLowerCase()) ||
     o.id.toString().includes(search) ||
     (o.driver && o.driver.toLowerCase().includes(search))) &&
    (filter === 'All' || o.status === filter)
  ), [orders, search, filter]);

  const nextStatus = (o) => {
    const idx = ORDER_STATUSES.indexOf(o.status);
    const next = ORDER_STATUSES.slice(idx + 1);
    return o.status === 'Processing' && !o.driver ? next.filter(s => s !== 'Out for Delivery') : next;
  };

  const updateStatus = (id, newStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  const assignDriver = () => {
    if (!driver || !selected) return;
    setOrders(prev => prev.map(o =>
      o.id === selected.id ? { ...o, driver, status: 'Out for Delivery' } : o
    ));
    setDriver('');
  };

  const statusColor = (s) => {
    const map = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-blue-100 text-blue-800',
      'Processing': 'bg-purple-100 text-purple-800',
      'Out for Delivery': 'bg-indigo-100 text-indigo-800',
      'Delivered': 'bg-green-100 text-green-800',
    };
    return map[s] || 'bg-gray-100 text-gray-700';
  };

  return (
    <>
      <script src="https://cdn.tailwindcss.com"></script>

      <div className="min-h-screen bg-gray-50 p-2 md:p-3">
        {/* Tiny Header */}
        <div className="bg-white rounded-xl shadow-sm border p-3 mb-3 flex flex-wrap gap-2 text-xs">
          <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}
            className="flex-1 min-w-[120px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          <select value={filter} onChange={e=>setFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg bg-white">
            <option>All</option>
            {ORDER_STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl mx-auto">
          {/* Left: Tiny Cards */}
          <div className="space-y-2">
            {filtered.map(o => (
              <div key={o.id} onClick={()=>setSelected(o)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-xs
                  ${selected?.id===o.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:shadow-sm'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold">#{o.id} {o.customer}</p>
                    <p className="text-gray-600">{o.items.join(' • ')}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${statusColor(o.status)}`}>
                    {o.status}
                  </span>
                </div>
                <div className="flex justify-between mt-2">
                  <p className="font-bold">${o.total}</p>
                  {o.driver ? 
                    <p className="text-green-600 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>{o.driver}
                    </p> :
                    o.status==='Processing' && <p className="text-red-600 text-[10px] font-bold">No driver</p>
                  }
                </div>
              </div>
            ))}
          </div>

          {/* Right: Tiny Detail */}
          <div className="bg-white rounded-xl shadow-sm border p-4 text-xs">
            {selected ? (
              <>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-base">Order #{selected.id}</h3>
                  <span className={`px-3 py-1 rounded-full font-bold ${statusColor(selected.status)}`}>
                    {selected.status}
                  </span>
                </div>

                <p className="text-gray-700 mb-3">{selected.customer}</p>
                <p className="font-bold text-lg mb-3">${selected.total.toLocaleString()}</p>

                <div className="space-y-2 mb-4">
                  {selected.items.map((it,i)=>(
                    <div key={i} className="bg-gray-50 px-3 py-2 rounded">{it}</div>
                  ))}
                </div>

                {/* Status Change */}
                <select value={selected.status} onChange={e=>updateStatus(selected.id, e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-3 text-xs">
                  <option>{selected.status} (Current)</option>
                  {nextStatus(selected).map(s=><option key={s}>{s}</option>)}
                </select>

                {/* Manual Driver Assignment */}
                {selected.status === 'Processing' && !selected.driver && (
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-lg">
                    <select value={driver} onChange={e=>setDriver(e.target.value)}
                      className="w-full mb-2 px-3 py-2 bg-white/20 rounded text-white">
                      <option value="">Choose driver</option>
                      {DRIVERS.map(d=><option key={d}>{d}</option>)}
                    </select>
                    <button onClick={assignDriver} disabled={!driver}
                      className="w-full py-2 bg-white text-indigo-600 font-bold rounded disabled:opacity-50">
                      Assign & Dispatch
                    </button>
                  </div>
                )}

                {selected.driver && ['Out for Delivery','Delivered'].includes(selected.status) && (
                  <div className="bg-green-600 text-white text-center py-4 rounded-lg font-bold">
                    {selected.status === 'Delivered' ? 'DELIVERED' : 'ON THE WAY'}<br/>
                    <span className="text-lg">{selected.driver}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                Select order
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}