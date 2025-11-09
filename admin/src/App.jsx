import { useEffect, useState } from "react";
import axios from 'axios';
import Navbar from "./components/Navbar";
import FactorySidebar from "./components/factorysidebar";
import Sidebar from "./components/Sidebar";
import ShopSidebar from "./components/ShopSidebar";
import { Routes, Route, useLocation } from "react-router-dom";
import Add from "./pages/Admin/Add";
import List from "./pages/Admin/List";
import Dashboard from "./pages/Admin/dashboard";
import Orders from "./pages/Admin/Orders";
import AdminProfile from "./pages/Admin/AdminProfile";
import Users from "./pages/Admin/Users";
import ShopkeeperDashboard from "./pages/Shoapkeprs/ShopkeeperDashboard";
import DashboardOverview from "./pages/Shoapkeprs/DashboardOverview";
import OrderManagement from "./pages/Shoapkeprs/OrderManagement";
import StockControl from "./pages/Shoapkeprs/StockControl";
import SalesManagement from "./pages/Shoapkeprs/SalesManagement";
import FactoryManagerDashboard from "./pages/factorymangers/FactoryManagerDashboard";
import Drivers from "./pages/factorymangers/Drivers";
import Login from "./components/Login";
// AdminRegister not used; removed to avoid unused import warning
import Register from "./components/Register";
import AccessoriesPage from "./pages/Admin/AccessoriesPage";
import ItemRequests from "./pages/Admin/ItemRequests";
import RequestItem from "./pages/Shoapkeprs/RequestItem";
// import SuperAdminDashboard from "./pages/superAdmin/superadmin";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  const [token, setToken] = useState(
    localStorage.getItem("token") ? localStorage.getItem("token") : ""
  );

  const location = useLocation();

  // Resolve current shopId from localStorage/user (used for shopkeeper pages)
  const shopId = (() => {
    try {
      const u = localStorage.getItem('user');
      const user = u ? JSON.parse(u) : null;
      if (user && user.shops && user.shops.length > 0) return (user.shops[0] && user.shops[0]._id) || user.shops[0];
    } catch (e) {
      // ignore
    }
    return localStorage.getItem('shopId') || '';
  })();

  // Removed getRoleFromToken as superadmin logic is no longer needed

  useEffect(() => {
    localStorage.setItem("token", token);
    console.log("Token set to: ", token);
  }, [token]);

  // Configure axios default Authorization header when token changes so
  // all components automatically send the bearer token.
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common = axios.defaults.headers.common || {};
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.defaults.headers.post = axios.defaults.headers.post || {};
      axios.defaults.headers.post['Content-Type'] = 'application/json';
    } else {
      try { delete axios.defaults.headers.common['Authorization']; } catch (e) { console.warn('Failed to remove default auth header', e); }
    }
  }, [token]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <ToastContainer />
      {token === "" ? (
        <Routes>
          <Route path="/register" element={<Register setToken={setToken} />} />
          <Route path="/*" element={<Login setToken={setToken} />} />
        </Routes>
      ) : (
        <>
          <Navbar setToken={setToken} />
          <hr />
          <div className="flex w-full">
            {/* Choose sidebar based on current path: admin pages use Sidebar, factory/shop pages use FactorySidebar */}
            {(() => {
              const p = location?.pathname || '';
              // shopkeeper pages use ShopSidebar; factory and /shops routes use FactorySidebar; admin uses main Sidebar
              if (p.startsWith('/shopkeepers')) return <ShopSidebar shopId={shopId} />;
              const useFactory = p.startsWith('/shops') || p.startsWith('/factory');
              return useFactory ? <FactorySidebar /> : <Sidebar />;
            })()}

            <div className="w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base">
              <Routes>
                <Route path="/add" element={<Add token={token} />} />
                <Route path="/list" element={<List token={token} />} />
                <Route path="/orders" element={<Orders token={token} />} />
                <Route path="/profile" element={<AdminProfile token={token} />} />
                <Route path="/dashboard" element={<Dashboard token={token} />} />
                <Route path="/users" element={<Users token={token} />} />
                <Route path="/admin/accessories/:productId" element={<AccessoriesPage />} />
                <Route path="/admin/item-requests" element={<ItemRequests token={token} />} />
                <Route path="/shopkeepers" element={<ShopkeeperDashboard token={token} shopId={shopId} />} />
                <Route path="/shopkeepers/dashboard" element={<DashboardOverview token={token} shopId={shopId} />} />
                <Route path="/shopkeepers/orders" element={<OrderManagement token={token} shopId={shopId} />} />
                <Route path="/shopkeepers/stock" element={<StockControl token={token} shopId={shopId} />} />
                <Route path="/shopkeepers/request-item" element={<RequestItem token={token} shopId={shopId} />} />
                <Route path="/shopkeepers/sales" element={<SalesManagement token={token} shopId={shopId} />} />
                <Route path="/factory" element={<FactoryManagerDashboard token={token} />} />
                <Route path="/shops/dashboard" element={<FactoryManagerDashboard token={token} />} />
                <Route path="/shops/orders" element={<FactoryManagerDashboard token={token} />} />
                <Route path="/shops/stock-management" element={<FactoryManagerDashboard token={token} />} />
                <Route path="/shops/drivers" element={<Drivers token={token} />} />
              </Routes>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
