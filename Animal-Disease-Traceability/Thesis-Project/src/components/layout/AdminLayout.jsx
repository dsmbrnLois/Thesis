import React from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import "../../assets/styles/App.css";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    navigate("/adminlogin");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.includes(path);

  const navLinkClasses = (path) =>
    `px-4 py-3 flex items-center gap-3 transition-colors font-body text-body-md ${
      isActive(path)
        ? "bg-[#1A2B3A] text-[#abc9f3] border-l-4 border-[#84d2e2]"
        : "text-outline-variant hover:bg-[#1A2B3A] border-l-4 border-transparent"
    }`;

  return (
    <div className="flex h-screen bg-background font-body overflow-hidden">
      {/* ── Admin Dark Sidebar ── */}
      <aside className="bg-[#0D1B2A] fixed left-0 top-0 h-screen w-sidebar border-r border-on-surface-variant flex flex-col overflow-y-auto z-50">
        <div className="p-lg flex flex-col gap-1">
          <h1 className="font-display text-headline-md font-bold text-secondary-fixed">ADTS Admin</h1>
          <p className="font-mono text-label-caps text-outline-variant opacity-70">System Infrastructure</p>
        </div>

        <nav className="flex-1 mt-md">
          <Link to="/admin/dashboard" className={navLinkClasses("/admin/dashboard")}>
            <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
            <span>System Health</span>
          </Link>
          <Link to="/admin/user-management" className={navLinkClasses("/admin/user-management")}>
            <span className="material-symbols-outlined text-[20px]">group</span>
            <span>User Access</span>
          </Link>
          <Link to="/admin/reports" className={navLinkClasses("/admin/reports")}>
            <span className="material-symbols-outlined text-[20px]">policy</span>
            <span>Reports</span>
          </Link>
          <Link to="/admin/transactions" className={navLinkClasses("/admin/transactions")}>
            <span className="material-symbols-outlined text-[20px]">assignment</span>
            <span>Global Logs</span>
          </Link>
          <Link to="/admin/animal-db" className={navLinkClasses("/admin/animal-db")}>
            <span className="material-symbols-outlined text-[20px]">database</span>
            <span>Database</span>
          </Link>
          <Link to="/admin/alert" className={navLinkClasses("/admin/alert")}>
            <span className="material-symbols-outlined text-[20px]">notification_important</span>
            <span>Alert System</span>
          </Link>
          <Link to="/admin/network" className={navLinkClasses("/admin/network")}>
            <span className="material-symbols-outlined text-[20px]">hub</span>
            <span>Network Visual</span>
          </Link>
          <Link to="/admin/exit-permits" className={navLinkClasses("/admin/exit-permits")}>
            <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            <span>Exit Permits</span>
          </Link>
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto border-t border-on-surface-variant/20 py-4">
          <Link to="/admin/profile" className="px-4 py-2 flex items-center gap-3 mb-2 hover:bg-[#1A2B3A] transition-colors">
            <div className="w-8 h-8 rounded bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-container text-[18px]">person</span>
            </div>
            <div>
              <p className="font-body text-body-md text-secondary-fixed leading-tight">Admin User</p>
              <p className="font-mono text-[9px] text-outline-variant uppercase">Level 4 Clearance</p>
            </div>
          </Link>
          <a href="#" className="text-outline-variant px-4 py-2 flex items-center gap-3 hover:bg-[#1A2B3A] transition-colors">
            <span className="material-symbols-outlined text-[18px]">router</span>
            <span className="font-mono text-label-caps">Network Status</span>
          </a>
          <button
            onClick={handleLogout}
            className="text-outline-variant px-4 py-2 flex items-center gap-3 hover:bg-[#1A2B3A] transition-colors w-full text-left"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="font-mono text-label-caps">Logout</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <main className="ml-sidebar flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-outline-variant flex items-center justify-between px-lg bg-surface-bright">
          <h2 className="font-display text-headline-md text-primary">System Infrastructure Overview</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded border border-outline-variant">
              <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim"></span>
              <span className="font-mono text-[10px] text-on-surface-variant uppercase">System Online</span>
            </div>
            <button className="p-2 text-on-surface-variant hover:bg-surface-container transition-colors rounded">
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-lg clinical-grid">
          <div className="max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}