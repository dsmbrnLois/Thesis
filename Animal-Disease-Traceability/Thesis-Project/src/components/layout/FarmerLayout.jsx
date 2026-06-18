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

  const isActive = (path) =>
    location.pathname === path || location.pathname.includes(path);

  const navLinkClasses = (path) =>
    `px-4 py-3 flex items-center gap-3 transition-colors tap-target ${
      isActive(path)
        ? "border-l-4 border-primary bg-surface-container-high text-primary font-bold"
        : "text-on-surface-variant hover:bg-surface-container-highest border-l-4 border-transparent"
    }`;

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-surface font-body overflow-hidden">

      {/* ── Mobile Header ── */}
      <header className="lg:hidden bg-surface-bright text-on-surface px-lg py-4 flex justify-between items-center border-b border-outline-variant z-50">
        <div>
          <h1 className="font-display text-headline-md font-bold text-primary">Farmer Portal</h1>
          <p className="font-mono text-label-caps text-on-surface-variant opacity-70 uppercase">Veterinary Oversight</p>
        </div>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-primary">
          <span className="material-symbols-outlined text-[28px]">{isMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </header>

      {/* ── Clinical White Sidebar ── */}
      <aside className={`
        fixed lg:relative inset-x-0 top-0 lg:top-auto
        lg:w-sidebar lg:flex lg:flex-col
        bg-surface border-r border-outline-variant
        flex flex-col z-40 h-full overflow-y-auto
        transition-all duration-500 ease-in-out
        ${isMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 lg:opacity-100 lg:translate-y-0"}
      `}>
        {/* Desktop Header */}
        <div className="hidden lg:block p-lg">
          <h1 className="font-display text-headline-md font-bold text-primary">Farmer Portal</h1>
          <p className="font-mono text-label-caps text-on-surface-variant opacity-70 uppercase">Veterinary Oversight</p>
        </div>

        <nav className="flex-1 px-sm mt-16 lg:mt-0">
          <Link to="/farmer/livestock" onClick={() => setIsMenuOpen(false)} className={navLinkClasses("/farmer/livestock")}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>pets</span>
            <span className="font-body text-body-md">Livestock Records</span>
          </Link>
          <Link to="/farmer/logistics" onClick={() => setIsMenuOpen(false)} className={navLinkClasses("/farmer/logistics")}>
            <span className="material-symbols-outlined">local_shipping</span>
            <span className="font-body text-body-md">Logistics</span>
          </Link>
          <Link to="/farmer/profile" onClick={() => setIsMenuOpen(false)} className={navLinkClasses("/farmer/profile")}>
            <span className="material-symbols-outlined">person</span>
            <span className="font-body text-body-md">My Profile</span>
          </Link>
        </nav>

        {/* CTA + Footer */}
        <div className="p-lg mt-auto">
          <button className="w-full bg-primary text-on-primary font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-opacity hover:opacity-90 tap-target">
            <span className="material-symbols-outlined">add_circle</span>
            <span>New Report</span>
          </button>
          <div className="mt-lg border-t border-outline-variant pt-md">
            <a href="#" className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-highest transition-colors tap-target">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-body text-body-md">Settings</span>
            </a>
            <button
              onClick={handleLogout}
              className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-highest transition-colors tap-target w-full text-left"
            >
              <span className="material-symbols-outlined">logout</span>
              <span className="font-body text-body-md">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile Overlay ── */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-y-auto pt-4 lg:pt-0">
        <div className="max-w-7xl mx-auto p-lg">
          <Outlet />
        </div>
      </main>
    </div>
  );
}