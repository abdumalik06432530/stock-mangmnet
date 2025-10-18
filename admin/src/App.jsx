import { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import ShopSidebar from "./components/ShopSidebar";
import FactorySidebar from "./components/factorysidebar";
import { Routes, Route } from "react-router-dom";
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
import FactoryManager from "./pages/factorymangers/FactoryManager";
import Login from "./components/Login";
import AdminRegister from "./components/AdminRegister";
import Register from "./components/Register";
// import SuperAdminDashboard from "./pages/superAdmin/superadmin";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const App = () => {
  const [token, setToken] = useState(
    localStorage.getItem("token") ? localStorage.getItem("token") : ""
  );

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
            {/* Render ShopSidebar for shopkeepers, normal Sidebar for admins/others */}
            {(() => {
              try {
                const u = localStorage.getItem('user');
                const user = u ? JSON.parse(u) : null;
                if (user && user.role === 'shopkeeper') {
                  return <ShopSidebar shopId={(user.shops && user.shops[0] && user.shops[0]._id) || (user.shops && user.shops[0]) || ''} onFetchItems={() => {}} onFetchStock={() => {}} onSubmitOrder={() => {}} onFetchOrders={() => {}} onScrollToSales={() => {}} />;
                }
                if (user && user.role === 'factory') {
                  return <FactorySidebar orders={[]} />;
                }
              } catch (e) {
                // ignore
              }
              return <Sidebar />;
            })()}
            <div className="w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base">
              <Routes>
                <Route path="/add" element={<Add token={token} />} />
                <Route path="/list" element={<List token={token} />} />
                <Route path="/orders" element={<Orders token={token} />} />
                <Route path="/profile" element={<AdminProfile token={token} />} />
                <Route
                  path="/dashboard"
                  element={<Dashboard token={token} />}
                />
                <Route path="/users" element={<Users token={token} />} />
                <Route path="/shopkeepers" element={<ShopkeeperDashboard token={token} shopId={shopId} />} />
                <Route path="/shopkeepers/dashboard" element={<DashboardOverview token={token} shopId={shopId} />} />
                <Route path="/shopkeepers/orders" element={<OrderManagement token={token} shopId={shopId} />} />
                <Route path="/shopkeepers/stock" element={<StockControl token={token} shopId={shopId} />} />
                <Route path="/shopkeepers/sales" element={<SalesManagement token={token} shopId={shopId} />} />
                <Route path="/factory" element={<FactoryManager token={token} />} />
              </Routes>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
