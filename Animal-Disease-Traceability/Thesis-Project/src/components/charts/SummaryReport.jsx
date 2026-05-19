import React, { useState, useEffect, useMemo } from "react";
import API_URL from "../../config/api";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { useNavigate } from "react-router-dom";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function SummaryReport() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    max: 0,
    maxMonth: "N/A",
    min: 0,
    minMonth: "N/A",
    riskLevel: "Low",
    peakPercentage: 0
  });
  const [topDiseases, setTopDiseases] = useState([]);

  const currentYear = new Date().getFullYear();
  const [filterMode, setFilterMode] = useState("preset");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/transactions`);
      const data = await res.json();
      const txData = Array.isArray(data) ? data : [];
      setTransactions(txData);
    } catch (err) {
      console.error("Error fetching summary data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const txDate = new Date(tx.date || tx.timestamp);
      if (isNaN(txDate.getTime())) return false;

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
  }, [transactions, filterMode, selectedMonth, selectedYear, customStart, customEnd]);

  useEffect(() => {
    if (transactions.length > 0) {
      processData(filteredTransactions);
    }
  }, [filteredTransactions]);

  const handleReset = () => {
    setFilterMode("preset");
    setSelectedMonth("all");
    setSelectedYear(currentYear);
    setCustomStart("");
    setCustomEnd("");
  };

  const processData = (txList) => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const totalMonthlyCount = Array(12).fill(0);
    const mildMonthlyCount = Array(12).fill(0);
    const criticalMonthlyCount = Array(12).fill(0);

    const MILD_CATS = ["Respiratory Infection", "Parasitic Infection", "Digestive Issue / Scours", "Skin Condition / Mange", "Physical Injury / Lameness"];
    const DANGER_CATS = ["African Swine Fever (ASF)", "Avian Influenza", "Foot and Mouth Disease (FMD)"];

    const diseaseMap = {};
    [...MILD_CATS, ...DANGER_CATS].forEach(cat => {
      diseaseMap[cat] = 0;
    });
    diseaseMap["Other"] = 0;

    txList.forEach((tx) => {
      const severity = (tx.severity || "").toLowerCase();
      
      if (severity === "mild" || severity === "dangerous") {
        const date = new Date(tx.date || tx.timestamp);
        const monthIndex = date.getMonth();
        const qty = Number(tx.quantity) || 1;

        totalMonthlyCount[monthIndex] += qty;
        if (severity === "mild") {
          mildMonthlyCount[monthIndex] += qty;
        } else if (severity === "dangerous") {
          criticalMonthlyCount[monthIndex] += qty;
        }

        const diag = tx.diagnosedDisease || "Other";
        if (diseaseMap.hasOwnProperty(diag)) {
          diseaseMap[diag] += qty;
        } else {
          diseaseMap["Other"] += qty;
        }
      }
    });

    const total = totalMonthlyCount.reduce((a, b) => a + b, 0);
    const maxVal = Math.max(...totalMonthlyCount);
    const minVal = Math.min(...totalMonthlyCount);
    const maxIdx = totalMonthlyCount.indexOf(maxVal);

    const riskLevel = total > 500 ? "High" : total > 200 ? "Medium" : "Low";
    const peakPercentage = total > 0 ? ((maxVal / total) * 100).toFixed(1) : 0;

    const sortedDiseases = Object.entries(diseaseMap)
      .sort(([, a], [, b]) => b - a)
      .map(([disease, count]) => ({ disease, count }));

    setTopDiseases(sortedDiseases);

    setStats({
      total,
      average: total > 0 ? (total / 12).toFixed(1) : "0.0",
      max: maxVal,
      maxMonth: monthNames[maxIdx],
      min: minVal,
      minMonth: monthNames[totalMonthlyCount.indexOf(minVal)],
      riskLevel,
      peakPercentage
    });

    setChartData({
      labels: monthNames,
      datasets: [
        {
          label: "Total Cases",
          data: totalMonthlyCount,
          fill: true,
          borderColor: "#dc2626",
          backgroundColor: "rgba(220, 38, 38, 0.05)",
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#dc2626",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
        {
          label: "Mild Cases",
          data: mildMonthlyCount,
          fill: true,
          borderColor: "#f97316",
          backgroundColor: "rgba(249, 115, 22, 0.05)",
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#f97316",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
        {
          label: "Critical Cases",
          data: criticalMonthlyCount,
          fill: true,
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.05)",
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#8b5cf6",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        }
      ]
    });
  };

  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm z-50">
      <div className="bg-white/90 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col items-center">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-red-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>
        <h2 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight uppercase">Generating Report</h2>
        <p className="text-slate-500 font-medium text-xs sm:text-sm mt-2 animate-pulse">Analyzing blockchain-verified data...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-transparent pt-16 sm:pt-20 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 font-sans">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-16">
        
        {/* HEADER */}
        <header className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 mb-4 sm:mb-6 rounded-full bg-white/80 backdrop-blur-md shadow-sm border border-red-100">
            <span className="text-red-600 text-lg sm:text-xl">📉🦠</span>
            <span className="font-bold text-slate-800 uppercase tracking-wider text-xs sm:text-sm">Santa Rosa Disease Intelligence</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight mb-3 sm:mb-4 uppercase">Diseases Summary Report</h1>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto font-medium px-2">
            Multi-severity epidemiological overview across Santa Rosa City
          </p>
        </header>

        {/* DATA FILTER BAR */}
        <div className="mb-10 sm:mb-12 lg:mb-16 flex justify-center print:hidden">
          <div className="w-full bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-lg border border-slate-200/60 p-5 sm:p-6 flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
              <div className="bg-slate-100 p-1 rounded-xl sm:rounded-2xl flex gap-1">
                <button 
                  onClick={() => setFilterMode("preset")}
                  className={`px-5 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs font-black uppercase transition-all ${filterMode === 'preset' ? 'bg-white shadow-sm text-red-600' : 'text-slate-400'}`}
                >
                  Standard
                </button>
                <button 
                  onClick={() => setFilterMode("custom")}
                  className={`px-5 sm:px-6 py-2 rounded-lg sm:rounded-xl text-xs font-black uppercase transition-all ${filterMode === 'custom' ? 'bg-white shadow-sm text-red-600' : 'text-slate-400'}`}
                >
                  Custom
                </button>
              </div>

              <div className={`flex gap-3 transition-all ${filterMode === 'custom' ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 py-2 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 text-sm sm:text-base"
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

        {/* KPI CARDS (Updated to 4 Columns for better fit) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10 sm:mb-12">
          <div className="bg-gradient-to-br from-red-600 to-rose-700 p-6 sm:p-8 rounded-3xl text-white shadow-2xl transition-all hover:scale-[1.02]">
            <p className="text-red-100 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1 sm:mb-2">Total Confirmed Cases</p>
            <p className="text-4xl sm:text-5xl lg:text-6xl font-black">{stats.total.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 sm:p-8 rounded-3xl text-white shadow-2xl transition-all hover:scale-[1.02]">
            <p className="text-indigo-100 text-xs sm:text-sm font-semibold uppercase tracking-wider mb-1 sm:mb-2">Monthly Average</p>
            <p className="text-4xl sm:text-5xl lg:text-6xl font-black">{stats.average}</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 sm:p-8">
            <p className="text-slate-600 font-medium text-sm mb-1 sm:mb-2">Peak Month</p>
            <p className="text-3xl sm:text-4xl font-black text-red-700">
              {stats.maxMonth} <span className="text-xl sm:text-2xl text-slate-400">({stats.max})</span>
            </p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">{stats.peakPercentage}% of yearly total</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-6 sm:p-8">
            <p className="text-slate-600 font-medium text-sm mb-1 sm:mb-2">Risk Level</p>
            <span className={`inline-block px-5 sm:px-6 py-2 sm:py-3 rounded-full text-lg sm:text-xl font-bold ${
              stats.riskLevel === "High" ? "bg-red-100 text-red-700 border-2 border-red-300"
              : stats.riskLevel === "Medium" ? "bg-orange-100 text-orange-700 border-2 border-orange-300"
              : "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
            }`}>
              {stats.riskLevel}
            </span>
          </div>
        </div>

        {/* MAIN CHART + TOP CASES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mb-10 sm:mb-12">
          <div className="lg:col-span-8 bg-white rounded-3xl shadow-xl border border-slate-100/80 p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Severity Trend Analysis
              </h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600"></div><span className="text-[10px] font-bold uppercase text-slate-400">Total</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div><span className="text-[10px] font-bold uppercase text-slate-400">Mild</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-500"></div><span className="text-[10px] font-bold uppercase text-slate-400">Critical</span></div>
              </div>
            </div>
            <div className="h-[300px] sm:h-[380px] lg:h-[480px]">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { display: false },
                    tooltip: { mode: "index", intersect: false } 
                  },
                  scales: {
                    y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.04)" } },
                    x: { grid: { display: false } }
                  }
                }}
              />
            </div>
          </div>

          {/* TOP 8 PATHOGENS SECTION */}
          <div className="lg:col-span-4 bg-gradient-to-br from-white to-slate-50/80 p-6 sm:p-8 rounded-[2.5rem] shadow-lg border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="text-red-500 text-lg">🦠</span> Disease Ranking
              </h3>
              <span className="text-[10px] font-black text-white bg-slate-800 px-2 py-1 rounded-lg tracking-tighter">TOP 8</span>
            </div>
            
            <div className="space-y-4">
              {topDiseases.slice(0, 8).map(({ disease, count }, i) => {
                const isMild = ["Respiratory Infection", "Parasitic Infection", "Digestive Issue / Scours", "Skin Condition / Mange", "Physical Injury / Lameness"].includes(disease);
                const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                
                return (
                  <div key={i} className="group flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className={`text-[9px] font-black uppercase tracking-tight ${isMild ? 'text-orange-500' : 'text-violet-600'}`}>
                          {isMild ? 'Mild Severity' : 'Critical Threat'}
                        </span>
                        <span className="font-bold text-slate-800 text-[13px] sm:text-sm uppercase leading-tight group-hover:text-red-600 transition-colors">
                          {disease}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 text-sm sm:text-base leading-none">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner relative border border-slate-200/50">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${
                          isMild ? 'bg-gradient-to-r from-orange-400 to-orange-600' : 'bg-gradient-to-r from-violet-500 to-indigo-700'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* KEY INSIGHTS (MoM text removed) */}
        <div className="mt-12 sm:mt-16 flex justify-center px-2 sm:px-0">
          <div className="group bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 p-8 sm:p-10 lg:p-12 rounded-[2.5rem] sm:rounded-[3rem] border border-indigo-200/60 shadow-2xl w-full transition-all duration-500 hover:shadow-3xl hover:-translate-y-2 text-center">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-indigo-900 mb-4 sm:mb-6 tracking-tight">
              Strategic Health Insights
            </h3>
            
            <div className="space-y-4 sm:space-y-6 text-slate-800 leading-relaxed text-base sm:text-lg max-w-4xl mx-auto px-2 sm:px-0">
              <p>
                Comprehensive analysis shows <strong>{stats.total.toLocaleString()}</strong> total incidents recorded across the selected timeframe. 
                Data peaks are identified in <strong>{stats.maxMonth}</strong> with <strong>{stats.max}</strong> cases.
              </p>

              {stats.riskLevel === "High" ? (
                <p className="text-red-700 font-medium">
                  <strong>Urgent Action:</strong> Current case volume suggests high transmission risk. 
                  Prioritize vaccination in areas reporting <strong>Critical</strong> (Violet) cases.
                </p>
              ) : (
                <p className="text-emerald-700 font-medium">
                  <strong>Stable Status:</strong> Total cases are manageable. 
                  Continue monitoring <strong>Mild</strong> (Orange) cases to prevent cluster outbreaks.
                </p>
              )}

              <p className="text-slate-600 italic mt-4 sm:mt-6 text-xs sm:text-sm">
                *Multi-layer chart includes verified blockchain entries for total, mild, and dangerous severities.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 pb-8 sm:pb-12">
          <button onClick={() => navigate("/home")} className="px-8 sm:px-10 py-4 sm:py-5 bg-slate-800 text-white rounded-2xl font-black text-base sm:text-lg transition-all shadow-xl hover:bg-slate-700 active:scale-95 w-full sm:w-auto">
            ← Return to Home
          </button>
        </div>
      </main>
    </div>
  );
}