// src/pages/admin/LivestockDatabase.jsx
import React, { useState, useEffect, useMemo } from "react";
import AuditTrailModal from "../../components/common/AuditTrailModal";
import MedicalLogModal from "../../components/common/MedicalLogModal";

export default function AdminAnimalDB() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("active"); // 'active' or 'archived'
  const [farmerData, setFarmerData] = useState([]);

  // --- Table Controls State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBarangay, setFilterBarangay] = useState("All");
  const [sortConfig, setSortConfig] = useState("sick-desc"); // Default: show sickest farms first

  // Blockchain History States
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  // Animal Selection States
  const [showAnimalListModal, setShowAnimalListModal] = useState(false);
  const [farmerAnimals, setFarmerAnimals] = useState([]);
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  // Health Log States
  const [healthLogs, setHealthLogs] = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  useEffect(() => {
    fetchAllTransactions();
  }, [activeTab]);

  const fetchAllTransactions = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/transactions");
      const data = await res.json();
      setTransactions(data || []);
      processTransactions(data || []);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const processTransactions = (txList) => {
    // 1. FILTER based on Active Tab
    const filteredList = txList.filter((tx) => {
      const isArchived = ["Slaughtered", "Exported", "Culled"].includes(
        tx.status,
      );
      return activeTab === "active" ? !isArchived : isArchived;
    });

    // 2. GROUP by Farmer + Location
    const grouped = {};
    filteredList.forEach((tx) => {
      const farmer = tx.fullName || "Unknown";
      const barangay = tx.location || "Unknown";
      const key = `${farmer}-${barangay}`;

      if (!grouped[key]) {
        grouped[key] = {
          farmer,
          barangay,
          verifiedHealthy: 0,
          unverified: 0,
          sick: 0,
          archivedCount: 0,
          culledCount: 0,
          transactions: [],
        };
      }

      grouped[key].transactions.push(tx);

      // Count Logic
      if (tx.status === "Culled") {
        grouped[key].culledCount += tx.quantity || 1; // <--- NEW TALLY
      } else if (["Slaughtered", "Exported"].includes(tx.status)) {
        grouped[key].archivedCount += tx.quantity || 1;
      } else {
        const severity = (tx.severity || "").toLowerCase();
        if (severity === "mild" || severity === "dangerous") {
          grouped[key].sick += tx.quantity || 1;
        } else if (severity === "safe") {
          grouped[key].verifiedHealthy += tx.quantity || 1;
        } else {
          grouped[key].unverified += tx.quantity || 1;
        }
      }
    });

    setFarmerData(Object.values(grouped));
  };

  // --- Smart Filtering & Sorting Logic ---
  const uniqueBarangays = useMemo(() => {
    return ["All", ...new Set(farmerData.map((d) => d.barangay))].sort();
  }, [farmerData]);

  const processedData = useMemo(() => {
    return farmerData
      .filter((d) => {
        // 1. Search Filter
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          d.farmer.toLowerCase().includes(query) ||
          d.barangay.toLowerCase().includes(query);

        // 2. Dropdown Filter
        const matchesBarangay =
          filterBarangay === "All" || d.barangay === filterBarangay;

        return matchesSearch && matchesBarangay;
      })
      .sort((a, b) => {
        // 3. Sorting
        if (sortConfig === "name-asc") return a.farmer.localeCompare(b.farmer);

        if (activeTab === "archived") {
          return b.archivedCount - a.archivedCount;
        }

        if (sortConfig === "sick-desc") return b.sick - a.sick;
        if (sortConfig === "total-desc") {
          const totalA = a.verifiedHealthy + a.unverified + a.sick;
          const totalB = b.verifiedHealthy + b.unverified + b.sick;
          return totalB - totalA;
        }
        return 0;
      });
  }, [farmerData, searchQuery, filterBarangay, sortConfig, activeTab]);

  const viewFarmerAnimals = (farmer, barangay) => {
    const animals = transactions.filter(
      (tx) => tx.fullName === farmer && tx.location === barangay,
    );
    const currentTabAnimals = animals.filter((tx) => {
      const isArchived = ["Slaughtered", "Exported", "Culled"].includes(
        tx.status,
      );
      return activeTab === "active" ? !isArchived : isArchived;
    });

    setFarmerAnimals(currentTabAnimals);
    setSelectedFarmer({ farmer, barangay });
    setShowAnimalListModal(true);
  };

  const viewBlockchainHistory = async (transaction) => {
    setSelectedAnimal(transaction);
    setShowAnimalListModal(false);
    setHistoryLoading(true);
    setShowHistoryModal(true);

    try {
      if (transaction) {
        const adminUser = localStorage.getItem("username");
        const adminMsp = localStorage.getItem("mspId");

        const lookupId = transaction.batchId || transaction._id;
        const url = `http://localhost:3001/api/transactions/history/${lookupId}?username=${adminUser}&mspId=${adminMsp}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Blockchain data unreachable");

        const data = await res.json();
        setHistory(data || []);
      }
    } catch (err) {
      console.error("Blockchain Error:", err.message);
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const viewHealthRecords = async (transaction) => {
    setSelectedAnimal(transaction);
    setShowAnimalListModal(false);
    setHealthLoading(true);
    setShowHealthModal(true);

    const lookupId = transaction.batchId || transaction._id;

    try {
      const res = await fetch(
        `http://localhost:3001/api/health-records/${lookupId}`,
      );
      if (!res.ok) throw new Error("Failed to fetch health records");
      const data = await res.json();
      setHealthLogs(data || []);
    } catch (err) {
      console.error("Health Log Error:", err.message);
      setHealthLogs([]);
    } finally {
      setHealthLoading(false);
    }
  };

  const closeAllModals = () => {
    setShowAnimalListModal(false);
    setShowHistoryModal(false);
    setShowHealthModal(false);
    setSelectedFarmer(null);
    setSelectedAnimal(null);
    setHistory([]);
  };

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-emerald-600">Loading Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen w-full font-sans pb-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Livestock Database
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Global health status of all registered assets in Santa Rosa.
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex w-full md:w-auto">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "active" ? "bg-emerald-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
          >
            🟢 Active Inventory
          </button>
          <button
            onClick={() => setActiveTab("archived")}
            className={`flex-1 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "archived" ? "bg-slate-700 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
          >
            🗄️ Exited / Archived
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {activeTab === "active" ? (
          <>
            <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-3xl text-center shadow-sm">
              <p className="text-xs font-black uppercase text-emerald-600 tracking-widest opacity-80">
                Verified Safe
              </p>
              <p className="text-5xl font-black text-emerald-700 mt-2">
                {farmerData.reduce((sum, d) => sum + d.verifiedHealthy, 0)}
              </p>
            </div>
            <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl text-center shadow-sm">
              <p className="text-xs font-black uppercase text-amber-600 tracking-widest opacity-80">
                Unverified
              </p>
              <p className="text-5xl font-black text-amber-700 mt-2">
                {farmerData.reduce((sum, d) => sum + d.unverified, 0)}
              </p>
            </div>
            <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl text-center shadow-sm">
              <p className="text-xs font-black uppercase text-red-600 tracking-widest opacity-80">
                Confirmed Sick
              </p>
              <p className="text-5xl font-black text-red-700 mt-2">
                {farmerData.reduce((sum, d) => sum + d.sick, 0)}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* CHANGED to col-span-2 */}
            <div className="col-span-2 bg-slate-100 border-2 border-slate-200 p-6 rounded-3xl text-center shadow-sm">
              <p className="text-xs font-black uppercase text-slate-500 tracking-widest opacity-80">
                Safe Exits (Slaughtered/Exported)
              </p>
              <p className="text-5xl font-black text-slate-700 mt-2">
                {farmerData.reduce((sum, d) => sum + d.archivedCount, 0)}
              </p>
            </div>

            {/* Culled Biohazard Box */}
            <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl text-center shadow-sm">
              <p className="text-xs font-black uppercase text-red-600 tracking-widest opacity-80 flex items-center justify-center gap-2">
                <span></span> Total Culled
              </p>
              <p className="text-5xl font-black text-red-700 mt-2">
                {farmerData.reduce((sum, d) => sum + d.culledCount, 0)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* FARMER LIST TABLE SECTION */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden flex flex-col">
        {/* DATA TOOLBAR */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col lg:flex-row justify-between gap-4 items-center">
          {/* SEARCH */}
          <div className="relative w-full lg:w-96">
            <span className="absolute left-4 top-3 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search Farmer or Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm shadow-sm transition-all"
            />
          </div>

          {/* FILTERS & SORT */}
          <div className="flex gap-3 w-full lg:w-auto">
            <select
              value={filterBarangay}
              onChange={(e) => setFilterBarangay(e.target.value)}
              className="flex-1 lg:w-48 bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm shadow-sm cursor-pointer"
            >
              {uniqueBarangays.map((b) => (
                <option key={b} value={b}>
                  {b === "All" ? "All Barangays" : b}
                </option>
              ))}
            </select>

            <select
              value={sortConfig}
              onChange={(e) => setSortConfig(e.target.value)}
              className="flex-1 lg:w-56 bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-sm shadow-sm cursor-pointer"
            >
              {activeTab === "active" ? (
                <>
                  <option value="sick-desc">Sort: Most Sick First</option>
                  <option value="total-desc">Sort: Total Inventory</option>
                  <option value="name-asc">Sort: Name (A-Z)</option>
                </>
              ) : (
                <>
                  <option value="total-desc">Sort: Most Exits</option>
                  <option value="name-asc">Sort: Name (A-Z)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-600 text-white text-xs uppercase tracking-wider">
                <th className="p-5 pl-8 font-bold">Owner</th>
                <th className="p-5 font-bold">Location</th>
                {activeTab === "active" ? (
                  <>
                    <th className="p-5 font-bold text-center bg-emerald-700/30">
                      Verified
                    </th>
                    <th className="p-5 font-bold text-center bg-amber-600/20">
                      Unverified
                    </th>
                    <th className="p-5 font-bold text-center bg-red-700/30">
                      Sick
                    </th>
                  </>
                ) : (
                  <>
                    <th className="p-5 font-bold text-center bg-slate-700/30">
                      Safe Exits
                    </th>
                    <th className="p-5 font-bold text-center bg-red-700/30">
                      Culled
                    </th>
                  </>
                )}
                <th className="p-5 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-16 text-center text-gray-500">
                    <div className="text-4xl mb-3 opacity-50">📂</div>
                    <p className="font-bold text-lg">No records found</p>
                    <p className="text-sm mt-1">
                      Try adjusting your search or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                processedData.map((data, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-emerald-50/40 transition-colors group"
                  >
                    <td className="p-5 pl-8 font-black text-gray-700 group-hover:text-emerald-700 transition-colors">
                      {data.farmer}
                    </td>
                    <td className="p-5 text-gray-500 font-medium">
                      {data.barangay}
                    </td>

                    {activeTab === "active" ? (
                      <>
                        <td className="p-5 text-center font-black text-emerald-600 bg-emerald-50/30">
                          {data.verifiedHealthy || "-"}
                        </td>
                        <td className="p-5 text-center font-black text-amber-600 bg-amber-50/30">
                          {data.unverified || "-"}
                        </td>
                        <td className="p-5 text-center font-black text-red-600 bg-red-50/30">
                          {data.sick || "-"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-5 text-center font-black text-slate-600 bg-slate-50/30">
                          {data.archivedCount || "-"}
                        </td>
                        <td className="p-5 text-center font-black text-red-600 bg-red-50/30">
                          {data.culledCount || "-"}
                        </td>
                      </>
                    )}

                    <td className="p-5 text-center pr-8">
                      <button
                        onClick={() =>
                          viewFarmerAnimals(data.farmer, data.barangay)
                        }
                        className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 hover:shadow-md transition-all active:scale-95"
                      >
                        View Batches
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === LEVEL 1 MODAL: FARMER'S ANIMALS === */}
      {showAnimalListModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-gray-800">
                  Livestock Batches
                </h2>
                <p className="text-sm text-emerald-600 font-bold uppercase tracking-tight mt-1">
                  {selectedFarmer?.farmer} — {selectedFarmer?.barangay}
                </p>
              </div>
              <button
                onClick={closeAllModals}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-4 bg-gray-50/50">
              {farmerAnimals.length === 0 ? (
                <p className="text-center text-slate-400 py-10 italic">
                  No animals found for this criteria.
                </p>
              ) : (
                farmerAnimals.map((animal, idx) => {
                  const isSick =
                    animal.severity === "mild" ||
                    animal.severity === "dangerous";

                  return (
                    <div
                      key={animal._id || idx}
                      className={`bg-white border rounded-2xl p-6 transition-all hover:shadow-md group ${
                        isSick
                          ? "border-red-300 shadow-sm shadow-red-100"
                          : "border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4
                              className={`text-xl font-black capitalize ${isSick ? "text-red-700" : "text-gray-800 group-hover:text-emerald-600 transition-colors"}`}
                            >
                              {isSick && (
                                <span className="mr-2" title="Sick Asset">
                                  ⚠️
                                </span>
                              )}
                              {animal.species}
                            </h4>
                            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-md font-mono border border-slate-200">
                              {animal.batchId || "Legacy ID"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Quantity:{" "}
                            <span className="font-bold text-gray-700">
                              {animal.quantity} heads
                            </span>
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${isSick ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}
                        >
                          {formatDate(animal.timestamp)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div
                          className={`p-3 rounded-lg border ${isSick || animal.status === "Culled" ? "bg-red-50/50 border-red-100" : "bg-slate-50 border-slate-100"}`}
                        >
                          <span className="block text-slate-400 text-xs mb-1">
                            Status / Health
                          </span>
                          <span
                            className={`font-semibold ${isSick || animal.status === "Culled" ? "text-red-700" : "text-slate-800"}`}
                          >
                            {animal.status === "Culled"
                              ? "CULLED & DISPOSED"
                              : isSick && animal.diagnosedDisease
                                ? animal.diagnosedDisease
                                : animal.status}
                          </span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <span className="block text-slate-400 text-xs mb-1">
                            Location
                          </span>
                          <span className="text-slate-800 font-semibold">
                            {animal.location}
                          </span>
                        </div>
                      </div>

                      {/* ACTION BUTTONS ROW */}
                      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                        {/* --- EXIT PROOF BUTTON (Only for Exited Assets) --- */}
                        {animal.proofDocumentUrl &&
                          ["Slaughtered", "Exported"].includes(
                            animal.status,
                          ) && (
                            <a
                              href={animal.proofDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-purple-600 text-sm font-semibold hover:text-purple-700 bg-purple-50 border border-purple-100 px-4 py-2 rounded-lg transition-colors"
                            >
                              📄 View Exit Proof
                            </a>
                          )}
                        <button
                          onClick={() => viewHealthRecords(animal)}
                          className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors"
                        >
                          Medical Log
                        </button>
                        <button
                          onClick={() => viewBlockchainHistory(animal)}
                          className="flex items-center text-emerald-600 text-sm font-bold hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg transition-colors"
                        >
                          Audit Trail
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Medical Records Modal --- */}
      <MedicalLogModal
        isOpen={showHealthModal}
        onClose={closeAllModals}
        healthLoading={healthLoading}
        healthLogs={healthLogs}
        selectedAnimal={selectedAnimal}
      />
      {/* Blockchain History Modal */}
      <AuditTrailModal
        isOpen={showHistoryModal}
        onClose={closeAllModals}
        historyLoading={historyLoading}
        history={history}
        selectedAnimal={selectedAnimal}
      />
    </div>
  );
}
