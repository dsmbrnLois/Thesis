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

  /* ── Chart Styling (Clinical) ── */
  const clinicalChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { 
      legend: { position: "top", labels: { color: "#3f484b", font: { family: 'Inter', weight: '600', size: 12 } } } 
    },
    scales: {
      x: { ticks: { color: "#6f797b", font: { family: 'JetBrains Mono', size: 11 } }, grid: { display: false } },
      y: { ticks: { color: "#6f797b", font: { family: 'JetBrains Mono', size: 11 } }, grid: { color: "rgba(190, 200, 203, 0.3)" } }
    }
  };

  /* ── Loading State ── */
  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface/80 backdrop-blur-sm z-[1000]">
      <div className="bg-surface-container-lowest p-10 rounded-xl shadow-clinical border border-outline-variant flex flex-col items-center">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-outline-variant"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse shadow-[0_0_15px_rgba(0,84,96,0.4)]"></div>
          </div>
        </div>
        <h2 className="font-display text-headline-md font-bold text-on-surface">System Syncing</h2>
        <p className="text-on-surface-variant font-mono text-label-caps mt-2 animate-pulse uppercase">
          Fetching ledger data...
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-background font-body flex flex-col items-center">
      
      {/* ═══════════════════════════════════════════════════════
          HERO SECTION — Clinical Teal Overlay
      ═══════════════════════════════════════════════════════ */}
      <section className="w-full hero-overlay py-24 sm:py-32 md:py-40 px-lg text-center text-white">
        <div className="max-w-4xl mx-auto">
          <div className="w-20 h-20 mx-auto mb-8 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <span className="material-symbols-outlined text-[48px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield_with_heart</span>
          </div>
          <h2 className="font-display text-display-lg sm:text-5xl md:text-6xl font-bold mb-6 leading-tight tracking-tight">
            Animal Disease Traceability System
          </h2>
          <p className="font-body text-body-lg text-white/80 max-w-2xl mx-auto mb-10">
            National Livestock Health & Pathogen Surveillance Infrastructure — ADTS
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              onClick={() => window.scrollTo({top: 800, behavior: 'smooth'})} 
              className="bg-white text-primary px-8 py-3 rounded font-bold font-body hover:bg-surface-container-lowest transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              Public Dashboard
            </button>
            <button 
              onClick={() => navigate("/login")} 
              className="bg-primary-container text-on-primary-container px-8 py-3 rounded font-bold font-body hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
              Farmer Login
            </button>
            <button 
              onClick={() => navigate("/login")} 
              className="border border-white/40 text-white px-8 py-3 rounded font-bold font-body hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">public</span>
              Partner Access
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          METRICS ROW — Key Statistics
      ═══════════════════════════════════════════════════════ */}
      <section className="w-full max-w-screen-2xl mx-auto px-lg -mt-12 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg clinical-shadow">
            <span className="font-mono text-label-caps text-on-surface-variant uppercase block mb-2">Total Livestock Tracked</span>
            <div className="flex items-end justify-between">
              <span className="font-display text-display-lg leading-none text-on-surface">{totalAnimals.toLocaleString()}</span>
              <span className="text-tertiary font-mono text-data-mono flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">trending_up</span>
                Live
              </span>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg clinical-shadow">
            <span className="font-mono text-label-caps text-on-surface-variant uppercase block mb-2">Active Stakeholders</span>
            <div className="flex items-end justify-between">
              <span className="font-display text-display-lg leading-none text-on-surface">{stakeholderCount.toLocaleString()}</span>
              <span className="text-on-surface-variant font-mono text-data-mono">
                <span className="material-symbols-outlined text-[16px]">verified</span>
              </span>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg clinical-shadow">
            <span className="font-mono text-label-caps text-on-surface-variant uppercase block mb-2">Monitored Zones</span>
            <div className="flex items-end justify-between">
              <span className="font-display text-display-lg leading-none text-on-surface">18</span>
              <span className="text-secondary font-mono text-data-mono">Barangays</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg clinical-shadow">
            <span className="font-mono text-label-caps text-on-surface-variant uppercase block mb-2">Last Blockchain Sync</span>
            <div className="flex items-end justify-between">
              <span className="font-display text-headline-md leading-none text-on-surface font-bold">{timeAgo}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-pulse"></span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SYSTEM CORE — Technological Oversight Protocols
      ═══════════════════════════════════════════════════════ */}
      <section className="w-full max-w-screen-2xl mx-auto px-lg py-xl mt-xl">
        <div className="text-center mb-xl">
          <span className="inline-block border border-outline-variant px-4 py-1 rounded font-mono text-label-caps text-on-surface-variant uppercase mb-4">System Core</span>
          <h3 className="font-display text-display-lg text-on-surface">Technological Oversight Protocols</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg clinical-shadow hover:border-primary transition-colors group">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-primary text-[28px]">hub</span>
            </div>
            <h4 className="font-display text-headline-md font-bold text-on-surface mb-sm">Real-time Traceability</h4>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed mb-lg">
              Unified movement tracking system utilizing RFID and geospatial data to provide instant oversight across barangays, ensuring rapid response during potential outbreak vectors.
            </p>
            <button onClick={() => navigate("/animal-movement")} className="font-body text-body-md text-primary font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
              Learn more <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg clinical-shadow hover:border-primary transition-colors group">
            <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-secondary text-[28px]">monitoring</span>
            </div>
            <h4 className="font-display text-headline-md font-bold text-on-surface mb-sm">Health Surveillance</h4>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed mb-lg">
              Advanced pathogen sensing and laboratory integration protocols. Automated reporting systems connect veterinary services directly with local biosecurity infrastructure.
            </p>
            <button onClick={() => navigate("/health-table")} className="font-body text-body-md text-primary font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
              Review protocols <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-lg clinical-shadow hover:border-primary transition-colors group">
            <div className="w-12 h-12 bg-tertiary/10 rounded-lg flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-tertiary text-[28px]">verified_user</span>
            </div>
            <h4 className="font-display text-headline-md font-bold text-on-surface mb-sm">Blockchain Verification</h4>
            <p className="font-body text-body-md text-on-surface-variant leading-relaxed mb-lg">
              Immutable cryptographic records for every animal life-cycle event. Ensures data integrity and prevents tampering with health certificates and origin declarations.
            </p>
            <button onClick={() => navigate("/summary-report")} className="font-body text-body-md text-primary font-bold flex items-center gap-1 group-hover:gap-2 transition-all">
              Data integrity <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          DASHBOARD GRID — Data Visualizations
      ═══════════════════════════════════════════════════════ */}
      <div className="w-full max-w-screen-2xl mx-auto px-lg py-xl">
        <div className="mb-xl text-center max-w-3xl mx-auto">
          <span className="inline-block border border-outline-variant px-4 py-1 rounded font-mono text-label-caps text-on-surface-variant uppercase mb-4">Live Data</span>
          <h3 className="font-display text-display-lg text-on-surface mb-md">ADTS Livestock Dashboard</h3>
          <p className="font-body text-body-lg text-on-surface-variant leading-relaxed">
            Real-time visibility into animal health, movement patterns, disease risks, and supply chain integrity. 
            Anchored to the blockchain for a tamper-proof audit trail.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">

          {/* CARD 1: MOVEMENT */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg clinical-shadow flex flex-col overflow-hidden">
            <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">bar_chart</span>
                <h3 className="font-mono text-label-caps uppercase">Species Distribution</h3>
              </div>
              <span className="font-mono text-label-caps text-on-surface-variant uppercase">Live</span>
            </div>
            <div className="p-lg flex-1">
              <p className="font-body text-body-md text-on-surface-variant mb-md">
                Registered livestock by species across all registered barangays in the ADTS network.
              </p>
              <div className="h-64 mb-md">
                <Bar 
                  data={{
                    labels: SPECIES_LIST,
                    datasets: [{ 
                      label: "Registered Animals", 
                      data: SPECIES_LIST.map(s => speciesStats[s]?.total || 0), 
                      backgroundColor: [
                        "#005460", "#436085", "#005835", "#0a6e7c", "#84d2e2", "#74daa1"
                      ], 
                      borderRadius: 4 
                    }]
                  }} 
                  options={clinicalChartOptions} 
                />
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low">
              <button onClick={() => navigate("/animal-movement")} className="font-mono text-label-caps text-primary hover:underline uppercase">
                View Full Movement Map →
              </button>
            </div>
          </div>

          {/* CARD 2: HEALTH */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg clinical-shadow flex flex-col overflow-hidden">
            <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[20px]">health_and_safety</span>
                <h3 className="font-mono text-label-caps uppercase">Health Status Matrix</h3>
              </div>
              <span className="font-mono text-label-caps text-on-surface-variant uppercase">Real-time</span>
            </div>
            <div className="p-lg flex-1">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse zebra-table">
                  <thead>
                    <tr className="bg-surface-container text-on-surface-variant">
                      <th className="px-md py-3 font-mono text-label-caps uppercase">Species</th>
                      <th className="px-md py-3 font-mono text-label-caps text-tertiary uppercase text-center">Healthy</th>
                      <th className="px-md py-3 font-mono text-label-caps text-error uppercase text-center">Sick</th>
                      <th className="px-md py-3 font-mono text-label-caps text-secondary uppercase text-center">Unverified</th>
                    </tr>
                  </thead>
                  <tbody className="font-body text-body-md divide-y divide-outline-variant">
                    {SPECIES_LIST.map(s => (
                      <tr key={s} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-md py-3 font-bold text-on-surface">{s}</td>
                        <td className="px-md py-3 text-center font-mono text-data-mono text-tertiary">{speciesStats[s]?.healthy?.toLocaleString() || "0"}</td>
                        <td className="px-md py-3 text-center font-mono text-data-mono text-error">{speciesStats[s]?.sick?.toLocaleString() || "0"}</td>
                        <td className="px-md py-3 text-center font-mono text-data-mono text-secondary">{speciesStats[s]?.unverified?.toLocaleString() || "0"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low">
              <button onClick={() => navigate("/health-table")} className="font-mono text-label-caps text-primary hover:underline uppercase">
                Explore Detailed Health Records →
              </button>
            </div>
          </div>

          {/* CARD 3: OUTBREAKS */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg clinical-shadow flex flex-col overflow-hidden">
            <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-[20px]">emergency</span>
                <h3 className="font-mono text-label-caps uppercase">Disease Risk Analysis</h3>
              </div>
              <span className="font-mono text-label-caps text-on-surface-variant uppercase">Surveillance</span>
            </div>
            <div className="p-lg flex-1">
              <p className="font-body text-body-md text-on-surface-variant mb-md">
                Health condition breakdown across all livestock. Critical for early warning of disease outbreaks.
              </p>
              <div className="h-64 mb-md">
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
                      backgroundColor: ["#005835", "#436085", "#ba1a1a", "#bec8cb"], 
                      borderWidth: 0 
                    }]
                  }} 
                  options={clinicalChartOptions} 
                />
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low">
              <button onClick={() => navigate("/outbreak-stats")} className="font-mono text-label-caps text-primary hover:underline uppercase">
                View Risk Mitigation Tools →
              </button>
            </div>
          </div>

          {/* CARD 4: TRENDS */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg clinical-shadow flex flex-col overflow-hidden">
            <div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">show_chart</span>
                <h3 className="font-mono text-label-caps uppercase">Monthly Trend Analysis</h3>
              </div>
              <span className="font-mono text-label-caps text-on-surface-variant uppercase">12-Month</span>
            </div>
            <div className="p-lg flex-1">
              <p className="font-body text-body-md text-on-surface-variant mb-md">
                Historical view of confirmed sick cases. Identify seasonal patterns and forecast potential risks.
              </p>
              <div className="h-64 mb-md">
                <Line 
                  data={{
                    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                    datasets: [{ 
                      label: "Confirmed Sick Cases", 
                      data: monthlyTrend, 
                      borderColor: "#ba1a1a",
                      backgroundColor: "rgba(186, 26, 26, 0.1)",
                      fill: true, 
                      tension: 0.4,
                      pointRadius: 4,
                      pointBackgroundColor: "#ba1a1a"
                    }]
                  }} 
                  options={clinicalChartOptions} 
                />
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low">
              <button onClick={() => navigate("/summary-report")} className="font-mono text-label-caps text-primary hover:underline uppercase">
                Access Full Trend Reports →
              </button>
            </div>
          </div>
        </div>

        {/* ── Alert History Modal ── */}
        {isHistoryModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-lg">
            <div
              className="absolute inset-0 bg-on-surface/60 backdrop-blur-md transition-opacity"
              onClick={() => setIsHistoryModalOpen(false)}
            />

            <div className="relative w-full max-w-3xl max-h-[85vh] bg-surface-container-lowest rounded-xl shadow-2xl flex flex-col overflow-hidden border border-outline-variant">
              <div className="px-lg py-lg border-b border-outline-variant flex items-center justify-between bg-surface-container-low sticky top-0 z-10">
                <div className="flex items-center gap-md">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-on-primary">
                    <span className="material-symbols-outlined">history</span>
                  </div>
                  <div>
                    <h2 className="font-display text-headline-md font-bold text-on-surface">Alert History</h2>
                    <p className="font-mono text-label-caps text-on-surface-variant uppercase">Broadcast Archive</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsHistoryModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface-container text-on-surface-variant hover:text-error hover:bg-error-container transition-all"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-lg py-lg bg-surface">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                    <div className="w-20 h-20 bg-surface-container rounded-xl flex items-center justify-center mb-md">
                      <span className="material-symbols-outlined text-[40px] text-outline">folder_open</span>
                    </div>
                    <p className="font-display text-headline-md text-on-surface font-bold">No Transmission Logs</p>
                    <p className="text-on-surface-variant font-body text-body-md mt-2">
                      Future alert broadcasts will be archived here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-md">
                    {history.map((item) => (
                    <div
                      key={item._id}
                      className={`relative bg-surface-container-lowest rounded-lg border border-outline-variant p-lg hover:border-primary transition-all flex flex-col gap-md ${
                        item.severity === 'Critical' ? 'border-l-4 border-l-error' : 
                        item.severity === 'Warning' ? 'border-l-4 border-l-secondary' : 'border-l-4 border-l-tertiary'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm">
                        <div className="flex flex-wrap items-center gap-sm">
                          <span className={`status-badge ${
                            item.severity === 'Critical' ? 'bg-error text-on-error' : 
                            item.severity === 'Warning' ? 'bg-secondary text-on-secondary' : 'bg-tertiary text-on-tertiary'
                          }`}>
                            {item.severity}
                          </span>
                          <time className="font-mono text-data-mono text-outline">
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </time>
                        </div>
                        
                        <div className="flex flex-col gap-1 text-xs font-mono">
                          <div className="text-on-surface-variant bg-surface-container px-3 py-1 rounded border border-outline-variant">
                            {item.species} • {item.location}
                          </div>
                          <div className="px-3">
                            <span className="text-outline">Barangay:</span> 
                            <span className="text-on-surface font-bold ml-1">{item.targetBarangay}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-display text-headline-md text-on-surface font-bold mb-2">
                          {item.title}
                        </h4>
                        
                        <p className="font-body text-body-md text-on-surface-variant leading-relaxed mb-md">
                          {item.details || item.description}
                        </p>

                        {item.instruction && (
                          <div className={`p-md rounded-lg border-l-4 ${
                            item.severity === 'Critical' ? 'bg-error-container border-error text-on-error-container' : 
                            item.severity === 'Warning' ? 'bg-surface-container-high border-secondary text-on-surface' : 'bg-tertiary-fixed border-tertiary text-on-tertiary-fixed'
                          }`}>
                            <p className="font-mono text-label-caps uppercase mb-1">Required Action:</p>
                            <p className="font-body text-body-md font-bold leading-snug">
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

              <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low flex flex-col sm:flex-row justify-between items-center gap-md">
                <p className="font-mono text-label-caps text-outline uppercase">
                  End of Archive
                </p>
                <div className="flex items-center gap-2">
                  <span className="font-display text-headline-md text-on-surface font-bold">{history.length}</span>
                  <span className="font-mono text-label-caps text-outline uppercase">Reports Logged</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Authoritative Disease Oversight Block ── */}
        <section className="mt-xl bg-[#0D1B2B] text-white rounded-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            <div className="p-xl flex flex-col justify-center">
              <h3 className="font-display text-display-lg font-bold mb-md">Authoritative Disease Oversight</h3>
              <p className="font-body text-body-lg text-white/70 mb-lg leading-relaxed">
                The Animal Disease Traceability System operates as the primary technological anchor for ADTS livestock biosecurity. 
                By integrating multi-modal data streams, we provide a sterile, high-precision environment for monitoring pathogen spread 
                and ensuring the safety of the local food supply chain.
              </p>
              <ul className="space-y-sm">
                <li className="flex items-center gap-sm text-white/80 font-body text-body-md">
                  <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px]">check_circle</span>
                  Compliance with ISO 11784/11785 standards
                </li>
                <li className="flex items-center gap-sm text-white/80 font-body text-body-md">
                  <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px]">check_circle</span>
                  Direct API integration with Local Veterinary Laboratories
                </li>
                <li className="flex items-center gap-sm text-white/80 font-body text-body-md">
                  <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px]">check_circle</span>
                  24/7 Rapid Response Outbreak Taskforce connectivity
                </li>
              </ul>
            </div>
            <div className="bg-primary/20 min-h-[300px] flex items-center justify-center">
              <div className="text-center p-xl">
                <span className="material-symbols-outlined text-[80px] text-primary-fixed-dim mb-md block" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                <p className="font-mono text-label-caps text-white/60 uppercase">Blockchain-Verified Infrastructure</p>
                <p className="font-display text-headline-md text-white/90 font-bold mt-sm">Powered by HyperLedger Fabric</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Alert History CTA ── */}
        <div className="mt-xl text-center py-xl">
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className="bg-primary text-on-primary px-xl py-md rounded-lg font-bold font-body hover:opacity-90 transition-opacity clinical-shadow flex items-center gap-sm mx-auto"
          >
            <span className="material-symbols-outlined">notifications_active</span>
            View Alert History
          </button>
        </div>
      </div>
    </div>
  );
}