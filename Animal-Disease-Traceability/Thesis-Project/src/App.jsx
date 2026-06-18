import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Outlet,
} from "react-router-dom";

import { useState } from "react";

// --- CSS Import Update ---
import "./assets/styles/App.css";

// --- Public Page Imports (Updated Paths) ---
import Login from "./pages/auth/Login";
import MovementMap from "./pages/public/MovementMap";
import FAQ from "./pages/public/FAQ";
import ForgotPassword from "./pages/auth/ForgotPassword";
import DigitalPassport from "./pages/public/DigitalPassport";

// import PublicLedger from "./pages/public/PublicLedger";
import Table from "./components/common/Table";
import OutbreakStats from "./components/charts/OutbreakStats";
import SummaryReport from "./components/charts/SummaryReport";
import LandingPage from "./pages/public/LandingPage";
import Register from "./pages/auth/Register";

// --- Admin Page Imports (Updated Paths) ---
import AdminLogin from "./pages/auth/AdminLogin";
import AdminLayout from "./components/layout/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import Reports from "./pages/admin/Reports";
import UserManagement from "./pages/admin/UserManagement";
import LivestockDatabase from "./pages/admin/LivestockDatabase";
import TransactionLogs from "./pages/admin/TransactionLogs";
import AlertSystem from "./pages/admin/AlertSystem";
import NetworkVisual from "./pages/admin/NetworkVisual";
import ExitPermits from "./pages/admin/ExitPermits";
import AdminProfile from "./pages/admin/AdminProfile";

// --- Vet Page Imports ---

import VetLayout from "./components/layout/VetLayout";
import VetOverview from "./pages/vet/VetOverview";
import VetTransactionLogs from "./pages/vet/VetTransactionLogs";
import HealthRecord from "./pages/vet/HealthRecord";
import MovementPermits from "./pages/vet/MovementPermits";
import VetProfile from "./pages/vet/VetProfile";

// --- Farmer Page Imports ---
import FarmerLayout from "./components/layout/FarmerLayout";
import MyLivestock from "./pages/farmer/MyLivestock"; // Formerly PublicLedger
import Logistics from "./pages/farmer/Logistics";
import FarmerProfile from "./pages/farmer/FarmerProfile";

