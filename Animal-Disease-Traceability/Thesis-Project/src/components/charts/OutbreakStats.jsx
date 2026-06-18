import React, { useState, useEffect } from "react";
import API_URL from "../../config/api";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useNavigate } from "react-router-dom";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function OutbreakStats() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBrgyModalOpen, setIsBrgyModalOpen] = useState(false);
  const [modalView, setModalView] = useState(""); 
  const [searchTerm, setSearchTerm] = useState("");

  const currentYear = new Date().getFullYear();
  const [filterMode, setFilterMode] = useState("preset");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const VALID_BARANGAYS = [
    "Aplaya", "Balibago", "Caingin", "Dila", "Dita", "Don Jose", "Ibaba",
    "Kanluran", "Labas", "Macabling", "Malitlit", "Malusak", "Market Area",
    "Pooc", "Pulong Santa Cruz", "Santo Domingo", "Sinalhan", "Tagapo"
  ];
  const [expandedBrgy, setExpandedBrgy] = useState(null);

  const MILD_CATS = ["Respiratory Infection", "Parasitic Infection", "Digestive Issue / Scours", "Skin Condition / Mange", "Physical Injury / Lameness"];
  const DANGER_CATS = ["African Swine Fever (ASF)", "Avian Influenza", "Foot and Mouth Disease (FMD)"];

  const animalIcons = {
    Hog: "🐖",
    Cow: "🐄",
    Chicken: "🐓",
    Carabao: "🐃",
    Goat: "🐐",
    Duck: "🦆",
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${API_URL}/transactions`);
        const data = await res.json();
        setTransactions(data || []);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const filteredTransactions = transactions.filter(tx => {
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

  const handleReset = () => {
    setFilterMode("preset");
    setSelectedMonth("all");
    setSelectedYear(currentYear);
    setCustomStart("");
    setCustomEnd("");
  };

  const mildCounts = { "Respiratory Infection": 0, "Parasitic Infection": 0, "Digestive Issue / Scours": 0, "Skin Condition / Mange": 0, "Physical Injury / Lameness": 0, "Others": 0 };
  const dangerousCounts = { "African Swine Fever (ASF)": 0, "Avian Influenza": 0, "Foot and Mouth Disease (FMD)": 0, "Others": 0 };

  const animalStats = {
    Hog: { total: 0, mild: { ...mildCounts }, dangerous: { ...dangerousCounts } },
    Cow: { total: 0, mild: { ...mildCounts }, dangerous: { ...dangerousCounts } },
    Chicken: { total: 0, mild: { ...mildCounts }, dangerous: { ...dangerousCounts } },
    Carabao: { total: 0, mild: { ...mildCounts }, dangerous: { ...dangerousCounts } },
    Goat: { total: 0, mild: { ...mildCounts }, dangerous: { ...dangerousCounts } },
    Duck: { total: 0, mild: { ...mildCounts }, dangerous: { ...dangerousCounts } },
  };

  const brgyStats = {};
  VALID_BARANGAYS.forEach(name => {
    brgyStats[`Brgy ${name}`] = {
      mild: { ...mildCounts },
      dangerous: { ...dangerousCounts }
    };
  });

  filteredTransactions.forEach((tx) => {
    const qty = Number(tx.quantity) || 1;
    const disease = tx.diagnosedDisease || "";
    const species = tx.animalType || tx.species;
    const loc = (tx.location || "").toLowerCase().trim();

    if (loc.includes("exported") || loc.includes("slaughterhouse")) return;

    const match = VALID_BARANGAYS.find(b => loc.includes(b.toLowerCase()));
    if (match) {
      const brgyKey = `Brgy ${match}`;
      if (tx.severity === "mild") {
        const key = MILD_CATS.find(k => disease.includes(k)) || "Others";
        mildCounts[key] += qty;
        if (brgyStats[brgyKey]) brgyStats[brgyKey].mild[key] += qty;
        if (animalStats[species]) animalStats[species].mild[key] += qty;
      } else if (tx.severity === "dangerous") {
        const key = DANGER_CATS.find(k => disease.includes(k)) || "Others";
        dangerousCounts[key] += qty;
        if (brgyStats[brgyKey]) brgyStats[brgyKey].dangerous[key] += qty;
        if (animalStats[species]) animalStats[species].dangerous[key] += qty;
      }
    }
  });

  const openFilteredModal = (type) => { setModalView(type); setIsModalOpen(true); };
  const openBrgyModal = (type) => { setModalView(type); setIsBrgyModalOpen(true); };

  const createChartData = (counts, colors) => ({
    labels: Object.keys(counts),
    datasets: [{ data: Object.values(counts), backgroundColor: colors, borderColor: "#ffffff", borderWidth: 3, hoverOffset: 15 }]
  });

  const mildColors = ["#60A5FA", "#34D399", "#FBBF24", "#A78BFA", "#F472B6", "#94A3B8"];
  const dangerousColors = ["#EF4444", "#F97316", "#B91C1C", "#64748B"];

  const pieOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { padding: 20, font: { size: 13, weight: "bold" }, usePointStyle: true } },
      title: { display: true, text: title, font: { size: 20, weight: "bold" }, color: "#1F2937" }
    }
  });

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
        <p className="text-slate-500 font-bold text-xs mt-2 tracking-[0.2em] animate-pulse">Fetching Outbreak Statistics data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-12 font-sans">
      
      {/* ANIMAL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-[#F8FAFC] rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">
            
            {/* Header */}
            <div className="p-6 sm:p-8 border-b bg-white sticky top-0 z-10">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl shadow-lg ${modalView === 'mild' ? 'bg-blue-600' : 'bg-red-600'} text-white text-xl sm:text-2xl`}>
                    🐾
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                      {modalView === 'mild' ? 'Species Health Profile' : 'High-Risk Species Data'}
                    </h2>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Livestock & Poultry Classification</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all font-bold text-xl">✕</button>
              </div>
              
              <div className="relative">
                <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg sm:text-xl">🔍</span>
                <input 
                  type="text"
                  placeholder="Search Animal Species..."
                  value={searchTerm}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-200/50 font-bold text-slate-700 transition-all text-sm sm:text-base"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-grow bg-[#F8FAFC]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
                {Object.entries(animalStats)
                  .filter(([animal]) => animal.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(([animal, data]) => {
                    const totalCases = Object.values(data[modalView]).reduce((a, b) => a + b, 0);
                    const isExpanded = expandedBrgy === animal;

                    return (
                      <div 
                        key={animal} 
                        className={`group bg-white rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden ${
                          isExpanded ? 'ring-2 ring-indigo-500/20 border-indigo-200 shadow-xl scale-[1.01]' : 'border-slate-100 shadow-sm hover:border-slate-300'
                        }`}
                      >
                        <div 
                          className="p-5 sm:p-6 flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedBrgy(isExpanded ? null : animal)}
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <span className="text-3xl sm:text-4xl filter drop-shadow-sm group-hover:scale-110 transition-transform">{animalIcons[animal] || "🐾"}</span>
                            <div className="flex flex-col">
                              <h4 className="font-bold text-slate-800 text-base sm:text-lg leading-tight uppercase tracking-tight">{animal}</h4>
                              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {isExpanded ? 'Hide Details' : 'Show Details'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 sm:gap-4">
                            {totalCases === 0 ? (
                              <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] sm:text-xs font-black uppercase">Clear</span>
                            ) : (
                              <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-black uppercase ${
                                modalView === 'mild' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {totalCases} CASES
                              </span>
                            )}
                            
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        </div>

                        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                          <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
                            <div className="p-3 sm:p-4 bg-slate-50 rounded-2xl space-y-2 sm:space-y-3 border border-slate-100">
                              {totalCases > 0 ? (
                                Object.entries(data[modalView]).map(([name, count]) => (
                                  count > 0 && (
                                    <div key={name} className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold uppercase">
                                      <span className="text-slate-500 truncate pr-3 sm:pr-4">{name}</span>
                                      <span className={`px-2 py-0.5 rounded-md ${modalView === 'mild' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                        {count}
                                      </span>
                                    </div>
                                  )
                                ))
                              ) : (
                                <div className="text-center py-2 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  No cases reported for this species
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BARANGAY MODAL */}
      {isBrgyModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsBrgyModalOpen(false)}></div>
          <div className="relative bg-[#F8FAFC] rounded-[2rem] sm:rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-white/20">
            
            <div className="p-6 sm:p-8 border-b bg-white sticky top-0 z-10">
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl shadow-lg ${modalView === 'mild' ? 'bg-blue-600' : 'bg-red-600'} text-white text-xl sm:text-2xl`}>
                    {modalView === 'mild' ? '🏥' : '🚨'}
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                      {modalView === 'mild' ? 'Health Mapping' : 'Critical Surveillance'}
                    </h2>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">ADTS Regional Records</p>
                  </div>
                </div>
                <button onClick={() => setIsBrgyModalOpen(false)} className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all font-bold text-xl">✕</button>
              </div>
              
              <div className="relative">
                <span className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg sm:text-xl">🔍</span>
                <input 
                  type="text"
                  placeholder="Search Barangay Name..."
                  value={searchTerm}
                  className="w-full pl-10 sm:pl-12 pr-4 py-3 sm:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-slate-200/50 font-bold text-slate-700 transition-all text-sm sm:text-base"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto flex-grow bg-[#F8FAFC]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
                {Object.entries(brgyStats)
                  .filter(([brgy]) => brgy.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(([brgy, data]) => {
                    const totalCount = Object.values(data[modalView]).reduce((a, b) => a + b, 0);
                    const isExpanded = expandedBrgy === brgy;

                    return (
                      <div 
                        key={brgy} 
                        className={`group bg-white rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden ${
                          isExpanded ? 'ring-2 ring-indigo-500/20 border-indigo-200 shadow-xl' : 'border-slate-100 shadow-sm hover:border-slate-300'
                        }`}
                      >
                        <div 
                          className="p-5 sm:p-6 flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedBrgy(isExpanded ? null : brgy)}
                        >
                          <div className="flex flex-col">
                            <h4 className="font-bold text-slate-800 text-base sm:text-lg leading-tight uppercase tracking-tight">
                              {brgy.replace(/brgy\.?\s+/i, '')}
                            </h4>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {isExpanded ? 'Click to hide' : 'View details'}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 sm:gap-4">
                            {totalCount === 0 ? (
                              <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[9px] sm:text-xs font-black uppercase">No Cases</span>
                            ) : (
                              <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-black uppercase ${
                                modalView === 'mild' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'
                              }`}>
                                {totalCount} CASES
                              </span>
                            )}
                            
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                          </div>
                        </div>

                        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                          <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0">
                            <div className="p-3 sm:p-4 bg-slate-50 rounded-2xl space-y-2 sm:space-y-3 border border-slate-100">
                              {totalCount > 0 ? (
                                Object.entries(data[modalView]).map(([name, count]) => (
                                  count > 0 && (
                                    <div key={name} className="flex justify-between items-center text-[10px] sm:text-[11px] font-bold uppercase">
                                      <span className="text-slate-500 truncate pr-3 sm:pr-4">{name}</span>
                                      <span className={`px-2 py-0.5 rounded-md ${modalView === 'mild' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                        {count}
                                      </span>
                                    </div>
                                  )
                                ))
                              ) : (
                                <div className="text-center py-2 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                  No cases reported in this area
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* HEADER SECTION */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 mb-4 sm:mb-6 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-slate-200">
            <span className="text-blue-600 text-lg sm:text-xl">🦠📊</span>
            <span className="font-bold text-slate-800 uppercase tracking-widest text-xs sm:text-sm">ADTS Veterinary Surveillance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-3 sm:mb-4 uppercase">Animal Outbreak Statistics Dashboard</h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto font-medium px-2">
            Live epidemiological overview of animal health conditions across all 18 barangays
          </p>
        </div>

        {/* DATA FILTER BAR */}
        <div className="mb-10 sm:mb-12 lg:mb-16 flex justify-center print:hidden">
          <div className="w-full bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-lg border border-slate-200/60 p-5 sm:p-6 flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <div className="bg-slate-100 p-1 rounded-xl sm:rounded-2xl flex gap-1">
                <button 
                  onClick={() => setFilterMode("preset")}
                  className={`px-5 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs font-black uppercase transition-all ${filterMode === 'preset' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                >
                  Standard
                </button>
                <button 
                  onClick={() => setFilterMode("custom")}
                  className={`px-5 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs font-black uppercase transition-all ${filterMode === 'custom' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                >
                  Custom
                </button>
              </div>

              <div className={`flex gap-3 transition-all ${filterMode === 'custom' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm sm:text-base"
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
              <span>🔄</span> Reset to {currentYear}
            </button>
          </div>
        </div>

        {/* MAIN CARDS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-stretch">
          
          {/* MILD CASES */}
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="group bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 lg:p-12 shadow border border-gray-100/80 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col min-h-[500px] sm:min-h-[700px]">
              <h3 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 sm:mb-5 uppercase tracking-tight">Mild Conditions</h3>
              <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">Overview of non-notifiable health issues observed across monitored species.</p>
              <div className="flex-grow min-h-[250px] sm:min-h-[300px]">
                <Pie data={createChartData(mildCounts, mildColors)} options={pieOptions("Mild Condition Breakdown")} />
              </div>
            </div>

            <div className="group bg-gradient-to-br from-blue-50/90 to-indigo-50/70 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 lg:p-12 border border-blue-200/60 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col min-h-[400px] sm:min-h-[520px]">
              <h3 className="text-2xl sm:text-3xl font-black text-blue-900 mb-4 sm:mb-6 flex items-center gap-3 uppercase">📊 Mild Cases Information</h3>
              <p className="text-blue-800 leading-relaxed mb-6 sm:mb-8 text-base sm:text-xl font-medium">
                Mild cases represent non-life-threatening health issues. These reports require standard veterinary monitoring and improved farm-level hygiene to maintain local livestock stability.
              </p>
              <div className="flex flex-col gap-3 sm:gap-4 mt-auto">
                <button onClick={() => openFilteredModal('mild')} className="w-full py-4 sm:py-5 bg-blue-600 text-white rounded-2xl font-black text-base sm:text-lg transition-all hover:bg-blue-700 shadow-xl active:scale-95">
                  View Animal Information →
                </button>
                <button onClick={() => openBrgyModal('mild')} className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-2xl font-black text-base sm:text-lg transition-all hover:bg-slate-800 shadow-xl active:scale-95">
                  View Barangay Information →
                </button>
              </div>
            </div>
          </div>

          {/* DANGEROUS CASES */}
          <div className="flex flex-col gap-6 sm:gap-8">
            <div className="group bg-white rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 lg:p-12 shadow border border-gray-100/80 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col min-h-[500px] sm:min-h-[700px]">
              <h3 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 sm:mb-5 uppercase tracking-tight">Critical Outbreaks</h3>
              <p className="text-gray-600 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">Notifiable high-pathogenicity diseases requiring immediate attention and containment.</p>
              <div className="flex-grow min-h-[250px] sm:min-h-[300px]">
                <Pie data={createChartData(dangerousCounts, dangerousColors)} options={pieOptions("Dangerous Outbreak Breakdown")} />
              </div>
            </div>

            <div className="group bg-gradient-to-br from-red-50/90 to-rose-50/70 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-10 lg:p-12 border border-red-200/60 shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 flex flex-col min-h-[400px] sm:min-h-[520px]">
              <h3 className="text-2xl sm:text-3xl font-black text-red-900 mb-4 sm:mb-6 flex items-center gap-3 uppercase">🚨 Critical Cases Information</h3>
              <p className="text-red-900 leading-relaxed mb-6 sm:mb-8 text-base sm:text-xl font-medium">
                Dangerous cases involve high-risk pathogens that threaten agricultural stability. Rapid response including quarantine and strict movement restrictions is mandatory.
              </p>
              <div className="flex flex-col gap-3 sm:gap-4 mt-auto">
                <button onClick={() => openFilteredModal('dangerous')} className="w-full py-4 sm:py-5 bg-red-600 text-white rounded-2xl font-black text-base sm:text-lg transition-all hover:bg-red-700 shadow-xl active:scale-95">
                  View Animal Information →
                </button>
                <button onClick={() => openBrgyModal('dangerous')} className="w-full py-4 sm:py-5 bg-slate-900 text-white rounded-2xl font-black text-base sm:text-lg transition-all hover:bg-slate-800 shadow-xl active:scale-95">
                  View Barangay Information →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SUMMARY SECTION */}
        <div className="mt-12 sm:mt-16 flex justify-center px-2 sm:px-0">
          <div className="group bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-8 sm:p-10 lg:p-12 rounded-[2.5rem] sm:rounded-[3rem] border border-indigo-200/60 shadow-2xl w-full transition-all duration-500 hover:shadow-3xl hover:-translate-y-2 text-center">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-indigo-900 mb-4 sm:mb-6 tracking-tight">Outbreak Analytics Summary</h3>
            <div className="space-y-4 sm:space-y-6 text-slate-800 leading-relaxed text-base sm:text-lg max-w-4xl mx-auto px-2 sm:px-0">
              <p>Current filtered data shows <strong>{Object.values(mildCounts).reduce((a,b)=>a+b,0).toLocaleString()}</strong> mild cases and <strong> {Object.values(dangerousCounts).reduce((a,b)=>a+b,0).toLocaleString()}</strong> critical cases.</p>
              {Object.values(dangerousCounts).reduce((a,b)=>a+b,0) > 0 ? (
                <p className="text-red-700 font-medium"><strong>Critical Alert:</strong> Dangerous pathogens detected. Immediate containment required.</p>
              ) : (
                <p className="text-emerald-700 font-medium"><strong>Positive Status:</strong> No active critical outbreaks recorded in this period.</p>
              )}
              <p className="text-slate-600 italic mt-4 sm:mt-6 text-xs sm:text-sm">All data verified from field reports. Cross-reference with local advisories for action.</p>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 pb-8 sm:pb-12">
          <button onClick={() => navigate("/home")} className="px-8 sm:px-10 py-4 sm:py-5 bg-slate-800 text-white rounded-2xl font-black text-base sm:text-lg transition-all shadow-xl hover:bg-slate-700 active:scale-95 w-full sm:w-auto">
            ← Return to Home
          </button>
        </div>
      </div>
    </div>
  );
}