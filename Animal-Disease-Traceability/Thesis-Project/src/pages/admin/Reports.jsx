import React, { useState, useEffect, useMemo } from "react";
import API_URL from "../../config/api";
import { useNavigate } from "react-router-dom";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  ArcElement, Title, Tooltip, Legend, Filler
);

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [currentModalData, setCurrentModalData] = useState({});
  const SPECIES_LIST = ["Hog", "Cow", "Chicken", "Carabao", "Goat", "Duck"];

  // --- FILTER STATES ---
  const currentYear = 2026;
  const [filterMode, setFilterMode] = useState("preset");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const MILD_CATS = ["Respiratory Infection", "Parasitic Infection", "Digestive Issue / Scours", "Skin Condition / Mange", "Physical Injury / Lameness"];
  const DANGER_CATS = ["African Swine Fever (ASF)", "Avian Influenza", "Foot and Mouth Disease (FMD)"];
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Color Palettes
  const mildColors = ["#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#F472B6", "#94A3B8"];
  const dangerousColors = ["#EF4444", "#F97316", "#B91C1C", "#64748B"];

  const animalIcons = {
    Hog: "🐖",
    Cow: "🐄",
    Chicken: "🐓",
    Carabao: "🐃",
    Goat: "🐐",
    Duck: "🦆",
  };

  //Comparison Year
  const [compareYear, setCompareYear] = useState("none"); 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_URL}/transactions`);
        const data = await res.json();
        setTransactions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleReset = () => {
    setFilterMode("preset");
    setSelectedMonth("all");
    setSelectedYear(currentYear);
    setCustomStart("");
    setCustomEnd("");
  };

  const stats = useMemo(() => {
    const monthlyTrend = Array(12).fill(0);
    const comparisonTrend = Array(12).fill(0); // For the second line
    const brgySickMap = {};
    const speciesSickMap = {};
    const diseaseMap = {};
    
    const citySpecies = {};
    SPECIES_LIST.forEach(s => {
      citySpecies[s] = { healthy: 0, sick: 0, unverified: 0, exported: 0, slaughtered: 0 };
    });

    let gHealthy = 0, gUnverified = 0, gExported = 0, gSlaughtered = 0, gTotal = 0;

    const VALID_BARANGAYS = [
      "Aplaya", "Balibago", "Caingin", "Dila", "Dita", "Don Jose", "Ibaba",
      "Kanluran", "Labas", "Macabling", "Malitlit", "Malusak", "Market Area",
      "Pooc", "Pulong Santa Cruz", "Santo Domingo", "Sinalhan", "Tagapo"
    ];

    // --- 1. PRIMARY FILTERED DATA (For KPIs and Primary Line) ---
    const filtered = transactions.filter(tx => {
      const isValidSpecies = SPECIES_LIST.includes(tx.species);
      if (!isValidSpecies) return false;

      const loc = (tx.location || "").toLowerCase().trim();
      const isBarangayMatch = VALID_BARANGAYS.some(b => loc.includes(b.toLowerCase()));
      const isSpecialLoc = loc.includes("exported") || loc.includes("outside") || loc.includes("slaughterhouse");
      
      if (!isBarangayMatch && !isSpecialLoc) return false;

      const txDate = new Date(tx.date || tx.timestamp);
      if (isNaN(txDate)) return false;

      if (filterMode === "custom") {
        const start = customStart ? new Date(customStart) : new Date("1900-01-01");
        const end = customEnd ? new Date(customEnd) : new Date("2100-12-31");
        end.setHours(23, 59, 59, 999);
        return txDate >= start && txDate <= end;
      }

      return txDate.getFullYear() === Number(selectedYear) && 
             (selectedMonth === "all" || txDate.getMonth() === Number(selectedMonth));
    });

    // --- 2. CALCULATE PRIMARY STATS ---
    filtered.forEach(tx => {
      const qty = Number(tx.quantity) || 0;
      const severity = (tx.severity || "").toLowerCase().trim();
      const loc = (tx.location || "").toLowerCase().trim();
      const spec = tx.species; 
      const isSick = severity === "sick" || severity === "mild" || severity === "dangerous";
      
      if (loc.includes("exported") || loc.includes("outside")) {
        gExported += qty;
        if (citySpecies[spec]) citySpecies[spec].exported += qty;
      } 
      else if (loc.includes("slaughterhouse")) {
        gSlaughtered += qty;
        if (citySpecies[spec]) citySpecies[spec].slaughtered += qty;
      } 
      else {
        gTotal += qty; 

        if (severity === "safe" || severity === "healthy") {
          gHealthy += qty;
          if (citySpecies[spec]) citySpecies[spec].healthy += qty;
        } else if (isSick) {
          if (citySpecies[spec]) citySpecies[spec].sick += qty;
          
          const dateObj = new Date(tx.date || tx.timestamp);
          monthlyTrend[dateObj.getMonth()] += qty;

          brgySickMap[tx.location || "Unknown"] = (brgySickMap[tx.location || "Unknown"] || 0) + qty;
          const specNorm = spec.charAt(0).toUpperCase() + spec.slice(1).toLowerCase(); 
          speciesSickMap[specNorm] = (speciesSickMap[specNorm] || 0) + qty;
          
          const diag = tx.diagnosedDisease || "Unclassified";
          const categoryMatch = [...MILD_CATS, ...DANGER_CATS].find(c => diag.includes(c)) || "Other Infections";
          diseaseMap[categoryMatch] = (diseaseMap[categoryMatch] || 0) + qty;
        } else {
          gUnverified += qty;
          if (citySpecies[spec]) citySpecies[spec].unverified += qty;
        }
      }
    });

    // --- 3. CALCULATE COMPARISON TREND (Scanning raw data) ---
    if (compareYear && compareYear !== "none") {
      transactions.forEach(tx => {
        const txDate = new Date(tx.date || tx.timestamp);
        const severity = (tx.severity || "").toLowerCase().trim();
        const isSick = severity === "sick" || severity === "mild" || severity === "dangerous";
        
        if (txDate.getFullYear() === Number(compareYear) && isSick) {
          comparisonTrend[txDate.getMonth()] += (Number(tx.quantity) || 0);
        }
      });
    }

    const totalSick = monthlyTrend.reduce((a,b) => a+b, 0);
    const maxVal = Math.max(...monthlyTrend);
    const peakMonthIdx = monthlyTrend.indexOf(maxVal);
    const labels = Object.keys(diseaseMap).filter(k => diseaseMap[k] > 0);
    
    let mIdx = 0, dIdx = 0;
    const backgroundColors = labels.map(label => {
      if (DANGER_CATS.includes(label)) return dangerousColors[dIdx++ % dangerousColors.length];
      return mildColors[mIdx++ % mildColors.length];
    });

    return {
      monthlyTrend,
      comparisonTrend, // Exporting this for the chart
      avgSick: (totalSick / 12).toFixed(1),
      peakMonth: maxVal > 0 ? MONTHS[peakMonthIdx] : "N/A",
      riskLevel: totalSick > 500 ? "HIGH" : totalSick > 200 ? "MEDIUM" : "LOW",
      topBrgys: Object.entries(brgySickMap).sort((a,b) => b[1]-a[1]).slice(0, 5),
      topSpecies: Object.entries(speciesSickMap).sort((a,b) => b[1]-a[1]).slice(0, 3),
      topDiseases: Object.entries(diseaseMap).sort((a,b) => b[1]-a[1]).slice(0, 5),
      totalSick,
      diseaseData: diseaseMap,
      pieLabels: labels,
      pieColors: backgroundColors,
      gHealthy, gUnverified, gExported, gSlaughtered, gTotal,
      citySpecies
    };
  }, [transactions, selectedYear, selectedMonth, filterMode, customStart, customEnd, compareYear]);

  const openCityWideModal = () => {
    setModalTitle("All Barangays (City-Wide)");
    setCurrentModalData(stats.citySpecies);
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-10 text-center font-bold">Syncing Data Analysis...</div>;

 return (
    <div className="min-h-screen bg-transparent p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-xs font-black text-red-600 uppercase tracking-[0.4em] mb-2">Admin Surveillance</h1>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter uppercase">
              Santa Rosa Animal Health Report Analysis
            </h2>
          </div>
          
          {/* ACTION BUTTONS GROUP */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={openCityWideModal}
              className="bg-green-600 hover:bg-green-700 hover:-translate-y-1 hover:shadow-2xl text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-95 flex-1"
            >
              <span>Animals</span>
              <span className="bg-white/25 px-2.5 py-1 rounded-lg text-xs font-bold">VIEW ALL</span>
            </button>
          </div>
        </div>

        <div id="report-content" className="p-4 bg-[#F8FAFC] rounded-[3rem]"></div>

        {/* DATE FILTER UI */}
        <div className="mb-10 flex justify-center print:hidden">
          <div className="w-full bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white p-6 flex flex-col lg:flex-row items-center justify-between gap-6 hover:shadow-2xl transition-all duration-300 group">
            
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6">
              {/* 1. Toggle Mode */}
              <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
                <button 
                  onClick={() => setFilterMode("preset")}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${filterMode === 'preset' ? 'bg-white shadow-md text-red-600' : 'text-slate-400'}`}
                >
                  Standard
                </button>
                <button 
                  onClick={() => setFilterMode("custom")}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${filterMode === 'custom' ? 'bg-white shadow-md text-red-600' : 'text-slate-400'}`}
                >
                  Custom Range
                </button>
              </div>

              {/* 2. Standard Selectors (Year/Month) */}
              <div className={`flex items-center gap-3 transition-all duration-500 ${filterMode === 'custom' ? 'opacity-20 pointer-events-none scale-95' : 'opacity-100'}`}>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none shadow-sm focus:ring-2 ring-red-500/20">
                  <option value="all">Full Year</option>
                  {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none shadow-sm focus:ring-2 ring-red-500/20">
                  {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
                </select>

                {/* Vertical Divider for Analytics */}
                <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden md:block"></div>

                {/* Comparison Tool */}
                <div className="flex flex-col">
                  <select 
                    value={compareYear} 
                    onChange={(e) => setCompareYear(e.target.value)} 
                    className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-1.5 font-bold text-blue-600 text-sm outline-none shadow-sm focus:ring-2 ring-blue-500/20"
                  >
                    <option value="none">No Comparison</option>
                    {[2026, 2025, 2024, 2023, 2022].map(y => (
                      <option key={y} value={y} disabled={Number(selectedYear) === y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Custom Range Inputs */}
              <div className={`flex items-center gap-3 transition-all duration-500 ${filterMode === 'preset' ? 'hidden' : 'opacity-100'}`}>
                <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none shadow-sm" />
                <span className="text-slate-300 font-black text-xs">TO</span>
                <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none shadow-sm" />
              </div>
            </div>

            {/* Reset Button */}
            <button onClick={handleReset} className="text-slate-400 hover:text-red-500 font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2 shrink-0">
              <span>🔄</span> Reset to {currentYear}
            </button>
          </div>
        </div>

        {/* 6 KPIS SECTION - FLASHCARD DESIGN */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
            {[
                { label: "Total Animals", val: stats.gTotal, color: "indigo", text: "text-indigo-900", sub: "text-indigo-600", bg: "bg-indigo-100/50", border: "border-indigo-200" },
                { label: "Healthy", val: stats.gHealthy, color: "emerald", text: "text-emerald-900", sub: "text-emerald-600", bg: "bg-emerald-100/50", border: "border-emerald-200" },
                { label: "Unverified", val: stats.gUnverified, color: "amber", text: "text-amber-900", sub: "text-amber-600", bg: "bg-amber-100/50", border: "border-amber-200" },
                { label: "Sick", val: stats.totalSick, color: "red", text: "text-red-900", sub: "text-red-600", bg: "bg-red-100/50", border: "border-red-200" },
                { label: "Exported", val: stats.gExported, color: "blue", text: "text-blue-900", sub: "text-blue-600", bg: "bg-blue-100/50", border: "border-blue-200" },
                { label: "Slaughtered", val: stats.gSlaughtered, color: "slate", text: "text-slate-900", sub: "text-slate-600", bg: "bg-slate-200/50", border: "border-slate-300" },
            ].map((card, i) => (
                <div key={i} className={`group relative rounded-[2rem] border ${card.border} p-6 text-center shadow-md ${card.bg} hover:bg-white hover:-translate-y-2 hover:shadow-2xl transition-all duration-300`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${card.sub}`}>{card.label}</p>
                    <p className={`text-3xl md:text-4xl font-black ${card.text}`}>
                        {card.val.toLocaleString()}
                    </p>
                    <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 ${card.sub.replace('text', 'bg')}`}></div>
                </div>
            ))}
        </div>

        {/* TOP ROW: TREND & PIE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 h-[500px] hover:shadow-2xl transition-all duration-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sick Cases Velocity</h3>
              <span className="bg-red-600 text-white px-4 py-1.5 rounded-full font-black text-xs shadow-lg shadow-red-200">{stats.totalSick} TOTAL SICK</span>
            </div>
            <div className="h-[380px]">
              <Line 
                data={{
                  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                  datasets: [
                    {
                      label: `${selectedYear} (Primary)`,
                      data: stats.monthlyTrend,
                      borderColor: "#ef4444",
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      fill: true,
                      tension: 0.4,
                    },
                    // Only show this dataset if a comparison year is selected
                    ...(compareYear !== "none" ? [{
                      label: `${compareYear} (Comparison)`,
                      data: stats.comparisonTrend,
                      borderColor: "#3b82f6", // Blue for the second year
                      backgroundColor: "transparent",
                      borderDash: [5, 5], // Dashed line to distinguish it
                      tension: 0.4,
                    }] : [])
                  ]
                }}
                options={{ 
                  responsive: true, 
                  maintainAspectRatio: false, 
                  plugins: { 
                    legend: { display: compareYear !== "none" } // Show legend only when comparing
                  } 
                }}
              />
            </div>
          </div>

          <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 h-[500px] hover:shadow-2xl transition-all duration-500">
             <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Pathogen Breakdown</h3>
             <div className="h-[380px]">
                <Pie 
                  data={{
                    labels: stats.pieLabels,
                    datasets: [{
                      data: stats.pieLabels.map(label => stats.diseaseData[label]),
                      backgroundColor: stats.pieColors,
                      borderWidth: 4,
                      borderColor: '#ffffff',
                      hoverOffset: 20
                    }]
                  }}
                  options={{ 
                    maintainAspectRatio: false, 
                    plugins: { 
                        legend: { 
                            position: 'bottom', 
                            labels: { 
                                boxWidth: 12, 
                                padding: 20,
                                font: { size: 11, weight: 'bold' },
                                usePointStyle: true
                            } 
                        } 
                    } 
                  }}
                />
             </div>
          </div>
        </div>

        {/* 3 TREND KPIS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="bg-indigo-900 border border-indigo-800 rounded-[2.5rem] p-8 flex flex-col justify-center shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-2">Monthly Average</p>
            <p className="text-5xl font-black text-white">{stats.avgSick}</p>
          </div>

          <div className="bg-red-600 border border-red-500 rounded-[2.5rem] p-8 flex flex-col justify-center shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
            <p className="text-[10px] font-black text-red-200 uppercase tracking-[0.2em] mb-2">Peak Month</p>
            <p className="text-5xl font-black text-white uppercase tracking-tighter">{stats.peakMonth}</p>
          </div>

          <div className={`rounded-[2.5rem] p-8 flex flex-col justify-center border shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${
            stats.riskLevel === 'HIGH' ? 'bg-red-700 border-red-600' : 'bg-emerald-700 border-emerald-600'
          }`}>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${
              stats.riskLevel === 'HIGH' ? 'text-red-200' : 'text-emerald-200'
            }`}>Risk Level</p>
            <p className={`text-5xl font-black text-white`}>{stats.riskLevel}</p>
          </div>
        </div>

        {/* BOTTOM ROW: RANKINGS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* 1. Hotspot Barangays */}
          <div className="bg-gradient-to-br from-white to-slate-50/80 p-6 sm:p-8 rounded-[2.5rem] shadow-lg border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-widest mb-5 sm:mb-6 flex items-center gap-2">
              <span className="text-red-500 text-lg">🔥</span> Hotspot Barangays
            </h3>
            <div className="space-y-3 sm:space-y-4">
              {stats.topBrgys.map(([name, count], i) => (
                <div 
                  key={i} 
                  className="flex justify-between items-center p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 hover:border-red-200 hover:bg-red-50/30 transition-all duration-200 shadow-sm"
                >
                  <span className="font-bold text-slate-800 text-sm sm:text-base uppercase tracking-tight">
                    {name}
                  </span>
                  <span className="text-red-600 font-black text-lg sm:text-xl px-4 py-1.5 bg-red-50 rounded-xl shadow-sm border border-red-100">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Top Pathogens */}
          <div className="bg-gradient-to-br from-white to-slate-50/80 p-6 sm:p-8 rounded-[2.5rem] shadow-lg border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-widest mb-5 sm:mb-6 flex items-center gap-2">
              <span className="text-red-500 text-lg">🦠</span> Top Pathogens
            </h3>
            <div className="space-y-4 sm:space-y-5">
              {stats.topDiseases.map(([name, count], i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800 text-sm sm:text-base uppercase tracking-tight">
                      {name}
                    </span>
                    <span className="font-black text-red-600 text-base sm:text-lg">
                      {count}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 sm:h-3 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        DANGER_CATS.includes(name) ? 'bg-red-600' : 'bg-blue-600'
                      }`}
                      style={{ 
                        width: `${stats.totalSick > 0 ? (count / stats.totalSick) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Vulnerable Species */}
          <div className="bg-gradient-to-br from-white to-slate-50/80 p-6 sm:p-8 rounded-[2.5rem] shadow-lg border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-widest mb-5 sm:mb-6 flex items-center gap-2">
              <span className="text-amber-500 text-lg">🐄</span> Vulnerable Species
            </h3>
            <div className="space-y-4 sm:space-y-5">
              {stats.topSpecies.map(([name, count], i) => (
                <div 
                  key={i} 
                  className="group flex items-center gap-4 p-4 sm:p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:border-amber-200 hover:bg-amber-50/30 transition-all duration-200"
                >
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-300 shadow-inner">
                    {animalIcons[name] || "🐾"}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-800 uppercase text-xs sm:text-sm tracking-wider">
                      {name}
                    </p>
                    <p className="text-amber-600 font-black text-xl sm:text-2xl mt-0.5">
                      {count} <span className="text-[10px] sm:text-xs text-slate-500 uppercase font-bold">Impacted</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL SECTION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-[#F8FAFC] w-full max-w-6xl rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] border border-white/20 scale-100 animate-in fade-in zoom-in duration-300">
            <div className="bg-white px-10 py-8 flex justify-between items-center border-b border-slate-100">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-green-600 text-white rounded-2xl text-2xl shadow-lg shadow-green-200">📊</div>
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Species Breakdown</h2>
                  <p className="text-green-600 font-bold text-xs uppercase tracking-[0.2em] mt-2">{modalTitle}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all font-bold">✕</button>
            </div>
            
            <div className="p-8 flex-grow overflow-y-auto bg-[#F8FAFC]">
              <div className="grid grid-cols-12 px-6 mb-4 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em]">
                <div className="col-span-3">Species Classification</div>
                <div className="col-span-2 text-center">Healthy</div>
                <div className="col-span-2 text-center">Sick</div>
                <div className="col-span-2 text-center">Unverified</div>
                <div className="col-span-1.5 text-center">Exp.</div>
                <div className="col-span-1.5 text-center">Slaught.</div>
              </div>
              
              <div className="flex flex-col gap-3">
                {SPECIES_LIST.map(name => {
                  const data = currentModalData[name] || {};
                  return (
                    <div key={name} className="grid grid-cols-12 items-center bg-white py-4 px-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="col-span-3 flex items-center gap-4">
                        <span className="text-3xl">{animalIcons[name] || "🐾"}</span>
                        <span className="font-black text-slate-800 text-sm uppercase tracking-tight">{name}</span>
                      </div>
                      <div className="col-span-2 flex justify-center"><div className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-lg min-w-[70px] text-center shadow-sm shadow-emerald-100">{data.healthy || 0}</div></div>
                      <div className="col-span-2 flex justify-center"><div className={`${(data.sick || 0) > 0 ? 'bg-red-600 text-white' : 'bg-slate-50 text-slate-300'} px-4 py-2 rounded-xl font-black text-lg min-w-[70px] text-center`}>{data.sick || 0}</div></div>
                      <div className="col-span-2 flex justify-center"><div className={`${(data.unverified || 0) > 0 ? 'bg-amber-500 text-white' : 'bg-slate-50 text-slate-300'} px-4 py-2 rounded-xl font-black text-lg min-w-[70px] text-center`}>{data.unverified || 0}</div></div>
                      <div className="col-span-1.5 flex justify-center"><span className="text-blue-600 font-black text-xl">{data.exported || 0}</span></div>
                      <div className="col-span-1.5 flex justify-center"><span className="text-rose-600 font-black text-xl">{data.slaughtered || 0}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="px-10 py-8 bg-white border-t border-slate-100 flex justify-end">
              <button onClick={() => setIsModalOpen(false)} className="bg-slate-900 hover:bg-black text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95">Close Monitor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}