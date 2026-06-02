import React, { useState, useEffect, useCallback } from "react";
import API_URL from "../../config/api";
import { useNavigate } from "react-router-dom";
import { fetchUsers } from "../../config/api"; 
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

import "./../../assets/styles/App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

export default function LandingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data States
  const [speciesStats, setSpeciesStats] = useState({});
  const [monthlyTrend, setMonthlyTrend] = useState(Array(12).fill(0));
  const [diseaseStats, setDiseaseStats] = useState({ healthy: 0, mild: 0, dangerous: 0, unverified: 0 });
  const [stakeholderCount, setStakeholderCount] = useState(0);
  const [totalAnimals, setTotalAnimals] = useState(0);
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(new Date());
  const [timeAgo, setTimeAgo] = useState("Just now");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [history, setHistory] = useState([]);

  const fetchAlertHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/alert-history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) { console.error("Failed to fetch history:", err); }
  };

  const SPECIES_LIST = ["Hog", "Cow", "Chicken", "Carabao", "Goat", "Duck"];

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch(`${API_URL}/transactions`);
      const txData = await res.json();
      const transactions = Array.isArray(txData) ? txData : [];

      const userData = await fetchUsers();
      setStakeholderCount(Array.isArray(userData) ? userData.length : 0);

      const VALID_BARANGAYS = [
        "Aplaya", "Balibago", "Caingin", "Dila", "Dita", "Don Jose", "Ibaba",
        "Kanluran", "Labas", "Macabling", "Malitlit", "Malusak", "Market Area",
        "Pooc", "Pulong Santa Cruz", "Santo Domingo", "Sinalhan", "Tagapo"
      ];

      const stats = {};
      SPECIES_LIST.forEach(s => {
        stats[s] = { healthy: 0, sick: 0, unverified: 0, total: 0 };
      });

      const months = Array(12).fill(0);
      const healthSummary = { healthy: 0, mild: 0, dangerous: 0, unverified: 0 };
      let grandTotal = 0;

      transactions.forEach(tx => {
        const loc = (tx.location || "").toLowerCase().trim();
        const spec = tx.species || "Other";
        const qty = Number(tx.quantity) || 0;
        const sev = (tx.severity || "").toLowerCase().trim();
        const date = new Date(tx.timestamp);

        const isExternal = loc.includes("slaughterhouse") || loc.includes("exported") || loc.includes("outside");
        const isValidBrgy = VALID_BARANGAYS.some(b => loc.includes(b.toLowerCase()));

        if (isValidBrgy && !isExternal) {
          grandTotal += qty;

          if (sev === "safe" || sev === "healthy") {
            healthSummary.healthy += qty;
          } else if (sev === "mild") {
            healthSummary.mild += qty;
          } else if (sev === "dangerous") {
            healthSummary.dangerous += qty;
          } else {
            healthSummary.unverified += qty;
          }

          if (stats[spec]) {
            stats[spec].total += qty;
            
            if (sev === "safe" || sev === "healthy") {
              stats[spec].healthy += qty;
            } else if (sev === "mild" || sev === "dangerous" || sev === "sick") {
              stats[spec].sick += qty;
              months[date.getMonth()] += qty;
            } else {
              stats[spec].unverified += qty;
            }
          }
        }
      });

      setSpeciesStats(stats);
      setMonthlyTrend(months);
      setDiseaseStats(healthSummary);
      setTotalAnimals(grandTotal);
      
      setLastSyncTimestamp(new Date());
      setTimeAgo("Just now");
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    fetchAlertHistory();
    const autoRefresh = setInterval(() => fetchDashboardData(), 300000);
    return () => clearInterval(autoRefresh);
  }, [fetchDashboardData]);

  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((new Date() - lastSyncTimestamp) / 1000);
      if (seconds < 60) setTimeAgo("Just now");
      else if (seconds < 3600) setTimeAgo(`${Math.floor(seconds / 60)} min ago`);
      else setTimeAgo(`${Math.floor(seconds / 3600)} hr ago`);
    }, 30000);
    return () => clearInterval(interval);
  }, [lastSyncTimestamp]);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { position: "top", labels: { color: "#374151", font: { weight: 'bold' } } } 
    },
    scales: {
      x: { ticks: { color: "#4b5563" }, grid: { display: false } },
      y: { ticks: { color: "#4b5563" }, grid: { color: "rgba(0,0,0,0.05)" } }
    }
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50/30 backdrop-blur-sm z-[1000]">
      <div className="bg-white/80 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white flex flex-col items-center">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-green-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]"></div>
          </div>
        </div>
        <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight uppercase">System Syncing</h2>
        <p className="text-slate-500 font-bold text-xs mt-2 tracking-[0.2em] animate-pulse">
          Fetching ledger data...
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50/50 flex flex-col items-center">
      
      {/* HERO SECTION */}
      <section className="w-full max-w-7xl pt-20 sm:pt-24 md:pt-32 pb-16 sm:pb-20 md:pb-24 px-5 sm:px-6">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-block px-4 py-1.5 mb-5 sm:mb-6 rounded-full bg-green-100 text-green-700 text-xs sm:text-sm font-bold tracking-wide border border-green-200 shadow-sm">
              Powered by HyperLedger Fabric • Real-time • Immutable
            </div>
            <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-gray-900 tracking-tighter leading-tight mb-6 md:mb-8">
              Secure Animal <br className="hidden sm:block" />
              <span className="text-green-600">Traceability Platform</span>
            </h2>
            <p className="text-gray-700 text-lg sm:text-xl md:text-2xl leading-relaxed font-medium max-w-3xl mx-auto md:mx-0">
              Protecting Santa Rosa's livestock supply chain through blockchain-verified data. 
              Real-time monitoring of animal health, movement, and disease risks — empowering farmers, 
              veterinarians, and local authorities with transparent, tamper-proof insights.
            </p>

            <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row justify-center md:justify-start gap-4 sm:gap-5">
              <button 
                onClick={() => window.scrollTo({top: 900, behavior: 'smooth'})} 
                className="px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-gray-900 text-white rounded-[2rem] font-bold text-lg sm:text-xl hover:bg-black transition-all shadow-2xl hover:shadow-3xl w-full sm:w-auto"
              >
                Explore Live Dashboard
              </button>
              <button 
                onClick={() => navigate("/login")} 
                className="px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 bg-white text-gray-900 border-2 border-gray-200 rounded-[2rem] font-bold text-lg sm:text-xl hover:bg-gray-50 transition-all shadow-lg w-full sm:w-auto"
              >
                Stakeholder Login
              </button>
            </div>
          </div>

          <div className="w-full md:w-5/12 lg:w-1/3 bg-white p-6 sm:p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.12)] border border-gray-100 mt-10 md:mt-0">
            <div className="space-y-8 sm:space-y-10 text-center">
              <div className="pb-6 sm:pb-8 border-b border-gray-100">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Registered Livestock</p>
                <p className="text-4xl sm:text-5xl font-black text-green-700">{totalAnimals.toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-1">Across all barangays</p>
              </div>

              <div className="pb-6 sm:pb-8 border-b border-gray-100">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Authorized Stakeholders</p>
                <p className="text-3xl sm:text-4xl font-black text-gray-900">{stakeholderCount.toLocaleString()}</p>
                <p className="text-sm text-gray-600 mt-1">Farmers • Vets • LGU</p>
              </div>

              <div className="pb-6 sm:pb-8 border-b border-gray-100">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Last Blockchain Sync</p>
                <div className="flex items-center justify-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                  <p className="text-2xl sm:text-3xl font-bold text-green-700">{timeAgo}</p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Broadcast Alert</p>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">Active System</p>
                <p className="text-sm text-gray-600 mt-1 mb-3 sm:mb-4">Official Veterinary Logs</p>
                <button 
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="w-full py-3 sm:py-4 bg-slate-900 text-white rounded-xl font-bold text-xs sm:text-sm uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-md active:scale-95"
                >
                  View Alert History
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD GRID */}
      <div className="w-full max-w-7xl mx-auto px-5 sm:px-6 py-12 sm:py-16 md:py-20">
        <div className="mb-12 sm:mb-16 md:mb-20 text-center max-w-4xl mx-auto">
          <h1 className="text-xs sm:text-sm font-black text-green-600 uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-4 md:mb-5">
            Immutable • Transparent • Actionable
          </h1>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 md:mb-8">
            Santa Rosa Livestock Dashboard
          </h2>
          <p className="text-gray-700 text-base sm:text-lg md:text-xl leading-relaxed font-medium px-2 sm:px-0">
            Real-time visibility into animal health, movement patterns, disease risks, and supply chain integrity. 
            By anchoring critical checkpoints to the blockchain, we ensure a tamper-proof audit trail—guaranteeing data authenticity for farmers, veterinarians, 
            meat inspectors, and local government units in Santa Rosa City, Laguna.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 lg:gap-12">

          {/* CARD 1: MOVEMENT */}
          <div className="group bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 lg:p-12 shadow border border-gray-100/80 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col min-h-[600px] sm:min-h-[720px]">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 gap-4 sm:gap-0">
                <div className="p-6 sm:p-7 bg-green-50 rounded-[2rem] sm:rounded-[2.5rem] text-4xl sm:text-5xl shadow-inner">🚚</div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-black text-green-600 uppercase tracking-widest">Live Tracking</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">Movement</p>
                </div>
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 sm:mb-5">City Distribution Map and Population Census</h3>
              <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                Real-time tracking of livestock demographics and distribution across Santa Rosa. 
                By monitoring population shifts and species-specific data, authorities can 
                optimize resource allocation and ensure precise logistics for city-wide safety programs.
              </p>

              <div className="h-64 sm:h-72 mb-6 overflow-x-auto">
                <Bar 
                  data={{
                    labels: SPECIES_LIST,
                    datasets: [{ 
                      label: "Registered Animals", 
                      data: SPECIES_LIST.map(s => speciesStats[s]?.total || 0), 
                      backgroundColor: [
                        "#f59e0b", "#3b82f6", "#ef4444", "#06b6d4", "#10b981", "#6366f1"
                      ], 
                      borderRadius: 12 
                    }]
                  }} 
                  options={commonOptions} 
                />
              </div>

              <div className="flex justify-around items-center bg-slate-50 rounded-2xl py-3 sm:py-4 mb-6 border border-slate-100 flex-wrap gap-4">
                {["🐖", "🐄", "🐓", "🐃", "🐐", "🦆"].map((emoji, i) => (
                  <span key={i} className="text-2xl sm:text-3xl filter drop-shadow-sm transition-transform group-hover:scale-110">
                    {emoji}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-4">
                Data is updated in real-time from field reports and verified entries.
              </p>
              <button onClick={() => navigate("/animal-movement")} className="w-full py-4 sm:py-5 bg-green-600 text-white rounded-2xl font-black text-base sm:text-lg transition-all hover:bg-green-700 shadow-xl">
                View Full Movement Map →
              </button>
            </div>
          </div>

          {/* CARD 2: HEALTH */}
          <div className="group bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 lg:p-12 shadow border border-gray-100/80 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col min-h-[600px] sm:min-h-[720px]">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 gap-4 sm:gap-0">
                <div className="p-6 sm:p-7 bg-emerald-50 rounded-[2rem] sm:rounded-[2.5rem] text-4xl sm:text-5xl shadow-inner">🩺</div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Medical Records</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">Health Status</p>
                </div>
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 sm:mb-5">Animal Health Overview</h3>
              <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                Real-time breakdown of healthy vs. sick animals per species. 
                Critical for early warning of disease outbreaks and evaluating the effectiveness 
                of vaccination campaigns and biosecurity measures in Santa Rosa.
              </p>

              <div className="overflow-x-auto rounded-3xl border border-gray-100 mb-6">
                <table className="w-full min-w-[500px] text-left text-sm sm:text-base">
                  <thead className="bg-gray-50 text-xs sm:text-sm font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-4 sm:py-5 px-6 sm:px-8">Species</th>
                      <th className="py-4 sm:py-5 text-center text-green-700">Healthy</th>
                      <th className="py-4 sm:py-5 text-center text-red-600">Sick</th>
                      <th className="py-4 sm:py-5 text-center text-amber-600">Unverified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-semibold">
                    {SPECIES_LIST.map(s => (
                      <tr key={s}>
                        <td className="py-4 sm:py-5 px-6 sm:px-8 font-bold text-gray-800">{s}</td>
                        <td className="py-4 sm:py-5 text-center text-green-700">{speciesStats[s]?.healthy?.toLocaleString() || "0"}</td>
                        <td className="py-4 sm:py-5 text-center text-red-600">{speciesStats[s]?.sick?.toLocaleString() || "0"}</td>
                        <td className="py-4 sm:py-5 text-center text-amber-600">{speciesStats[s]?.unverified?.toLocaleString() || "0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-auto pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-4">
                All health classifications are based on field veterinary assessments.
              </p>
              <button onClick={() => navigate("/health-table")} className="w-full py-4 sm:py-5 bg-emerald-600 text-white rounded-2xl font-black text-base sm:text-lg transition-all hover:bg-emerald-700 shadow-xl">
                Explore Detailed Health Records →
              </button>
            </div>
          </div>

          {/* CARD 3: OUTBREAKS */}
          <div className="group bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 lg:p-12 shadow border border-gray-100/80 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col min-h-[600px] sm:min-h-[720px]">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 gap-4 sm:gap-0">
                <div className="p-6 sm:p-7 bg-red-50 rounded-[2rem] sm:rounded-[2.5rem] text-4xl sm:text-5xl shadow-inner">🚨</div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-black text-red-600 uppercase tracking-widest">Early Warning</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">Disease Risk</p>
                </div>
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 sm:mb-5">Outbreak Statistics & Analytics</h3>
              <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                Real-time tracking of livestock health conditions across Santa Rosa. This data identifies 
                high-risk areas and severity levels, enabling rapid medical response and targeted 
                quarantine protocols to maintain city-wide biosecurity.
              </p>
              <div className="h-64 sm:h-72 mb-6">
                <Pie 
                  data={{
                    labels: ["Healthy", "Mild Cases", "Dangerous Cases", "Unverified"],
                    datasets: [{ 
                      data: [
                        diseaseStats.healthy, 
                        diseaseStats.mild, 
                        diseaseStats.dangerous, 
                        diseaseStats.unverified
                      ], 
                      backgroundColor: ["#10b981", "#3b82f6", "#ef4444", "#f59e0b"], 
                      borderWidth: 0 
                    }]
                  }} 
                  options={commonOptions} 
                />
              </div>
            </div>
            <div className="mt-auto pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-4">
                Data reflects only confirmed veterinary diagnoses.
              </p>
              <button onClick={() => navigate("/outbreak-stats")} className="w-full py-4 sm:py-5 bg-red-600 text-white rounded-2xl font-black text-base sm:text-lg transition-all hover:bg-red-700 shadow-xl">
                View Risk Mitigation Tools →
              </button>
            </div>
          </div>

          {/* CARD 4: TRENDS */}
          <div className="group bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 lg:p-12 shadow border border-gray-100/80 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col min-h-[600px] sm:min-h-[720px]">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 sm:mb-10 gap-4 sm:gap-0">
                <div className="p-6 sm:p-7 bg-blue-50 rounded-[2rem] sm:rounded-[2.5rem] text-4xl sm:text-5xl shadow-inner">📈</div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Trend Analysis</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">Disease Trends</p>
                </div>
              </div>
              <h3 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 sm:mb-5">Monthly Sick Cases Trend</h3>
              <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                12-month historical view of confirmed sick cases. 
                Identify seasonal patterns, evaluate intervention success, 
                and forecast potential future risks for better preparedness.
              </p>
              <div className="h-64 sm:h-72 mb-6">
                <Line 
                  data={{
                    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                    datasets: [{ 
                      label: "Confirmed Sick Cases", 
                      data: monthlyTrend, 
                      borderColor: "#ef4444", // Red line
                      backgroundColor: "rgba(239, 68, 68, 0.15)", // Light red fill
                      fill: true, 
                      tension: 0.4,
                      pointRadius: 4,
                      pointBackgroundColor: "#ef4444"
                    }]
                  }} 
                  options={commonOptions} 
                />
              </div>
            </div>
            <div className="mt-auto pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500 mb-4">
                Updated monthly with verified veterinary reports.
              </p>
              <button onClick={() => navigate("/summary-report")} className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-2xl font-black text-base sm:text-lg transition-all hover:bg-blue-700 shadow-xl">
                Access Full Trend Reports →
              </button>
            </div>
          </div>

        </div>

        {/* ALERT HISTORY MODAL – already quite responsive, minor padding tweaks */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
              onClick={() => setIsHistoryModalOpen(false)}
            />

            <div className="
              relative w-full max-w-3xl max-h-[90vh] sm:max-h-[85vh] 
              bg-white rounded-[2rem] sm:rounded-[2.5rem] 
              shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] 
              flex flex-col overflow-hidden
              border border-white/20
              animate-in fade-in zoom-in duration-300
            ">
              <div className="
                px-6 sm:px-8 py-6 sm:py-8 
                border-b border-slate-100 
                flex items-center justify-between 
                bg-white sticky top-0 z-10
              ">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white-900 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                    📜
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight uppercase">
                      Alert History
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="
                    w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full 
                    bg-slate-50 text-slate-400 hover:text-red-500 
                    hover:bg-red-50 hover:rotate-90
                    transition-all duration-300
                  "
                  aria-label="Close"
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 sm:px-6 md:px-10 py-6 sm:py-8 bg-[#F8FAFC]">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 sm:py-20 text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-100 rounded-full flex items-center justify-center text-3xl sm:text-4xl mb-6 grayscale opacity-50">
                      📂
                    </div>
                    <p className="text-slate-800 font-black text-xl sm:text-2xl uppercase">
                      No Transmission Logs
                    </p>
                    <p className="text-slate-500 mt-2 text-base sm:text-lg font-medium">
                      Future alert broadcasts will be archived here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5 sm:space-y-6">
                    {history.map((item) => (
                    <div
                      key={item._id}
                      className="relative bg-white rounded-[1.75rem] sm:rounded-[2rem] border border-slate-200/60 p-5 sm:p-6 md:p-8 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-4 sm:gap-5"
                    >
                      <div className={`absolute left-0 top-6 sm:top-8 bottom-6 sm:bottom-8 w-1 sm:w-1.5 rounded-r-full ${
                        item.severity === 'Critical' ? 'bg-red-500' : 
                        item.severity === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className={`px-4 sm:px-5 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-tighter ${
                            item.severity === 'Critical' ? 'bg-red-600 text-white' : 
                            item.severity === 'Warning' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                          }`}>
                            {item.severity}
                          </span>
                          <time className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </time>
                        </div>
                        
                        {/* METADATA SECTION: Includes Species, Location, and Barangay */}
                        <div className="flex flex-col gap-1 text-[10px] font-bold self-start sm:self-auto">
                          <div className="text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                            {item.species} • {item.location}
                          </div>
                          <div className="px-3">
                            <span className="text-slate-400">Barangay:</span> 
                            <span className="text-slate-900 font-bold ml-1">{item.targetBarangay}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight mb-2 uppercase tracking-tight">
                          {item.title}
                        </h4>
                        
                        <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed mb-4">
                          {item.details || item.description}
                        </p>

                        {item.instruction && (
                          <div className={`p-4 rounded-xl border-l-4 ${
                            item.severity === 'Critical' ? 'bg-red-50 border-red-500 text-red-900' : 
                            item.severity === 'Warning' ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-emerald-50 border-emerald-500 text-emerald-900'
                          }`}>
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] mb-1">Required Action:</p>
                            <p className="text-xs sm:text-sm font-bold leading-snug">
                              {item.instruction}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>

              <div className="px-6 sm:px-10 py-5 sm:py-6 border-t border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
                <p className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-[0.2em]">
                  End of Archive
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-slate-900 font-black text-base sm:text-lg">{history.length}</span>
                  <span className="text-slate-400 font-bold uppercase text-xs sm:text-sm tracking-widest">Reports Logged</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM SECTION */}
        <div className="mt-20 sm:mt-24 md:mt-32 text-center max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-16 sm:pb-20">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-gray-900">
            Protecting Santa Rosa's Future
          </h2>
          <p className="text-lg sm:text-xl text-gray-700 leading-relaxed px-4 sm:px-0">
            Our blockchain-powered platform ensures every animal movement, health check, 
            and disease report is permanently recorded and verifiable. 
            Together with farmers, veterinarians, and local government, 
            we're building a safer, more transparent livestock ecosystem in Santa Rosa City.
          </p>

          <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            <button 
              onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} 
              className="px-8 sm:px-12 py-4 sm:py-6 bg-green-600 text-white rounded-2xl font-black text-lg sm:text-xl hover:bg-green-700 transition-all shadow-xl w-full sm:w-auto"
            >
              Back to Top ↑
            </button>
            <button 
              onClick={() => navigate("/login")} 
              className="px-8 sm:px-12 py-4 sm:py-6 bg-white border-2 border-green-600 text-green-700 rounded-2xl font-black text-lg sm:text-xl hover:bg-green-50 transition-all shadow-lg w-full sm:w-auto"
            >
              Join as Stakeholder →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}