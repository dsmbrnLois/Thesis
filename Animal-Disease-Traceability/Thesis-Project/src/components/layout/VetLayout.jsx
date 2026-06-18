import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import "../../assets/styles/App.css";

export default function VetLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
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
          <h1 className="font-display text-headline-md font-bold text-primary">ADTS Portal</h1>
          <p className="font-body text-body-md text-on-surface-variant opacity-80">Veterinary Oversight</p>
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
          <div className="font-display text-headline-md font-bold text-primary mb-1">ADTS Portal</div>
          <div className="font-body text-body-md text-on-surface-variant opacity-80">Veterinary Oversight</div>
        </div>

        <nav className="flex-1 flex flex-col px-0 mt-16 lg:mt-0">
          <Link to="/vet/dashboard" onClick={() => setIsMenuOpen(false)} className={navLinkClasses("/vet/dashboard")}>
            <span className="material-symbols-outlined">dashboard</span>
            <span className="font-mono text-label-caps uppercase">Dashboard</span>
          </Link>
          <Link to="/vet/health-records" onClick={() => setIsMenuOpen(false)} className={navLinkClasses("/vet/health-records")}>
            <span className="material-symbols-outlined">health_and_safety</span>
            <span className="font-mono text-label-caps uppercase">Health Reports</span>
          </Link>
          <Link to="/vet/movement-permits" onClick={() => setIsMenuOpen(false)} className={navLinkClasses("/vet/movement-permits")}>
            <span className="material-symbols-outlined">local_shipping</span>
            <span className="font-mono text-label-caps uppercase">Movement Permits</span>
          </Link>
          <Link to="/vet/transactions" onClick={() => setIsMenuOpen(false)} className={navLinkClasses("/vet/transactions")}>
            <span className="material-symbols-outlined">assignment</span>
            <span className="font-mono text-label-caps uppercase">Transaction Logs</span>
          </Link>
        </nav>

        {/* CTA Button */}
        <div className="p-4 mt-auto">
          <Link to="/vet/disease-reporting" className="w-full bg-primary text-on-primary font-mono text-label-caps uppercase py-3 rounded flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            New Outbreak Report
          </Link>
        </div>

        {/* Footer */}
        <footer className="border-t border-outline-variant mt-4">
          <Link to="/vet/profile" onClick={() => setIsMenuOpen(false)} className="text-on-surface-variant px-4 py-3 flex items-center gap-3 hover:bg-surface-container-highest transition-colors">
            <span className="material-symbols-outlined">person</span>
            <span className="font-mono text-label-caps uppercase">Profile</span>
          </Link>
          <button
            onClick={handleLogout}
            className="text-on-surface-variant px-4 py-3 flex items-center gap-3 hover:bg-surface-container-highest transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined text-error">logout</span>
            <span className="font-mono text-label-caps uppercase">Logout</span>
          </button>
        </footer>
      </aside>

      {/* ── Mobile Overlay ── */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Sticky Header */}
        <header className="h-16 bg-surface-bright border-b border-outline-variant flex items-center justify-between px-lg sticky top-0 z-40">
          <h1 className="font-display text-headline-md font-bold text-primary uppercase tracking-tight">
            Clinical Oversight & Diagnostic Queue
          </h1>
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end mr-4">
              <span className="font-mono text-label-caps text-primary uppercase">Veterinarian</span>
              <span className="text-[10px] text-on-surface-variant">ADTS Regional</span>
            </div>
            <div className="w-10 h-10 rounded bg-secondary-container flex items-center justify-center border border-outline-variant">
              <span className="material-symbols-outlined text-on-secondary-container">person</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-lg">
          <div className="max-w-screen-2xl mx-auto w-full">
            <Outlet />
          </div>
        </div>

        {/* Technical Status Bar */}
        <footer className="mt-auto px-lg py-3 bg-surface-container-highest border-t border-outline-variant flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
          <div className="flex items-center gap-6">
            <span>PORTAL VERSION: 1.0.0-STABLE</span>
            <span>SECURE SESSION: <span className="text-tertiary">ACTIVE</span></span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            <span>REGIONAL SYNC COMPLETE: ADTS</span>
          </div>
        </footer>
      </main>
    </div>
  );
}