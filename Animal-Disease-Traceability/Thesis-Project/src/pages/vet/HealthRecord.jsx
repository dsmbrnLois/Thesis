import React, { useState, useEffect, useMemo } from "react";
import MedicalLogModal from "../../components/common/MedicalLogModal";

export default function HealthRecord() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [farmerData, setFarmerData] = useState([]);

  // --- Table Controls State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBarangay, setFilterBarangay] = useState("All");
  const [sortConfig, setSortConfig] = useState("sick-desc"); // Default: show sickest farms first

  // LEVEL 1 MODAL: List of Animals for a Farmer
  const [showAnimalListModal, setShowAnimalListModal] = useState(false);
  const [farmerAnimals, setFarmerAnimals] = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(null);

  // LEVEL 2 MODAL: Medical History for specific Animal
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthLogs, setHealthLogs] = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/transactions");
      const data = await res.json();
      const txData = Array.isArray(data) ? data : [];

      const activeAnimals = txData.filter(
        (tx) => !["Slaughtered", "Exported"].includes(tx.status),
      );
      setTransactions(activeAnimals);
      processFarmerStats(activeAnimals);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  const processFarmerStats = (txList) => {
    if (!txList) return;
    const grouped = {};
    txList.forEach((tx) => {
      const key = `${tx.fullName || "Unknown"}-${tx.location || "Unknown"}`;
      if (!grouped[key]) {
        grouped[key] = {
          farmer: tx.fullName || "Unknown",
          barangay: tx.location || "Unknown",
          verifiedHealthy: 0,
          unverified: 0,
          sick: 0,
        };
      }
      const severity = (tx.severity || "").toLowerCase();
      const qty = Number(tx.quantity) || 1;

      if (severity === "mild" || severity === "dangerous") {
        grouped[key].sick += qty;
      } else if (severity === "safe") {
        grouped[key].verifiedHealthy += qty;
      } else {
        grouped[key].unverified += qty;
      }
    });
    setFarmerData(Object.values(grouped));
  };

  // --- Filtering & Sorting Logic ---
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
        if (sortConfig === "sick-desc") return b.sick - a.sick;
        if (sortConfig === "total-desc") {
          const totalA = a.verifiedHealthy + a.unverified + a.sick;
          const totalB = b.verifiedHealthy + b.unverified + b.sick;
          return totalB - totalA;
        }
        return 0;
      });
  }, [farmerData, searchQuery, filterBarangay, sortConfig]);

  const viewFarmerAnimals = (farmer, barangay) => {
    const animals = transactions.filter(
      (t) => t.fullName === farmer && t.location === barangay,
    );
    setFarmerAnimals(animals);
    setSelectedFarmer({ farmer, barangay });
    setShowAnimalListModal(true);
  };

  // --- FETCH MEDICAL RECORDS ---
  const viewMedicalLog = async (animal) => {
    setSelectedAnimal(animal);
    setShowHealthModal(true);
    setHealthLoading(true);

    const lookupId = animal.batchId || animal._id;

    try {
      const res = await fetch(
        `http://localhost:3001/api/health-records/${lookupId}`,
      );
      if (!res.ok) throw new Error("Failed to load records");
      const data = await res.json();
      setHealthLogs(data || []);
    } catch (err) {
      console.error(err);
      setHealthLogs([]);
    } finally {
      setHealthLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleDateString();
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-green-600">Loading Database...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-8 pb-10">
      {/* HEADER */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-green-100 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-800">
            Livestock Health Registry
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Monitoring logs, vaccinations, and disease status.
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-2xl shadow-inner hidden sm:block">
          <span className="text-4xl">🩺</span>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-50 border-2 border-emerald-200 p-6 rounded-3xl text-center shadow-sm">
          <p className="text-xs font-black uppercase text-emerald-600 tracking-widest opacity-80">
            Verified Healthy
          </p>
          <p className="text-5xl font-black text-emerald-700 mt-2">
            {farmerData.reduce((s, d) => s + d.verifiedHealthy, 0)}
          </p>
        </div>
        <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-3xl text-center shadow-sm">
          <p className="text-xs font-black uppercase text-amber-600 tracking-widest opacity-80">
            Unverified
          </p>
          <p className="text-5xl font-black text-amber-700 mt-2">
            {farmerData.reduce((s, d) => s + d.unverified, 0)}
          </p>
        </div>
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl text-center shadow-sm">
          <p className="text-xs font-black uppercase text-red-600 tracking-widest opacity-80">
            Confirmed Sick
          </p>
          <p className="text-5xl font-black text-red-700 mt-2">
            {farmerData.reduce((s, d) => s + d.sick, 0)}
          </p>
        </div>
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
              placeholder="Search Farmer or Barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm shadow-sm transition-all"
            />
          </div>

          {/* FILTERS & SORT */}
          <div className="flex gap-3 w-full lg:w-auto">
            <select
              value={filterBarangay}
              onChange={(e) => setFilterBarangay(e.target.value)}
              className="flex-1 lg:w-48 bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm shadow-sm cursor-pointer"
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
              className="flex-1 lg:w-56 bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-medium text-sm shadow-sm cursor-pointer"
            >
              <option value="sick-desc">Sort: Most Sick First</option>
              <option value="total-desc">Sort: Total Inventory</option>
              <option value="name-asc">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-green-600 text-white">
                <th className="p-5 pl-8 text-xs font-bold uppercase tracking-wider">
                  Farmer Name
                </th>
                <th className="p-5 text-xs font-bold uppercase tracking-wider">
                  Barangay
                </th>
                <th className="p-5 text-center text-xs font-bold uppercase tracking-wider bg-green-700/30">
                  Healthy
                </th>
                <th className="p-5 text-center text-xs font-bold uppercase tracking-wider bg-amber-600/20">
                  Unverified
                </th>
                <th className="p-5 text-center text-xs font-bold uppercase tracking-wider bg-red-700/30">
                  Sick
                </th>
                <th className="p-5 text-center text-xs font-bold uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-16 text-center">
                    <div className="text-4xl mb-3 opacity-50">📂</div>
                    <p className="text-gray-500 font-bold text-lg">
                      No records found
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Try adjusting your search or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                processedData.map((data, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-green-50/40 transition-colors group"
                  >
                    <td className="p-5 pl-8 font-black text-gray-700 group-hover:text-green-700 transition-colors">
                      {data.farmer}
                    </td>
                    <td className="p-5 text-gray-500 font-medium">
                      {data.barangay}
                    </td>
                    <td className="p-5 text-center font-black text-emerald-600 bg-emerald-50/30">
                      {data.verifiedHealthy || "-"}
                    </td>
                    <td className="p-5 text-center font-black text-amber-600 bg-amber-50/30">
                      {data.unverified || "-"}
                    </td>
                    <td className="p-5 text-center font-black text-red-600 bg-red-50/30">
                      {data.sick || "-"}
                    </td>
                    <td className="p-5 text-center pr-8">
                      <button
                        onClick={() =>
                          viewFarmerAnimals(data.farmer, data.barangay)
                        }
                        className="bg-green-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-green-700 hover:shadow-md transition-all active:scale-95"
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
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-gray-800">
                  Livestock Batches
                </h2>
                <p className="text-sm text-green-600 font-bold uppercase tracking-tight mt-1">
                  {selectedFarmer?.farmer} — {selectedFarmer?.barangay}
                </p>
              </div>
              <button
                onClick={() => setShowAnimalListModal(false)}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-full text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-4 bg-gray-50/50">
              {farmerAnimals.map((animal, i) => (
                <div
                  key={i}
                  className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:border-green-300 hover:shadow-md transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-black text-gray-800 capitalize">
                          {animal.species}
                        </span>
                        <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-md font-mono border border-slate-200">
                          {animal.batchId || "LEGACY"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Qty:{" "}
                        <span className="font-bold text-gray-800">
                          {animal.quantity}
                        </span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        animal.severity === "safe"
                          ? "bg-emerald-100 text-emerald-700"
                          : animal.severity === "mild" ||
                              animal.severity === "dangerous"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {animal.severity === "safe"
                        ? "Verified Healthy"
                        : animal.severity === "mild" ||
                            animal.severity === "dangerous"
                          ? "Sick / Flagged"
                          : "Unverified"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-2">
                    <p className="text-xs text-gray-400 font-medium">
                      Registered: {formatDate(animal.timestamp)}
                    </p>
                    <button
                      onClick={() => viewMedicalLog(animal)}
                      className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
                    >
                      📄 View Medical Log
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === LEVEL 2 MODAL: MEDICAL HISTORY === */}
      <MedicalLogModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        healthLoading={healthLoading}
        healthLogs={healthLogs}
        selectedAnimal={selectedAnimal}
      />
    </div>
  );
}
