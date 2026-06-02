// src/pages/admin/TransactionLogs.jsx
import API_URL from "../../config/api";
import React, { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";

export default function AdminTransaction() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- UI Filter & Search States (Matching Livestock Layout) ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBarangay, setFilterBarangay] = useState("All");
  const [filterSeverity, setFilterSeverity] = useState("All");

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/transactions`);
      const data = await res.json();
      setTransactions(data || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Smart Filtering Engine ---
  const uniqueBarangays = useMemo(() => {
    const locations = transactions.map((tx) => tx.location).filter(Boolean);
    return ["All", ...new Set(locations)].sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Unified Search Query
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (tx.username || "").toLowerCase().includes(query) ||
        (tx.fullName || "").toLowerCase().includes(query) ||
        (tx.species || "").toLowerCase().includes(query) ||
        (tx.diagnosedDisease || "").toLowerCase().includes(query);

      // 2. Location/Barangay Dropdown
      const matchesBarangay =
        filterBarangay === "All" || tx.location === filterBarangay;

      // 3. Severity Dropdown
      const txSeverity = (tx.severity || "pending").toLowerCase();
      const matchesSeverity =
        filterSeverity === "All" || txSeverity === filterSeverity.toLowerCase();

      return matchesSearch && matchesBarangay && matchesSeverity;
    });
  }, [transactions, searchQuery, filterBarangay, filterSeverity]);

  // --- Functional Client-Side CSV Export Engine ---
  const handleDownload = () => {
    if (filteredTransactions.length === 0) {
      alert("No matching data records available to export.");
      return;
    }

    const headers = [
      "User Account",
      "Full Name",
      "Contact No.",
      "Species",
      "Quantity",
      "Location",
      "Initial Observation",
      "Diagnosis",
      "Severity Level",
      "Date Registry"
    ];

    const csvRows = [
      headers.join(","),
      ...filteredTransactions.map((tx) => {
        const rowData = [
          tx.username || "",
          tx.fullName || "",
          tx.contactNumber || "",
          tx.species || "",
          tx.quantity || 0,
          tx.location || "",
          tx.healthStatus || "",
          tx.diagnosedDisease || "Unexamined",
          (tx.severity || "PENDING").toUpperCase(),
          tx.timestamp ? format(new Date(tx.timestamp), "yyyy-MM-dd HH:mm:ss") : "N/A"
        ];

        // Safely escape fields containing commas or quotes
        return rowData
          .map((field) => {
            const escaped = String(field).replace(/"/g, '""');
            return escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")
              ? `"${escaped}"`
              : escaped;
          })
          .join(",");
      })
    ];

    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join("\n"));
    
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `Disease_Reports_Export_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-emerald-600">Loading Report Ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 min-h-screen w-full font-sans pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Transaction History
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            All animal disease reports and health evaluations submitted by users.
          </p>
        </div>
      </div>

      {/* COMPACT REGISTRY TABLE BOX */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col">
        
        {/* UPPER DATA FILTERBAR TOOLBAR */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row justify-between gap-4 items-center">
          
          {/* SEARCH INPUT */}
          <div className="relative w-full lg:w-80">
            <span className="absolute left-4 top-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search User, Specie, or Disease..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm shadow-sm transition-all"
            />
          </div>

          {/* DROPDOWN CRITERIAS & CSV CONSOLE */}
          <div className="flex flex-wrap lg:flex-nowrap gap-3 w-full lg:w-auto items-center">
            <select
              value={filterBarangay}
              onChange={(e) => setFilterBarangay(e.target.value)}
              className="flex-1 lg:w-44 bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm shadow-sm cursor-pointer"
            >
              {uniqueBarangays.map((b) => (
                <option key={b} value={b}>
                  {b === "All" ? "All Barangays" : b}
                </option>
              ))}
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="flex-1 lg:w-44 bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm shadow-sm cursor-pointer"
            >
              <option value="All">All Severities</option>
              <option value="Safe">Safe</option>
              <option value="Mild">Mild</option>
              <option value="Dangerous">Dangerous</option>
              <option value="Pending">Pending Review</option>
            </select>

            <button
              onClick={handleDownload}
              disabled={filteredTransactions.length === 0}
              className="w-full lg:w-auto bg-emerald-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 hover:shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2"
            >
              📊 Export CSV
            </button>
          </div>
        </div>

        {/* CORE DATA TABLE DISPLAY */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-600 text-white text-xs uppercase tracking-wider">
                <th className="p-5 pl-8 font-bold">User Account</th>
                <th className="p-5 font-bold">Full Name</th>
                <th className="p-5 font-bold">Contact No.</th>
                <th className="p-5 font-bold">Species</th>
                <th className="p-5 font-bold text-center">Qty</th>
                <th className="p-5 font-bold">Location</th>
                <th className="p-5 font-bold">Observation</th>
                <th className="p-5 font-bold">Diagnosis</th>
                <th className="p-5 font-bold text-center">Severity</th>
                <th className="p-5 font-bold text-center pr-8">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-16 text-center text-gray-500">
                    <div className="text-4xl mb-3 opacity-50">📂</div>
                    <p className="font-bold text-lg">No log transactions tracked</p>
                    <p className="text-sm mt-1">Try re-adjusting your filters or search keywords.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => {
                  const severityStr = (tx.severity || "").toLowerCase();
                  return (
                    <tr
                      key={tx._id || idx}
                      className="hover:bg-emerald-50/40 transition-colors group text-sm"
                    >
                      <td className="p-5 pl-8 font-black text-gray-700 group-hover:text-emerald-700 transition-colors whitespace-nowrap">
                        {tx.username}
                      </td>
                      <td className="p-5 text-gray-600 font-semibold whitespace-nowrap">
                        {tx.fullName}
                      </td>
                      <td className="p-5 text-gray-500 font-mono tracking-tight whitespace-nowrap">
                        {tx.contactNumber}
                      </td>
                      <td className="p-5 whitespace-nowrap">
                        <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-md font-bold uppercase border border-slate-200">
                          {tx.species}
                        </span>
                      </td>
                      <td className="p-5 text-center font-black text-gray-700 font-mono">
                        {tx.quantity || 1}
                      </td>
                      <td className="p-5 text-gray-500 font-medium whitespace-nowrap">
                        {tx.location}
                      </td>
                      <td className="p-5 text-gray-500 max-w-xs truncate font-medium" title={tx.healthStatus}>
                        {tx.healthStatus}
                      </td>
                      <td className="p-5 font-bold whitespace-nowrap">
                        {tx.diagnosedDisease ? (
                          <span className="text-emerald-700">{tx.diagnosedDisease}</span>
                        ) : (
                          <span className="text-slate-400 italic text-xs font-normal">Unexamined</span>
                        )}
                      </td>
                      <td className="p-5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black tracking-wide border ${
                            severityStr === "safe"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : severityStr === "mild"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : severityStr === "dangerous"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}
                        >
                          {tx.severity ? tx.severity.toUpperCase() : "PENDING"}
                        </span>
                      </td>
                      <td className="p-5 text-center pr-8 text-xs font-medium text-gray-400 whitespace-nowrap">
                        {tx.timestamp ? format(new Date(tx.timestamp), "PPp") : "N/A"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}