import React, { useState, useEffect } from "react";
import API_URL from "../../config/api";
import { Bar, Pie } from "react-chartjs-2";
import { MapContainer, TileLayer, ZoomControl, useMap, Marker, Tooltip as MapTooltip } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Small delay to ensure the DOM has finished its transition
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 500);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function AnimalMovement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState({
    healthy: 0,
    sick: 0,
    unverified: 0,
    speciesCounts: {},
    logistics: { exported: 0, slaughtered: 0 },
    verifiedRatio: "0%"
  });
  const [barangayMapStats, setBarangayMapStats] = useState({});
  const [topBarangays, setTopBarangays] = useState([]);
  const [rawTransactions, setRawTransactions] = useState([]);
  const currentYear = new Date().getFullYear();
  const [filterMode, setFilterMode] = useState("preset");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const SPECIES_LIST = ["Hog", "Cow", "Chicken", "Carabao", "Goat", "Duck"];
  const VALID_BARANGAYS = [
    "Aplaya", "Balibago", "Caingin", "Dila", "Dita", "Don Jose", "Ibaba",
    "Kanluran", "Labas", "Macabling", "Malitlit", "Malusak", "Market Area",
    "Pooc", "Pulong Santa Cruz", "Santo Domingo", "Sinalhan", "Tagapo"
  ];
  const BARANGAY_COORDINATES = {
  "Aplaya": [14.31154598315434, 121.12293649608242],
  "Balibago": [14.295928037194432, 121.10483051593049],
  "Caingin": [14.299639566034141, 121.12806320764989],
  "Dila": [14.288382907890114, 121.10856053327888],
  "Dita": [14.282172894149047, 121.11144758254402],
  "Don Jose": [14.25681265902661, 121.06571229500739],
  "Ibaba": [14.314844035906486, 121.11829909282906],
  "Kanluran": [14.313429086779156, 121.10761473720632],
  "Labas": [14.307775632796462, 121.10983860765154],
  "Macabling": [14.300437657033717, 121.09874086248247],
  "Malitlit": [14.269554848891717, 121.11103866162414],
  "Malusak": [14.308738806283637, 121.1100518625647],
  "Market Area": [14.31930947044648, 121.11206199783588],
  "Pooc": [14.300886387511014, 121.11185033098216],
  "Pulong Santa Cruz": [14.277419422192516, 121.08197606230414],
  "Santo Domingo": [14.228257428044847, 121.04807642172844],
  "Sinalhan": [14.33112133732167, 121.11154140765628],
  "Tagapo": [14.31941890986217, 121.10300068435367]
};

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (rawTransactions.length > 0 || !loading) {
      applyFilters();
    }
  }, [rawTransactions, selectedMonth, selectedYear, customStart, customEnd, filterMode]);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/transactions`);
      const data = await res.json();
      const txData = Array.isArray(data) ? data : [];
      setRawTransactions(txData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = rawTransactions.filter(tx => {
      const txDate = new Date(tx.timestamp);
      if (isNaN(txDate)) return false;

      if (filterMode === "custom") {
        const start = customStart ? new Date(customStart) : new Date("1900-01-01");
        const end = customEnd ? new Date(customEnd) : new Date("2100-12-31");
        end.setHours(23, 59, 59, 999);
        return txDate >= start && txDate <= end;
      } else {
        const yearMatch = txDate.getFullYear() === Number(selectedYear);
        const monthMatch = selectedMonth === "all" || txDate.getMonth() === Number(selectedMonth);
        return yearMatch && monthMatch;
      }
    });
    processData(filtered);
  };

  const handleReset = () => {
    setFilterMode("preset");
    setSelectedMonth("all");
    setSelectedYear(currentYear);
    setCustomStart("");
    setCustomEnd("");
  };

  const processData = (txList) => {
    const brgyGroup = {};
    const speciesCounts = {};
    let exp = 0, slaught = 0, gHealthy = 0, gSick = 0, gUnverified = 0;

    SPECIES_LIST.forEach(s => speciesCounts[s] = 0);
    VALID_BARANGAYS.forEach(name => {
      brgyGroup[name] = { total: 0, healthy: 0, mild: 0, critical: 0, sick: 0, unverified: 0 };
    });

    txList.forEach((tx) => {
      const loc = (tx.location || "").toLowerCase().trim();
      const spec = tx.species;
      const qty = Number(tx.quantity) || 0;
      const severity = (tx.severity || "").toLowerCase().trim();

      if (loc.includes("slaughterhouse")) { slaught += qty; return; }
      if (loc.includes("exported") || loc.includes("outside")) { exp += qty; return; }

      const match = VALID_BARANGAYS.find(b => loc.includes(b.toLowerCase()));
      if (match) {
        if (severity === "safe" || severity === "healthy") {
          gHealthy += qty;
          brgyGroup[match].healthy += qty;
        } else if (severity === "critical" || severity === "dangerous") {
          gSick += qty;
          brgyGroup[match].sick += qty;
          brgyGroup[match].critical += qty;
        } else if (severity === "mild" || severity === "sick") {
          gSick += qty;
          brgyGroup[match].sick += qty;
          brgyGroup[match].mild += qty;
        } else {
          gUnverified += qty;
          brgyGroup[match].unverified += qty;
        }

        if (SPECIES_LIST.includes(spec)) {
          speciesCounts[spec] += qty;
        }
        brgyGroup[match].total += qty;
      }
    });

    const verified = gHealthy + gSick;
    const verifiedRatio = (verified + gUnverified) > 0 ? ((verified / (verified + gUnverified)) * 100).toFixed(1) + "%" : "0%";

    const topBrgys = Object.entries(brgyGroup)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));

    setTransactions({
      healthy: gHealthy,
      sick: gSick,
      unverified: gUnverified,
      speciesCounts,
      logistics: { exported: exp, slaughtered: slaught },
      verifiedRatio,
    });
    setBarangayMapStats(brgyGroup);
    setTopBarangays(topBrgys);
  };

  const getColor = (stats) => {
    if (stats.critical > 0) return '#ef4444'; 
    if (stats.mild > 0) return '#f97316';     
    return '#10b981';                         
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
          Fetching Movement data...
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 via-green-50/20 to-emerald-50/10 min-h-screen pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-10 font-sans relative">
      
      {/* CENTERED DATE FILTER */}
      <div className="max-w-7xl mx-auto mb-8 sm:mb-10 flex justify-center print:hidden">
        <div className="w-full bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-lg border border-slate-200/60 p-5 sm:p-6 flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <div className="bg-slate-100 p-1 rounded-xl sm:rounded-2xl flex gap-1">
              <button 
                onClick={() => setFilterMode("preset")}
                className={`px-5 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs font-black uppercase transition-all ${filterMode === 'preset' ? 'bg-white shadow-sm text-green-600' : 'text-slate-400'}`}
              >
                Standard
              </button>
              <button 
                onClick={() => setFilterMode("custom")}
                className={`px-5 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs font-black uppercase transition-all ${filterMode === 'custom' ? 'bg-white shadow-sm text-green-600' : 'text-slate-400'}`}
              >
                Custom
              </button>
            </div>

            <div className={`flex gap-3 transition-all ${filterMode === 'custom' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20 text-sm sm:text-base"
              >
                <option value="all">Full Year</option>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2 font-bold text-slate-700 outline-none text-sm sm:text-base"
              >
                {[currentYear, currentYear-1, currentYear-2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className={`flex items-center gap-3 transition-all ${filterMode === 'preset' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
              <input 
                type="date" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2 font-bold text-slate-700 outline-none text-sm sm:text-base"
              />
              <span className="text-slate-300 font-black text-sm">–</span>
              <input 
                type="date" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2 font-bold text-slate-700 outline-none text-sm sm:text-base"
              />
            </div>
          </div>

          <button 
            onClick={handleReset}
            className="text-slate-400 hover:text-red-500 font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2 mt-3 lg:mt-0"
          >
            <span>🔄</span> Reset
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 items-stretch">
        
        {/* SIDEBAR */}
        <aside className="
          w-full lg:w-[380px] xl:w-[420px] 
          bg-white/95 backdrop-blur-md 
          rounded-[2.5rem] sm:rounded-[3rem] 
          border border-slate-200/80 
          p-6 sm:p-8 lg:p-10 
          shadow-xl 
          lg:sticky lg:top-24 
          h-fit flex flex-col transition-all z-20
        ">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-2">Animal Movement</h1>
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-green-600">Santa Rosa City • Real-Time Traceability</p>

          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 sm:mt-10">
            <div className="bg-emerald-50 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-emerald-100 text-center">
              <p className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-700 mb-1">Healthy</p>
              <p className="text-xl sm:text-2xl font-black text-emerald-800">{transactions.healthy.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-red-100 text-center">
              <p className="text-[9px] sm:text-[10px] font-black uppercase text-red-700 mb-1">At-Risk</p>
              <p className="text-xl sm:text-2xl font-black text-red-800">{transactions.sick.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-amber-100 text-center">
              <p className="text-[9px] sm:text-[10px] font-black uppercase text-amber-700 mb-1">Pending</p>
              <p className="text-xl sm:text-2xl font-black text-amber-800">{transactions.unverified.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 bg-slate-50/80 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 space-y-3">
            <div className="flex justify-between items-center px-3 py-2 bg-white/60 rounded-xl text-xs font-bold uppercase text-slate-600">
              <span>Exported</span>
              <span className="text-base sm:text-lg text-slate-800">{transactions.logistics.exported.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2 bg-white/60 rounded-xl text-xs font-bold uppercase text-red-700">
              <span>Slaughtered</span>
              <span className="text-base sm:text-lg text-red-800">{transactions.logistics.slaughtered.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2 bg-white/60 rounded-xl text-xs font-bold uppercase text-amber-600">
              <span>Verified Ratio</span>
              <span className="text-base sm:text-lg text-amber-700">{transactions.verifiedRatio}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 mt-6 sm:mt-8 p-5 sm:p-6 shadow-sm">
            <h3 className="text-sm sm:text-base font-black uppercase tracking-widest text-slate-500 mb-4 sm:mb-6 text-center">
              Livestock Species Distribution
            </h3>
            <div className="h-56 sm:h-64">
              {transactions?.speciesCounts ? (
                <Pie
                  data={{
                    labels: SPECIES_LIST,
                    datasets: [{
                      data: SPECIES_LIST.map(s => transactions.speciesCounts[s] || 0),
                      backgroundColor: ["#f59e0b", "#3b82f6", "#ef4444", "#06b6d4", "#10b981", "#6366f1"],
                      hoverBackgroundColor: ["#d97706", "#2563eb", "#dc2626", "#0891b2", "#059669", "#4f46e5"],
                      borderWidth: 2,
                      borderColor: '#ffffff',
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                      legend: { 
                        display: true, 
                        position: 'bottom',
                        labels: {
                          usePointStyle: true,
                          padding: 12,
                          font: { size: 10, weight: 'bold' },
                          color: '#475569'
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase text-xs">
                  Synchronizing Species Data...
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
            <button onClick={() => navigate("/home")} className="px-8 sm:px-10 py-4 sm:py-5 bg-slate-800 text-white rounded-2xl font-black text-base sm:text-lg transition-all shadow-xl hover:bg-slate-700 active:scale-95 w-full sm:w-auto">
            ← Return to Home
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col gap-6 sm:gap-8">
          <div className="group bg-white rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-200 shadow-xl p-6 sm:p-8 lg:p-10 flex flex-col flex-grow min-h-[500px] sm:min-h-[750px] relative z-0">
            <div className="mb-6 sm:mb-8 px-2">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Livestock Distribution Map</h2>
              <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">
                Real-Time Health Monitoring
              </p>
            </div>

            {/* MAP CONTAINER - Fixed height to ensure tiles render */}
            <div className="rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-inner flex-grow relative z-0 h-[450px] sm:h-[600px] w-full">
              <MapContainer
                center={[14.311, 121.11]}
                zoom={11.5}
                zoomControl={false}
                style={{ height: "100%", width: "100%" }}
              >
                {/* LEAFLET HEALTH LEGEND */}
                <div
                  className="
                    absolute 
                    top-4 
                    left-4 
                    bg-white/90 
                    backdrop-blur-xl
                    px-4 
                    py-4
                    rounded-3xl
                    shadow-[0_8px_30px_rgba(0,0,0,0.12)]
                    border border-white/70
                    z-[1000]
                    pointer-events-none
                    min-w-[220px]
                  "
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></div>

                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                      Health Legend
                    </p>
                  </div>

                  {/* Legend Items */}
                  <div className="space-y-2.5">

                    {/* Healthy */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-[#10b981] blur-[5px] opacity-40"></div>
                          <div className="relative w-3.5 h-3.5 rounded-full bg-[#10b981] border border-white shadow-md"></div>
                        </div>

                        <span className="text-xs font-extrabold text-slate-700">
                          Healthy
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-slate-400">
                        No Cases
                      </span>
                    </div>

                    {/* Mild */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-[#f97316] blur-[5px] opacity-40"></div>
                          <div className="relative w-3.5 h-3.5 rounded-full bg-[#f97316] border border-white shadow-md"></div>
                        </div>

                        <span className="text-xs font-extrabold text-slate-700">
                          Warning
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-slate-400">
                        Mild Cases
                      </span>
                    </div>

                    {/* Critical */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="absolute inset-0 rounded-full bg-[#ef4444] blur-[5px] opacity-40"></div>
                          <div className="relative w-3.5 h-3.5 rounded-full bg-[#ef4444] border border-white shadow-md"></div>
                        </div>

                        <span className="text-xs font-extrabold text-slate-700">
                          Critical
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-slate-400">
                        ASF / Flu / FMD
                      </span>
                    </div>
                  </div>
                </div>
                <MapResizer />

                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {/* REPLACED GEOJSON WITH PREMIUM MODERN COLOR-CODED PINS */}
                {Object.entries(BARANGAY_COORDINATES).map(([brgyName, coords]) => {
                  const currentStats = barangayMapStats[brgyName] || {
                    total: 0,
                    healthy: 0,
                    mild: 0,
                    critical: 0,
                    unverified: 0,
                  };

                  const markerColor = getColor(currentStats);

                  // Premium glossy animated map pin
                  const customIcon = L.divIcon({
                    html: `
                      <div style="
                        position: relative;
                        width: 52px;
                        height: 52px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transform: translateY(-2px);
                      ">

                        <!-- Pulse Glow -->
                        <div style="
                          position: absolute;
                          width: 26px;
                          height: 26px;
                          background: ${markerColor};
                          border-radius: 999px;
                          opacity: 0.25;
                          filter: blur(8px);
                          animation: pulseMarker 2s infinite;
                        "></div>

                        <!-- Main Pin -->
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 64 64"
                          style="
                            width: 52px;
                            height: 52px;
                            overflow: visible;
                            filter:
                              drop-shadow(0px 5px 8px rgba(0,0,0,0.35))
                              drop-shadow(0px 1px 2px rgba(255,255,255,0.25));
                          "
                        >

                          <!-- Pin Shape -->
                          <path
                            d="M32 2C20.4 2 11 11.4 11 23c0 15.4 18.2 34.8 20 36.7a1.5 1.5 0 002.1 0C34.8 57.8 53 38.4 53 23 53 11.4 43.6 2 32 2z"
                            fill="${markerColor}"
                            stroke="#ffffff"
                            stroke-width="2.5"
                          />

                          <!-- Glossy Overlay -->
                          <ellipse
                            cx="26"
                            cy="18"
                            rx="12"
                            ry="7"
                            fill="rgba(255,255,255,0.35)"
                            transform="rotate(-20 26 18)"
                          />

                          <!-- Inner White Ring -->
                          <circle
                            cx="32"
                            cy="23"
                            r="10"
                            fill="#ffffff"
                            opacity="0.98"
                          />

                          <!-- Core Status Dot -->
                          <circle
                            cx="32"
                            cy="23"
                            r="5"
                            fill="${markerColor}"
                          />

                        </svg>
                      </div>

                      <style>
                        @keyframes pulseMarker {
                          0% {
                            transform: scale(0.9);
                            opacity: 0.35;
                          }
                          70% {
                            transform: scale(1.8);
                            opacity: 0;
                          }
                          100% {
                            transform: scale(0.9);
                            opacity: 0;
                          }
                        }
                      </style>
                    `,
                    className: "custom-premium-pin",
                    iconSize: [52, 52],
                    iconAnchor: [26, 52],
                    popupAnchor: [0, -45],
                  });

                  return (
                    <Marker
                      key={`marker-${brgyName}-${JSON.stringify(barangayMapStats)}`}
                      position={coords}
                      icon={customIcon}
                    >
                      <MapTooltip sticky opacity={0.96}>
                        <div
                          style={{
                            fontFamily: "Inter, sans-serif",
                            padding: "10px",
                            minWidth: "170px",
                          }}
                        >
                          <strong
                            style={{
                              textTransform: "uppercase",
                              borderBottom: "1px solid #e5e7eb",
                              display: "block",
                              paddingBottom: "6px",
                              marginBottom: "6px",
                              fontSize: "13px",
                              letterSpacing: "0.5px",
                            }}
                          >
                            Brgy {brgyName}
                          </strong>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                            <span style={{ color: "#64748b", fontWeight: 700 }}>HEALTHY</span>
                            <span style={{ fontWeight: 900, color: "#059669" }}>
                              {currentStats.healthy.toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                            <span style={{ color: "#64748b", fontWeight: 700 }}>MILD</span>
                            <span style={{ fontWeight: 900, color: "#f97316" }}>
                              {currentStats.mild.toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                            <span style={{ color: "#64748b", fontWeight: 700 }}>CRITICAL</span>
                            <span style={{ fontWeight: 900, color: "#dc2626" }}>
                              {currentStats.critical.toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "5px" }}>
                            <span style={{ color: "#64748b", fontWeight: 700 }}>UNVERIFIED</span>
                            <span style={{ fontWeight: 900, color: "#d97706" }}>
                              {currentStats.unverified.toLocaleString()}
                            </span>
                          </div>

                          <div
                            style={{
                              borderTop: "1px solid #e5e7eb",
                              paddingTop: "6px",
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: "12px",
                              fontWeight: 900,
                            }}
                          >
                            <span>TOTAL</span>
                            <span>{currentStats.total.toLocaleString()}</span>
                          </div>
                        </div>
                      </MapTooltip>
                    </Marker>
                  );
                  
                })}
              </MapContainer>
            </div>
          </div>
          
          {/* Top Barangays List */}
          <div className="bg-white rounded-[2.5rem] sm:rounded-[3rem] border border-slate-200 shadow-xl p-6 sm:p-8 lg:p-10">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 mb-4 sm:mb-6 tracking-tight">
              Top 5 Movement Activity Barangays
            </h3>
            <div className="space-y-3 sm:space-y-4 max-h-[350px] sm:max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
              {topBarangays.length > 0 ? topBarangays.map((brgy) => (
                <div 
                  key={brgy.name}
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all hover:shadow-md gap-3 sm:gap-0"
                >
                  <div>
                    <p className="font-bold text-slate-900 text-base sm:text-lg">Brgy {brgy.name}</p>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1">
                      {brgy.critical > 0 ? (
                        <span className="text-red-600 font-bold">{brgy.critical} CRITICAL CASES</span>
                      ) : brgy.mild > 0 ? (
                        <span className="text-orange-600 font-bold">{brgy.mild} mild cases</span>
                      ) : "All healthy"}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-2xl sm:text-3xl font-black text-slate-900">{brgy.total.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Total Heads</p>
                  </div>
                </div>
              )) : (
                <div className="p-8 sm:p-10 text-center text-slate-400 font-black uppercase text-xs">
                  No data found for selected date range
                </div>
              )}
            </div>
          </div>

          {/* Analytics Summary */}
          <div className="mt-12 sm:mt-16 flex justify-center max-w-7xl mx-auto px-2 sm:px-0">
            <div className="group bg-gradient-to-r from-indigo-50 via-emerald-50 to-blue-50 p-8 sm:p-10 lg:p-12 rounded-[2.5rem] sm:rounded-[3rem] border border-indigo-200/60 shadow-2xl w-full transition-all duration-500 hover:shadow-3xl hover:-translate-y-2 text-center">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-indigo-900 mb-4 sm:mb-6 tracking-tight uppercase">
                Movement Analytics Summary
              </h3>
              
              <div className="space-y-4 sm:space-y-6 text-slate-800 leading-relaxed text-base sm:text-lg max-w-4xl mx-auto px-2 sm:px-0">
                <p>
                  Current tracking confirms <strong>{transactions.healthy.toLocaleString()}</strong> healthy heads and 
                  <strong> {transactions.sick.toLocaleString()}</strong> at-risk animals in transit. 
                  The verified data integrity ratio currently stands at <strong>{transactions.verifiedRatio}</strong>.
                </p>

                {transactions.sick > 0 ? (
                  <p className="text-red-700 font-medium bg-red-50/50 py-3 sm:py-4 rounded-2xl border border-red-100 px-4 sm:px-6">
                    <strong>Containment Protocol:</strong> {transactions.sick} heads detected with potential pathogens. 
                    Movements in high-risk Barangays (Red Zones) should be restricted to prevent cross-contamination.
                  </p>
                ) : (
                  <p className="text-emerald-700 font-medium bg-emerald-50/50 py-3 sm:py-4 rounded-2xl border border-emerald-100 px-4 sm:px-6">
                    <strong>Clean Transit:</strong> No critical infections detected in current movements. 
                    Biosecurity certificates are clear for the selected period.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-x-8 gap-y-2 text-slate-600 font-bold uppercase text-xs sm:text-sm pt-4 border-t border-indigo-100/50">
                  <span>Total Slaughtered: <span className="text-slate-900">{transactions.logistics.slaughtered.toLocaleString()}</span></span>
                  <span className="hidden sm:inline text-indigo-200">•</span>
                  <span>Total Exported: <span className="text-slate-900">{transactions.logistics.exported.toLocaleString()}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}