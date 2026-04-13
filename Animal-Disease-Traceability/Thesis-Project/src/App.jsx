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

// ---HEADER & FOOTER---
function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[var(--green)] text-[var(--white)] w-full shadow-lg fixed top-0 left-0 z-50">
        <div className="w-full px-6 lg:px-12 py-4 flex justify-between items-center">
          <h1 className="text-xl md:text-3xl font-bold tracking-wide">
            Animal Disease Traceability
          </h1>

          {/* MOBILE BURGER BUTTON */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden flex flex-col gap-1.5 focus:outline-none"
          >
            <div className={`w-8 h-1 bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2.5' : ''}`}></div>
            <div className={`w-8 h-1 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
            <div className={`w-8 h-1 bg-white transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2.5' : ''}`}></div>
          </button>
          <nav className="hidden lg:flex space-x-6 text-base font-bold">
            <Link to="/" className="hover:text-[var(--light-green)] transition-all duration-200">Home</Link>
            <Link to="/faq" className="hover:text-[var(--light-green)] transition-all duration-200">FAQ</Link>
            <Link to="/login" className="hover:text-[var(--light-green)] transition-all duration-200">Login</Link>
          </nav>
        </div>
        <div 
          className={`grid lg:hidden transition-all duration-500 ease-in-out bg-[var(--green)] border-white/10 ${
            isMenuOpen 
              ? "grid-rows-[1fr] opacity-100 border-t" 
              : "grid-rows-[0fr] opacity-0 border-t-0"
          }`}
        >
          <div className="overflow-hidden">
            <nav className="flex flex-col px-6 py-6 space-y-5 text-base font-bold uppercase tracking-wider">
              <Link to="/" onClick={() => setIsOpen(false)} className="hover:text-[var(--light-green)] transition-colors">Home</Link>
              <Link to="/faq" onClick={() => setIsOpen(false)} className="hover:text-[var(--light-green)] transition-colors">FAQ</Link>
              <Link to="/login" onClick={() => setIsOpen(false)} className="hover:text-[var(--light-green)] transition-colors">Login</Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center bg-gradient-to-br from-green-50 to-[var(--white)] pt-28 pb-12 px-4 sm:px-6 lg:px-12 text-center">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-[var(--green)] text-[var(--white)] text-center py-6 w-full mt-auto px-4">
        <p className="text-[10px] sm:text-xs md:text-sm leading-tight">
          &copy; 2026 Santa Rosa City Laguna Animal Disease Traceability. All rights reserved.
        </p>
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