// --- ADTS Clinical Authority: Public Layout ---
function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-background font-body">
      {/* ── TopNavBar ── */}
      <header className="fixed top-0 w-full h-16 bg-surface-bright border-b border-outline-variant z-50">
        <nav className="flex justify-between items-center px-lg h-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
            <span className="font-display text-headline-md font-bold text-primary">ADTS Public</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-lg">
            <Link to="/" className="text-primary border-b-2 border-primary font-bold pb-1 font-mono text-label-caps uppercase">Traceability</Link>
            <Link to="/faq" className="text-on-surface-variant font-medium hover:text-primary transition-colors font-mono text-label-caps uppercase">Resources</Link>
            <Link to="/login" className="text-on-surface-variant font-medium hover:text-primary transition-colors font-mono text-label-caps uppercase">Partner Login</Link>
            <Link to="/faq" className="text-on-surface-variant font-medium hover:text-primary transition-colors font-mono text-label-caps uppercase">Support</Link>
            <Link to="/animal-movement" className="bg-primary text-on-primary px-lg py-2 rounded font-bold hover:opacity-90 transition-opacity font-mono text-label-caps uppercase ml-md">
              Check Status
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-primary" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            <span className="material-symbols-outlined text-[28px]">{isMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </nav>

        {/* Mobile Menu Dropdown */}
        <div
          className={`grid md:hidden transition-all duration-500 ease-in-out bg-surface-bright border-outline-variant ${
            isMenuOpen
              ? "grid-rows-[1fr] opacity-100 border-t"
              : "grid-rows-[0fr] opacity-0 border-t-0"
          }`}
        >
          <div className="overflow-hidden">
            <nav className="flex flex-col px-lg py-lg space-y-4 font-mono text-label-caps uppercase">
              <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-primary font-bold hover:text-primary-container transition-colors py-2">Traceability</Link>
              <Link to="/faq" onClick={() => setIsMenuOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors py-2">Resources</Link>
              <Link to="/login" onClick={() => setIsMenuOpen(false)} className="text-on-surface-variant hover:text-primary transition-colors py-2">Partner Login</Link>
              <Link to="/animal-movement" onClick={() => setIsMenuOpen(false)} className="bg-primary text-on-primary px-lg py-3 rounded font-bold text-center hover:opacity-90 transition-opacity">Check Status</Link>
            </nav>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-grow pt-16">
        <Outlet />
      </main>

      {/* ── Institutional Footer ── */}
      <footer className="bg-[#0D1B2B] text-white py-xl mt-auto">
        <div className="max-w-screen-2xl mx-auto px-lg">
          <div className="flex flex-col md:flex-row justify-between items-start gap-xl pb-xl border-b border-white/10">
            <div className="max-w-md">
              <div className="flex items-center gap-md mb-md">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center p-2">
                  <span className="material-symbols-outlined text-primary text-[36px]">policy</span>
                </div>
                <div>
                  <h4 className="font-display text-headline-md font-bold">ADTS Institutional Oversight</h4>
                  <p className="font-mono text-label-caps text-white/60">ADTS Regional Hub</p>
                </div>
              </div>
              <p className="text-white/70 font-body text-body-md leading-relaxed">
                Providing the local standard for livestock identification, tracking, and biosecurity data management. An institutional partner for public health protection.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-lg">
              <div>
                <h5 className="font-mono text-label-caps text-[#a0efff] mb-md uppercase">Institutional</h5>
                <ul className="space-y-sm text-white/60 font-body text-body-md">
                  <li><Link to="/faq" className="hover:text-white transition-colors">Annual Reports</Link></li>
                  <li><Link to="/faq" className="hover:text-white transition-colors">Policy Documents</Link></li>
                  <li><Link to="/faq" className="hover:text-white transition-colors">Privacy Act</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="font-mono text-label-caps text-[#a0efff] mb-md uppercase">Resources</h5>
                <ul className="space-y-sm text-white/60 font-body text-body-md">
                  <li><Link to="/faq" className="hover:text-white transition-colors">RFID Standards</Link></li>
                  <li><Link to="/faq" className="hover:text-white transition-colors">Farmer Toolkit</Link></li>
                  <li><Link to="/faq" className="hover:text-white transition-colors">Vet Guidelines</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="font-mono text-label-caps text-[#a0efff] mb-md uppercase">Access</h5>
                <ul className="space-y-sm text-white/60 font-body text-body-md">
                  <li><Link to="/login" className="hover:text-white transition-colors">Farmer Login</Link></li>
                  <li><Link to="/adminlogin" className="hover:text-white transition-colors">Admin Portal</Link></li>
                  <li><Link to="/faq" className="hover:text-white transition-colors">Help Desk</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="pt-lg flex flex-col md:flex-row justify-between items-center gap-md">
            <p className="font-mono text-data-mono text-white/40 text-xs uppercase">
              Official System of ADTS Veterinary Oversight Bureau.
            </p>
            <div className="flex items-center gap-lg text-white/40 font-mono text-xs">
              <span>&copy; 2026 ADTS</span>
              <span>System Version 1.0.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
/**
 * Main App Component
 */
export default function App() {
  return (
    <Router>
      <Routes>
        {/* Digital Animal Passport — Standalone (no header/footer) */}
        <Route path="/passport/:batchId" element={<DigitalPassport />} />

        {/* 1. Public Routes */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<LandingPage />} />
          <Route path="home" element={<LandingPage />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="animal-movement" element={<MovementMap />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="forgot-password" element={<ForgotPassword />} />

          {/* <Route path="TransactionsPage" element={<PublicLedger />} /> */}

          {/* Note: In a real app, 'Table' and 'Stats' usually aren't full pages, 
              but we keep them here to preserve your current flow. */}
          <Route path="health-table" element={<Table />} />
          <Route path="outbreak-stats" element={<OutbreakStats />} />
          <Route path="summary-report" element={<SummaryReport />} />
        </Route>

        {/* 2. FARMER PORTAL (R1) */}
        <Route path="/farmer" element={<FarmerLayout />}>
          <Route path="livestock" element={<MyLivestock />} />
          <Route path="logistics" element={<Logistics />} />
          <Route path="profile" element={<FarmerProfile />} />
        </Route>

        {/* 2. Admin Login Route */}
        <Route path="/adminlogin" element={<AdminLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* --- VETERINARIAN ROUTES (R2) --- */}
        <Route path="/vet" element={<VetLayout />}>
          <Route path="dashboard" element={<VetOverview />} />
          <Route path="profile" element={<VetProfile />} />

          {/* FIXED: Removed the <div> wrapping the route */}
          <Route path="health-records" element={<HealthRecord />} />

          <Route path="transactions" element={<VetTransactionLogs />} />
          <Route path="movement-permits" element={<MovementPermits />} />

          <Route
            path="disease-reporting"
            element={
              <div className="text-center mt-10">
                Disease Alert System (Coming Soon)
              </div>
            }
          />
        </Route>

        {/* 3. Secure Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminOverview />} />
          <Route path="reports" element={<Reports />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="animal-db" element={<LivestockDatabase />} />
          <Route path="transactions" element={<TransactionLogs />} />
          <Route path="alert" element={<AlertSystem />} />
          <Route path="network" element={<NetworkVisual />} />
          <Route path="exit-permits" element={<ExitPermits />} />
          <Route path="profile" element={<AdminProfile />} />
        </Route>
      </Routes>
    </Router>
  );
}
