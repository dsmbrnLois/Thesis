import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import "../../assets/styles/App.css";

export default function FarmerLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : { firstName: "Farmer", lastName: "", role: "Farmer" };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  /**
   * REFINED HOVER LOGIC:
   * Active: White background with green text.
   * Hover: Subtle transparent white overlay (white/10) to keep text readable.
   */
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
          <h1 className="text-xl font-black tracking-tighter">Farmer Portal</h1>
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
          <h1 className="text-2xl font-black tracking-tighter">Farmer Portal</h1>
          <p className="text-[var(--light-green)] text-xs font-bold uppercase tracking-[0.2em] mt-1 opacity-90">Santa Rosa City</p>
        </div>

        <nav className="flex-1 p-6 lg:p-5 space-y-2 mt-16 lg:mt-0 overflow-y-auto">
          {/* Links - Typography Enhancement: font-bold + tracking-tight */}
          <Link 
            to="/farmer/profile" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 font-bold text-base tracking-tight ${isActive("/farmer/profile")}`}
          >
            <span className="text-2xl">👤</span>
            <span>My Profile</span>
          </Link>

          <Link 
            to="/farmer/livestock" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 font-bold text-base tracking-tight ${isActive("/farmer/livestock")}`}
          >
            <span className="text-2xl">🐷</span>
            <span>My Livestock</span>
          </Link>

          <Link 
            to="/farmer/logistics" 
            onClick={() => setIsMenuOpen(false)} 
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-200 font-bold text-base tracking-tight ${isActive("/farmer/logistics")}`}
          >
            <span className="text-2xl">🚚</span>
            <span>Logistics</span>
          </Link>
        </nav>

        {/* FOOTER */}
        <div className="p-6 border-t border-green-700/40 bg-black/10">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 bg-red-600/90 hover:bg-red-700 text-white py-3.5 rounded-2xl font-bold text-sm uppercase tracking-widest transition-all shadow-md hover:shadow-lg active:scale-95"
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