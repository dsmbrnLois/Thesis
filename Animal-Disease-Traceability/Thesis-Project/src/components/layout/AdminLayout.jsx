import React from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import "../../assets/styles/App.css";

// Icons
const DashboardIcon = () => <span>📊</span>;
const ReportsIcon = () => <span>📄</span>;
const UsersIcon = () => <span>👥</span>;
const ExitIcon = () => <span>📤</span>;
const LogoutIcon = () => <span>🚪</span>;
const ProfileIcon = () => <span>👤</span>;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/adminlogin");
  };

  /**
   * REFINED HOVER LOGIC:
   * Active: White background with green text.
   * Hover: Subtle transparent white overlay (white/10).
   */
  const isActive = (path) =>
    location.pathname === path || location.pathname.includes(path)
      ? "bg-white text-[var(--green)] shadow-md"
      : "text-white hover:bg-white/10 hover:shadow-sm";

  /**
   * TYPOGRAPHY ENHANCEMENT:
   * font-bold and tracking-tight to match the VetLayout aesthetics.
   */
  const linkBaseClasses = 
    "flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 font-bold text-base tracking-tight mx-3";

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--green)] text-white flex flex-col fixed h-full shadow-xl z-40">
        
        {/* Desktop Logo / Header with Santa Rosa City sub-header */}
        <div className="p-8 border-b border-green-700/40">
          <h1 className="text-2xl font-black tracking-tighter">Admin Portal</h1>
          <p className="text-[var(--light-green)] text-xs font-bold uppercase tracking-[0.2em] mt-1 opacity-90">Santa Rosa City</p>
        </div>

        <nav className="flex-grow mt-5 space-y-2 overflow-y-auto">
          <Link to="/admin/profile" className={`${linkBaseClasses} ${isActive("/admin/profile")}`}>
            <span className="text-2xl">👤</span>
            <span>My Profile</span>
          </Link>

          <Link to="/admin/dashboard" className={`${linkBaseClasses} ${isActive("/admin/dashboard")}`}>
            <DashboardIcon />
            <span>Dashboard</span>
          </Link>

          <Link to="/admin/reports" className={`${linkBaseClasses} ${isActive("/admin/reports")}`}>
            <ReportsIcon />
            <span>Reports Analysis</span>
          </Link>

          <Link to="/admin/user-management" className={`${linkBaseClasses} ${isActive("/admin/user-management")}`}>
            <UsersIcon />
            <span>User Management</span>
          </Link>

          <Link to="/admin/animal-db" className={`${linkBaseClasses} ${isActive("/admin/animal-db")}`}>
            <span className="text-2xl">🗂️</span>
            <span>Animal Database</span>
          </Link>

          <Link to="/admin/transactions" className={`${linkBaseClasses} ${isActive("/admin/transactions")}`}>
            <span className="text-2xl">📝</span>
            <span>Transaction History</span>
          </Link>

          <Link to="/admin/exit-permits" className={`${linkBaseClasses} ${isActive("/admin/exit-permits")}`}>
            <ExitIcon />
            <span>Exit Verification</span>
          </Link>

          <Link to="/admin/alert" className={`${linkBaseClasses} ${isActive("/admin/alert")}`}>
            <span className="text-2xl">🚨</span>
            <span>Send Alert</span>
          </Link>

          <Link to="/admin/network" className={`${linkBaseClasses} ${isActive("/admin/network")}`}>
            <span className="text-2xl">⛓️</span>
            <span>Network Visual</span>
          </Link>
        </nav>

        {/* FOOTER: Updated Sign Out UI */}
        <div className="p-6 border-t border-green-700/40 bg-black/10">      
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 bg-red-600/90 hover:bg-red-700 text-white py-3.5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-md active:scale-95"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-64">
        <header className="bg-white shadow-sm p-4 px-8 flex justify-between items-center z-10">
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">
            Welcome, Admin
          </h1>
        </header>

        <main className="flex-grow p-6 overflow-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}