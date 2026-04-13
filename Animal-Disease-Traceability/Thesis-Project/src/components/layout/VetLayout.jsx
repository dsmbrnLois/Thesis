import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import "../../assets/styles/App.css";

// Vet-Specific Icons
const HealthIcon = () => <span>💉</span>;
const AlertIcon = () => <span>📢</span>;
const DashboardIcon = () => <span>📊</span>;
const PermitIcon = () => <span>🚑</span>;
const LogoutIcon = () => <span>🚪</span>;
const ProfileIcon = () => <span>👤</span>;

export default function VetLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.includes(path)
      ? "bg-white text-[var(--green)] shadow-md"
      : "text-white hover:bg-white/10 hover:shadow-sm";

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-green-50 overflow-hidden">
      
      {/* MOBILE HEADER */}
      <header className="lg:hidden bg-[var(--green)] text-white px-6 py-4 flex justify-between items-center shadow-md z-50">
        <div>
          {/* Typography: Black weight and Tighter tracking */}
          <h1 className="text-xl font-black tracking-tighter">Vet Portal</h1>
          <p className="text-[var(--light-green)] text-xs font-bold tracking-[0.2em] uppercase mt-0.5 opacity-90">Santa Rosa City</p>
        </div>

        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex flex-col gap-1.5 focus:outline-none">
          <div className={`w-7 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
          <div className={`w-7 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0 scale-0' : ''}`}></div>
          <div className={`w-7 h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
        </button>
      </header>

      {/* SIDEBAR */}
      <aside className={`
        fixed lg:relative inset-x-0 top-0 lg:top-auto
        lg:w-72 lg:flex lg:flex-col lg:shadow-xl
        bg-[var(--green)] text-white 
        flex flex-col z-40 h-full
        transition-all duration-500 ease-in-out
        ${isMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 lg:opacity-100 lg:translate-y-0"}
      `}>
        {/* Desktop Logo / Header - Typography Enhancement */}
        <div className="hidden lg:block p-8 border-b border-green-700/40">
          <h1 className="text-2xl font-black tracking-tighter">Vet Portal</h1>
          <p className="text-[var(--light-green)] text-xs font-bold uppercase tracking-[0.2em] mt-1 opacity-90">Santa Rosa City</p>
        </div>

        <nav className="flex-1 p-6 lg:p-5 space-y-2 mt-16 lg:mt-0 overflow-y-auto">
          {/* Links - Typography Enhancement: font-bold + tracking-tight
              Links - Refined Hover: Subtle white/10 overlay
          */}
          <Link 
            to="/vet/profile" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 font-bold text-base tracking-tight ${isActive("/vet/profile")}`}
          >
            <span className="text-2xl">👤</span>
            <span>My Profile</span>
          </Link>

          <Link 
            to="/vet/dashboard" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 font-bold text-base tracking-tight ${isActive("/vet/dashboard")}`}
          >
            <span className="text-2xl">📊</span>
            <span>Dashboard</span>
          </Link>

          <Link 
            to="/vet/health-records" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 font-bold text-base tracking-tight ${isActive("/vet/health-records")}`}
          >
            <span className="text-2xl">💉</span>
            <span>Health Records</span>
          </Link>

          <Link 
            to="/vet/transactions" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 font-bold text-base tracking-tight ${isActive("/vet/transactions")}`}
          >
            <span className="text-2xl">📢</span>
            <span>Reports</span>
          </Link>

          <Link 
            to="/vet/movement-permits" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 font-bold text-base tracking-tight ${isActive("/vet/movement-permits")}`}
          >
            <span className="text-2xl">🚑</span>
            <span>Movement Permits</span>
          </Link>
        </nav>

        {/* FOOTER */}
        <div className="p-6 border-t border-green-700/40 bg-black/10">      
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 bg-red-600/90 hover:bg-red-700 text-white py-3.5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-md active:scale-95"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" 
          onClick={() => setIsMenuOpen(false)} 
        />
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pt-4 lg:pt-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}