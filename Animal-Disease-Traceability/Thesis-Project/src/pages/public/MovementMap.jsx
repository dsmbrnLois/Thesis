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
    if (stats.critical > 0) return '#b3261e'; // ADTS error
    if (stats.mild > 0) return '#f97316';     // Warning
    return '#146c2e';                         // ADTS tertiary (green)
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface/50 backdrop-blur-sm z-[1000]">
      <div className="bg-surface p-xl border border-outline-variant shadow-[0_2px_4px_rgba(28,43,58,0.08)] flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="font-mono text-label-caps text-primary uppercase tracking-widest animate-pulse">
          Fetching Movement data...
        </p>
      </div>
    </div>
  );

  return (
    <div className="w-full bg-surface-container-lowest min-h-screen pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-10 font-sans relative">
      
      {/* ── FILTER TAPE ── */}
      <div className="max-w-7xl mx-auto mb-md flex justify-center print:hidden">
        <div className="w-full bg-surface border border-outline-variant p-md flex flex-col lg:flex-row items-center justify-between gap-md">
          <div className="flex flex-wrap items-center justify-center gap-md">
            <div className="flex bg-surface-container-low border border-outline-variant rounded-sm p-1">
              <button 
                onClick={() => setFilterMode("preset")}
                className={`px-lg py-xs font-mono text-label-caps uppercase transition-colors ${filterMode === 'preset' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}
              >
                STANDARD
              </button>
              <button 
                onClick={() => setFilterMode("custom")}
                className={`px-lg py-xs font-mono text-label-caps uppercase transition-colors ${filterMode === 'custom' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-primary'}`}
              >
                CUSTOM
              </button>
            </div>

            <div className={`flex gap-sm transition-opacity ${filterMode === 'custom' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-surface border border-outline-variant px-md py-xs font-mono text-label-caps text-on-surface outline-none focus:border-primary uppercase cursor-pointer"
              >
                <option value="all">FULL YEAR</option>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m.toUpperCase()}</option>)}
              </select>
              <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-surface border border-outline-variant px-md py-xs font-mono text-label-caps text-on-surface outline-none focus:border-primary cursor-pointer"
              >
                {[currentYear, currentYear-1, currentYear-2].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div className={`flex items-center gap-sm transition-opacity ${filterMode === 'preset' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <input 
                type="date" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-surface border border-outline-variant px-md py-xs font-mono text-data-mono text-on-surface outline-none focus:border-primary"
              />
              <span className="text-on-surface-variant font-bold">—</span>
              <input 
                type="date" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-surface border border-outline-variant px-md py-xs font-mono text-data-mono text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>

          <button 
            onClick={handleReset}
            className="text-on-surface-variant hover:text-primary font-mono text-label-caps uppercase transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span> RESET
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-lg items-stretch">
        
        {/* ── SIDEBAR ── */}
        <aside className="w-full lg:w-[400px] xl:w-[420px] bg-surface border border-outline-variant p-xl flex flex-col z-20">
          <h1 className="font-display text-display-sm text-primary uppercase tracking-tight mb-1">
            Animal Movement
          </h1>
          <p className="font-mono text-label-caps uppercase text-tertiary">ADTS • Real-Time Traceability</p>

          <div className="grid grid-cols-3 gap-0 border border-outline-variant mt-lg">
            <div className="bg-tertiary-fixed/20 p-md text-center border-r border-outline-variant">
              <p className="font-mono text-label-caps text-on-surface-variant uppercase mb-1">Healthy</p>
              <p className="font-display text-headline-sm text-tertiary">{transactions.healthy.toLocaleString()}</p>
            </div>
            <div className="bg-error-container/30 p-md text-center border-r border-outline-variant">
              <p className="font-mono text-label-caps text-error uppercase mb-1">At-Risk</p>
              <p className="font-display text-headline-sm text-error">{transactions.sick.toLocaleString()}</p>
            </div>
            <div className="bg-surface-container-low p-md text-center">
              <p className="font-mono text-label-caps text-on-surface-variant uppercase mb-1">Pending</p>
              <p className="font-display text-headline-sm text-on-surface">{transactions.unverified.toLocaleString()}</p>
            </div>
          </div>

          <div className="mt-md bg-surface-container-lowest border border-outline-variant flex flex-col divide-y divide-outline-variant">
            <div className="flex justify-between items-center p-md">
              <span className="font-mono text-label-caps text-on-surface-variant uppercase">Exported</span>
              <span className="font-mono text-data-mono text-on-surface font-bold">{transactions.logistics.exported.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-md bg-error-container/10">
              <span className="font-mono text-label-caps text-error uppercase">Slaughtered</span>
              <span className="font-mono text-data-mono text-error font-bold">{transactions.logistics.slaughtered.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-md">
              <span className="font-mono text-label-caps text-on-surface-variant uppercase">Verified Ratio</span>
              <span className="font-mono text-data-mono text-primary font-bold">{transactions.verifiedRatio}</span>
            </div>
          </div>

          <div className="bg-surface border border-outline-variant mt-lg p-md">
            <h3 className="font-mono text-label-caps uppercase text-on-surface-variant mb-md text-center border-b border-outline-variant pb-2">
              Species Distribution
            </h3>
            <div className="h-56">
              {transactions?.speciesCounts ? (
                <Pie
                  data={{
                    labels: SPECIES_LIST,
                    datasets: [{
                      data: SPECIES_LIST.map(s => transactions.speciesCounts[s] || 0),
                      backgroundColor: ["#004a77", "#146c2e", "#b3261e", "#f97316", "#60a5fa", "#9333ea"],
                      borderWidth: 1,
                      borderColor: '#1a1f24',
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
                          font: { family: 'monospace', size: 10 },
                          color: '#bec8cb'
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-outline font-mono text-label-caps uppercase">
                  Synchronizing...
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto pt-lg">
            <button onClick={() => navigate("/home")} className="w-full py-md border border-outline-variant text-on-surface font-mono text-label-caps uppercase hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Return to Home
            </button>
          </div>
        </aside>

        {/* ── MAIN CONTENT AREA ── */}
        <div className="flex-1 flex flex-col gap-lg">
          <div className="bg-surface border border-outline-variant p-xl flex flex-col flex-grow min-h-[500px] sm:min-h-[750px] relative z-0">
            <div className="mb-md">
              <h2 className="font-display text-headline-lg text-primary uppercase">Livestock Distribution Map</h2>
              <p className="font-mono text-label-caps text-on-surface-variant uppercase mt-1">
                Real-Time Health Monitoring
              </p>
            </div>

            {/* MAP CONTAINER */}
            <div className="border border-outline-variant bg-surface-container-lowest flex-grow relative z-0 h-[450px] sm:h-[600px] w-full">
              <MapContainer
                center={[14.311, 121.11]}
                zoom={11.5}
                zoomControl={false}
                style={{ height: "100%", width: "100%" }}
              >
                {/* ── LEAFLET HEALTH LEGEND ── */}
                <div
                  className="absolute top-md left-md bg-surface border border-outline-variant p-md z-[1000] pointer-events-none min-w-[200px]"
                >
                  <div className="flex items-center gap-2 mb-sm pb-2 border-b border-outline-variant">
                    <span className="material-symbols-outlined text-[14px] text-primary">map</span>
                    <p className="font-mono text-label-caps uppercase text-primary">Health Legend</p>
                  </div>
                  <div className="space-y-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#146c2e] border border-outline-variant"></div>
                        <span className="font-mono text-label-caps text-on-surface uppercase">Healthy</span>
                      </div>
                      <span className="font-mono text-[9px] text-on-surface-variant uppercase">0 Cases</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#f97316] border border-outline-variant"></div>
                        <span className="font-mono text-label-caps text-on-surface uppercase">Warning</span>
                      </div>
                      <span className="font-mono text-[9px] text-on-surface-variant uppercase">Mild</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm bg-[#b3261e] border border-outline-variant"></div>
                        <span className="font-mono text-label-caps text-error uppercase">Critical</span>
                      </div>
                      <span className="font-mono text-[9px] text-error uppercase">Pathogen</span>
                    </div>
                  </div>
                </div>
                <MapResizer />

                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {Object.entries(BARANGAY_COORDINATES).map(([brgyName, coords]) => {
                  const currentStats = barangayMapStats[brgyName] || {
                    total: 0,
                    healthy: 0,
                    mild: 0,
                    critical: 0,
                    unverified: 0,
                  };

                  const markerColor = getColor(currentStats);

                  // Flat clinical pin
                  const customIcon = L.divIcon({
                    html: `
                      <div style="
                        width: 24px;
                        height: 24px;
                        background-color: ${markerColor};
                        border: 2px solid #ffffff;
                        box-shadow: 0 0 0 1px #1a1f24;
                        transform: rotate(45deg);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      ">
                        <div style="
                          width: 8px;
                          height: 8px;
                          background-color: #ffffff;
                          border-radius: 50%;
                        "></div>
                      </div>
                    `,
                    className: "adts-clinical-pin",
                    iconSize: [24, 24],
                    iconAnchor: [12, 12],
                    popupAnchor: [0, -12],
                  });

                  return (
                    <Marker
                      key={`marker-${brgyName}-${JSON.stringify(barangayMapStats)}`}
                      position={coords}
                      icon={customIcon}
                    >
                      <MapTooltip sticky opacity={1}>
                        <div style={{ fontFamily: "monospace", padding: "8px", minWidth: "160px", background: "#1a1f24", color: "#f7f9ff", border: "1px solid #727d81" }}>
                          <strong style={{ display: "block", borderBottom: "1px solid #434c50", paddingBottom: "4px", marginBottom: "4px", fontSize: "12px", textTransform: "uppercase" }}>
                            {brgyName}
                          </strong>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "2px" }}>
                            <span style={{ color: "#bec8cb" }}>HEALTHY</span>
                            <span style={{ color: "#146c2e", fontWeight: "bold" }}>{currentStats.healthy}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "2px" }}>
                            <span style={{ color: "#bec8cb" }}>MILD</span>
                            <span style={{ color: "#f97316", fontWeight: "bold" }}>{currentStats.mild}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", marginBottom: "2px" }}>
                            <span style={{ color: "#bec8cb" }}>CRITICAL</span>
                            <span style={{ color: "#b3261e", fontWeight: "bold" }}>{currentStats.critical}</span>
                          </div>
                          <div style={{ borderTop: "1px solid #434c50", paddingTop: "4px", display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "bold", marginTop: "4px" }}>
                            <span>TOTAL</span>
                            <span>{currentStats.total}</span>
                          </div>
                        </div>
                      </MapTooltip>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
          
          {/* ── TOP BARANGAYS LIST ── */}
          <div className="bg-surface border border-outline-variant p-xl">
            <h3 className="font-display text-headline-sm text-primary uppercase mb-md">
              Top 5 Activity Domains
            </h3>
            <div className="flex flex-col border border-outline-variant divide-y divide-outline-variant max-h-[400px] overflow-y-auto">
              {topBarangays.length > 0 ? topBarangays.map((brgy) => (
                <div 
                  key={brgy.name}
                  className="flex justify-between items-center p-md bg-surface-container-lowest hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex flex-col">
                    <p className="font-body text-body-lg font-bold text-on-surface uppercase">{brgy.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      {brgy.critical > 0 ? (
                        <span className="font-mono text-[10px] bg-error-container text-error px-2 py-0.5 uppercase tracking-widest border border-error/30">{brgy.critical} CRITICAL</span>
                      ) : brgy.mild > 0 ? (
                        <span className="font-mono text-[10px] bg-surface-container-highest text-on-surface-variant px-2 py-0.5 uppercase tracking-widest">{brgy.mild} MILD</span>
                      ) : (
                        <span className="font-mono text-[10px] bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 uppercase tracking-widest">CLEAN</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-headline-md text-primary">{brgy.total.toLocaleString()}</p>
                    <p className="font-mono text-label-caps text-on-surface-variant uppercase">HEADS</p>
                  </div>
                </div>
              )) : (
                <div className="p-xl text-center font-mono text-label-caps text-on-surface-variant uppercase">
                  NO DATA FOUND
                </div>
              )}
            </div>
          </div>

          {/* ── ANALYTICS SUMMARY ── */}
          <div className="bg-surface-container-lowest border border-outline-variant p-xl flex flex-col">
            <h3 className="font-display text-headline-sm text-primary uppercase mb-md flex items-center gap-2">
              <span className="material-symbols-outlined">analytics</span>
              Analytics Summary
            </h3>
            
            <div className="font-body text-body-md text-on-surface space-y-md">
              <p>
                Current tracking confirms <strong className="font-mono text-data-mono">{transactions.healthy.toLocaleString()}</strong> healthy heads and 
                <strong className="font-mono text-data-mono"> {transactions.sick.toLocaleString()}</strong> at-risk animals in transit. 
                The verified data integrity ratio currently stands at <strong className="font-mono text-data-mono">{transactions.verifiedRatio}</strong>.
              </p>

              {transactions.sick > 0 ? (
                <div className="bg-error-container/20 p-md border border-error/30 flex flex-col gap-1">
                  <strong className="font-mono text-label-caps text-error uppercase">Containment Protocol Active</strong>
                  <span className="text-on-surface">{transactions.sick} heads detected with potential pathogens. Movements in high-risk zones should be restricted.</span>
                </div>
              ) : (
                <div className="bg-tertiary-fixed/20 p-md border border-tertiary-fixed-dim flex flex-col gap-1">
                  <strong className="font-mono text-label-caps text-tertiary uppercase">Clean Transit</strong>
                  <span className="text-on-surface">No critical infections detected. Biosecurity certificates are clear.</span>
                </div>
              )}

              <div className="flex gap-md border-t border-outline-variant pt-md font-mono text-label-caps text-on-surface-variant uppercase">
                <span>Slaughtered: <strong className="text-on-surface">{transactions.logistics.slaughtered.toLocaleString()}</strong></span>
                <span>Exported: <strong className="text-on-surface">{transactions.logistics.exported.toLocaleString()}</strong></span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}