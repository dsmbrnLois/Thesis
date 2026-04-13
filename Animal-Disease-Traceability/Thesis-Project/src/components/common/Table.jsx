import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function BarangayHealthTable() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [barangayStats, setBarangayStats] = useState([]);
  const [cityWideSpecies, setCityWideSpecies] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [currentModalData, setCurrentModalData] = useState({});
  const [isCityWideView, setIsCityWideView] = useState(false);
  const [externalStats, setExternalStats] = useState({ exported: 0, slaughtered: 0 });
  const [grandTotals, setGrandTotals] = useState({ healthy: 0, sick: 0, unverified: 0, total: 0 });

  // --- DATE FILTER STATES ---
  const [rawTransactions, setRawTransactions] = useState([]);
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

  const SPECIES_LIST = ["Hog", "Cow", "Chicken", "Carabao", "Goat", "Duck"];
  const [searchTerm, setSearchTerm] = useState("");

  // State for mobile warning modal
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Re-run filtering whenever filters change or new data arrives
  useEffect(() => {
    applyFilters();
  }, [rawTransactions, selectedMonth, selectedYear, customStart, customEnd, filterMode]);

  const filteredBarangays = barangayStats.filter((row) =>
    row.barangay.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/transactions");
      const data = await res.json();
      const txData = Array.isArray(data) ? data : [];
      setRawTransactions(txData); // Store original data
      // applyFilters() will trigger via useEffect
    } catch (err) {
      console.error("Error fetching data:", err);
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
    const citySpecies = {};
    let exp = 0;
    let slaught = 0;
    let gHealthy = 0;
    let gSick = 0;
    let gUnverified = 0;
    let gTotal = 0;

    SPECIES_LIST.forEach(s => {
      citySpecies[s] = { healthy: 0, sick: 0, unverified: 0, exported: 0, slaughtered: 0 };
    });

    VALID_BARANGAYS.forEach(name => {
      brgyGroup[name] = {
        barangay: `Brgy ${name}`,
        healthy: 0,
        sick: 0,
        unverified: 0,
        total: 0,
        speciesBreakdown: {}
      };
      SPECIES_LIST.forEach(s => {
        brgyGroup[name].speciesBreakdown[s] = { healthy: 0, sick: 0, unverified: 0, exported: 0, slaughtered: 0 };
      });
    });

    txList.forEach((tx) => {
      const loc = (tx.location || "").toLowerCase().trim();
      const spec = tx.species || "Other";
      const qty = Number(tx.quantity) || 0;
      const severity = (tx.severity || "").toLowerCase().trim();

      if (citySpecies[spec]) {
        if (loc.includes("exported") || loc.includes("outside")) {
          citySpecies[spec].exported += qty;
        } else if (loc.includes("slaughterhouse")) {
          citySpecies[spec].slaughtered += qty;
        } else {
          if (severity === "safe" || severity === "healthy") citySpecies[spec].healthy += qty;
          else if (severity === "mild" || severity === "dangerous" || severity === "sick") citySpecies[spec].sick += qty;
          else citySpecies[spec].unverified += qty;
        }
      }

      if (loc.includes("slaughterhouse")) {
        slaught += qty;
      }
      if (loc.includes("exported") || loc.includes("outside")) {
        exp += qty;
      }

      const match = VALID_BARANGAYS.find(b => loc.includes(b.toLowerCase()));
      if (match) {
        brgyGroup[match].total += qty;
        gTotal += qty;

        if (!loc.includes("slaughterhouse") && !loc.includes("exported") && !loc.includes("outside")) {
          if (severity === "safe" || severity === "healthy") {
            brgyGroup[match].healthy += qty;
            gHealthy += qty;
          } else if (severity === "mild" || severity === "dangerous" || severity === "sick") {
            brgyGroup[match].sick += qty;
            gSick += qty;
          } else {
            brgyGroup[match].unverified += qty;
            gUnverified += qty;
          }
        }

        if (SPECIES_LIST.includes(spec)) {
          const target = brgyGroup[match].speciesBreakdown[spec];
          if (loc.includes("exported") || loc.includes("outside")) {
            target.exported += qty;
          } else if (loc.includes("slaughterhouse")) {
            target.slaughtered += qty;
          } else {
            if (severity === "safe" || severity === "healthy") target.healthy += qty;
            else if (severity === "mild" || severity === "dangerous" || severity === "sick") target.sick += qty;
            else target.unverified += qty;
          }
        }
      }
    });

    setBarangayStats(Object.values(brgyGroup).sort((a, b) => a.barangay.localeCompare(b.barangay)));
    setCityWideSpecies(citySpecies);
    setExternalStats({ exported: exp, slaughtered: slaught });
    setGrandTotals({ healthy: gHealthy, sick: gSick, unverified: gUnverified, total: gTotal });
  };

  const openCityWideModal = () => {
    setModalTitle("All Barangays (City-Wide)");
    setCurrentModalData(cityWideSpecies);
    setIsCityWideView(true);
    setIsModalOpen(true);
  };

  const openBarangayModal = (row) => {
    setModalTitle(row.barangay);
    setCurrentModalData(row.speciesBreakdown);
    setIsCityWideView(false);
    setIsModalOpen(true);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // NEW: Mobile warning modal logic (now shows every time on small screens)
  useEffect(() => {
    const checkScreenSize = () => {
      if (window.innerWidth <= 768) {
        setShowMobileWarning(true);
      } else {
        setShowMobileWarning(false);
      }
    };

    checkScreenSize(); // Check immediately on mount
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const dismissMobileWarning = () => {
    setShowMobileWarning(false);
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50/30 backdrop-blur-sm z-[1000]">
      <div className="bg-white/80 p-10 rounded-[2.5rem] shadow-2xl border border-white flex flex-col items-center">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-green-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]"></div>
          </div>
        </div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">System Syncing</h2>
        <p className="text-slate-500 font-bold text-xs mt-2 tracking-[0.2em] animate-pulse">
          Fetching Table data...
        </p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-10 space-y-12 font-sans print:p-8 print:max-w-none bg-slate-50/30 relative">
      
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-8 md:p-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 print:shadow-none print:border-0">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight uppercase">
            Livestock Registry
          </h1>
          <p className="mt-2 text-slate-500 font-semibold text-lg">
            Santa Rosa City Barangay Health Monitor
          </p>
        </div>
        <button
          onClick={openCityWideModal}
          className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-7 py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-sm transition-colors flex items-center gap-3 whitespace-nowrap print:hidden"
        >
          <span>Animals</span>
          <span className="bg-white/25 px-2.5 py-1 rounded-lg text-xs font-bold">ALL BRGY</span>
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/60 p-6 print:hidden">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center justify-center gap-4">
            
            {/* Filter Toggle */}
            <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
              <button 
                onClick={() => setFilterMode("preset")}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${filterMode === 'preset' ? 'bg-white shadow-sm text-green-600' : 'text-slate-400'}`}
              >
                Standard
              </button>
              <button 
                onClick={() => setFilterMode("custom")}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${filterMode === 'custom' ? 'bg-white shadow-sm text-green-600' : 'text-slate-400'}`}
              >
                Custom Range
              </button>
            </div>

            {/* Dropdowns (Preset) */}
            <div className={`flex gap-3 transition-all ${filterMode === 'custom' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20"
              >
                <option value="all">Full Year</option>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20"
              >
                {[currentYear, currentYear-1, currentYear-2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Inputs (Custom) */}
            <div className={`flex items-center gap-3 transition-all ${filterMode === 'preset' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
              <input 
                type="date" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none"
              />
              <span className="text-slate-300 font-black">TO</span>
              <input 
                type="date" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none"
              />
            </div>
          </div>

          <button 
            onClick={handleReset}
            className="text-slate-400 hover:text-red-500 font-black text-xs uppercase tracking-widest transition-colors flex items-center gap-2"
          >
            <span>🔄</span> Reset to {currentYear}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-6 print:grid-cols-6 mb-10">
        {[
          { label: "Total Animals", val: grandTotals.total, color: "indigo" },
          { label: "Healthy", val: grandTotals.healthy, color: "emerald" },
          { label: "Unverified", val: grandTotals.unverified, color: "amber" },
          { label: "Sick", val: grandTotals.sick, color: "red" },
          { label: "Exported", val: externalStats.exported, color: "blue" },
          { label: "Slaughtered", val: externalStats.slaughtered, color: "slate", isSlaughtered: true },
        ].map((card, i) => {
          const styles = {
            indigo:  "bg-indigo-50 border-indigo-200 text-indigo-600 val-indigo-900 shadow-indigo-500/20",
            emerald: "bg-emerald-50 border-emerald-200 text-emerald-600 val-emerald-900 shadow-emerald-500/20",
            amber:   "bg-amber-50 border-amber-200 text-amber-600 val-amber-900 shadow-amber-500/20",
            red:     "bg-red-50 border-red-200 text-red-600 val-red-900 shadow-red-500/20",
            blue:    "bg-blue-50 border-blue-200 text-blue-600 val-blue-900 shadow-blue-500/20",
            slate:   "bg-slate-100 border-slate-300 text-slate-600 val-slate-900 shadow-slate-500/20",
          }[card.color];

          const styleParts = styles.split(' ');

          return (
            <div
              key={i}
              className={`
                relative rounded-[2rem] border p-6 text-center transition-all duration-300 cursor-default
                ${styleParts[0]} ${styleParts[1]}
                hover:-translate-y-2 
                hover:scale-105
                hover:shadow-[0_20px_30px_-5px_rgba(0,0,0,0.1),0_10px_10px_-5px_rgba(0,0,0,0.04)]
                hover:z-10
                hover:border-opacity-100 border-opacity-50
                print:shadow-none print:border print:translate-y-0 print:scale-100
              `}
            >
              <p className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 ${styleParts[2]}`}>
                {card.label}
              </p>
              <p className={`text-3xl md:text-4xl font-black tracking-tighter 
                ${card.isSlaughtered ? "text-red-700" : styleParts[3].replace('val-', 'text-')}`}
              >
                {card.val.toLocaleString()}
              </p>

              <div className={`
                absolute inset-x-0 -bottom-px h-1 rounded-b-[2rem] opacity-0 transition-opacity duration-300
                ${styleParts[2].replace('text-', 'bg-')} 
                hover:opacity-100
              `}></div>
            </div>
          );
        })}
      </div>

      {/* Search Bar */}
      <div className="flex justify-center print:hidden">
        <div className="relative w-full max-w-7xl">
          <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 text-xl">🔍</span>
          <input
            type="text"
            placeholder="Search Barangay (e.g. Aplaya, Balibago)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-white border border-slate-200 rounded-3xl shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 font-bold text-slate-700 transition-all placeholder:text-slate-400 placeholder:font-medium"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 font-bold text-sm uppercase tracking-tighter"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200/80 overflow-hidden print:shadow-none print:border print:rounded-none">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 print:bg-slate-200">
                <th className="p-6 md:p-8 text-xs font-black uppercase tracking-[0.15em]">Barangay</th>
                <th className="p-6 md:p-8 text-center text-xs font-black uppercase tracking-[0.15em]">Healthy</th>
                <th className="p-6 md:p-8 text-center text-xs font-black uppercase tracking-[0.15em]">Unverified</th>
                <th className="p-6 md:p-8 text-center text-xs font-black uppercase tracking-[0.15em]">Sick</th>
                <th className="p-6 md:p-8 text-center text-xs font-black uppercase tracking-[0.15em]">Total</th>
                <th className="p-6 md:p-8 text-center text-xs font-black uppercase tracking-[0.15em] w-32 print:hidden">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBarangays.length > 0 ? (
                filteredBarangays.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 transition-colors duration-150 print:hover:bg-transparent"
                  >
                    <td className="p-6 md:p-8 text-sm font-bold uppercase tracking-wide text-slate-700">
                      {row.barangay}
                    </td>
                    <td className="p-6 md:p-8 text-center text-lg font-black text-emerald-600">
                      {row.healthy || "–"}
                    </td>
                    <td className="p-6 md:p-8 text-center text-lg font-black text-amber-500">
                      {row.unverified || "–"}
                    </td>
                    <td className="p-6 md:p-8 text-center text-lg font-black text-red-500">
                      {row.sick || "–"}
                    </td>
                    <td className="p-6 md:p-8 text-center text-lg font-black text-slate-800">
                      {row.total || "–"}
                    </td>
                    <td className="p-6 md:p-8 text-center print:hidden">
                      <button
                        onClick={() => openBarangayModal(row)}
                        className="bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-colors shadow-sm border border-green-500"
                      >
                        Animals
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl">🏘️</span>
                      <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No Barangays found for selected criteria</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal – Species Breakdown*/}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 print:hidden">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" 
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative bg-[#F8FAFC] w-full max-w-6xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-white px-10 py-6 flex justify-between items-center border-b border-slate-100">
              <div className="flex items-center gap-5">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl text-xl shadow-lg shadow-emerald-200">
                  📊
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">
                    Species Breakdown
                  </h2>
                  <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-[0.2em] mt-1">
                    {modalTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all text-xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 bg-[#F8FAFC]">
              <div className="flex flex-col gap-3">
                
                {/* Header Row */}
                <div className={`grid ${isCityWideView ? 'grid-cols-12' : 'grid-cols-9'} px-8 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1`}>
                  <div className="col-span-3">Animal</div>
                  <div className="col-span-2 text-center">Healthy</div>
                  <div className="col-span-2 text-center">Sick</div>
                  <div className="col-span-2 text-center">Unverified</div>
                  {isCityWideView && (
                    <>
                      <div className="col-span-1.5 text-center">Exp.</div>
                      <div className="col-span-1.5 text-center">Slaught.</div>
                    </>
                  )}
                </div>

                {/* Species Cards */}
                <div className="flex flex-col gap-2">
                  {SPECIES_LIST.map(name => {
                    const icons = { Hog: "🐖", Cow: "🐄", Chicken: "🐓", Carabao: "🐃", Goat: "🐐", Duck: "🦆" };
                    const data = currentModalData[name] || { healthy: 0, sick: 0, unverified: 0, exported: 0, slaughtered: 0 };
                    
                    return (
                      <div key={name} className={`grid ${isCityWideView ? 'grid-cols-12' : 'grid-cols-9'} items-center bg-white py-3 px-8 rounded-2xl border border-slate-100 shadow-sm hover:border-emerald-200 transition-all`}>
                        <div className="col-span-3 flex items-center gap-4">
                          <span className="text-2xl leading-none">{icons[name] || "🐾"}</span>
                          <span className="font-black text-slate-800 text-base uppercase tracking-tight">{name}</span>
                        </div>
                        
                        <div className="col-span-2 flex justify-center">
                          <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl font-black text-lg w-20 text-center border border-emerald-100">
                            {data.healthy}
                          </div>
                        </div>

                        <div className="col-span-2 flex justify-center">
                          <div className={`${data.sick > 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-300 border-transparent'} px-3 py-1.5 rounded-xl font-black text-lg w-20 text-center border`}>
                            {data.sick}
                          </div>
                        </div>

                        <div className="col-span-2 flex justify-center">
                          <div className={`${data.unverified > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-300 border-transparent'} px-3 py-1.5 rounded-xl font-black text-lg w-20 text-center border`}>
                            {data.unverified}
                          </div>
                        </div>

                        {isCityWideView && (
                          <>
                            <div className="col-span-1.5 flex justify-center">
                              <span className="text-blue-600 font-black text-lg">{data.exported}</span>
                            </div>
                            <div className="col-span-1.5 flex justify-center">
                              <span className="text-rose-600 font-black text-lg">{data.slaughtered}</span>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-10 py-6 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-slate-900 hover:bg-black text-white px-10 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
              >
                Close Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Buttons */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-6 pt-6 pb-16 print:hidden">
        <button
          onClick={() => navigate("/home")}
          className="px-8 sm:px-10 py-4 sm:py-5 bg-slate-800 text-white rounded-2xl font-black text-base sm:text-lg transition-all shadow-xl hover:bg-slate-700 active:scale-95 w-full sm:w-auto"
        >
          ← Return to Home
        </button>
      </div>

      {/* NEW: Mobile Warning Modal - now appears every time on small screens */}
      {showMobileWarning && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="text-5xl mb-6">📱</div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4">
              Optimized for Larger Screens
            </h3>
            <p className="text-slate-600 mb-8 leading-relaxed">
              This detailed table is best viewed on a desktop or laptop. 
              On smaller screens you may need to scroll horizontally or zoom in.
            </p>
            <button
              onClick={dismissMobileWarning}
              className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg active:scale-95 w-full sm:w-auto"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}