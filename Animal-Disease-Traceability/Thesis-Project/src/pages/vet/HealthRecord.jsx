import React, { useState, useEffect, useMemo } from "react";
import API_URL from "../../config/api";
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
      const res = await fetch(`${API_URL}/transactions`);
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
        `${API_URL}/health-records/${lookupId}`,
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
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="font-mono text-label-caps text-primary uppercase">Loading Database...</p>
        </div>
      </div>
    );

  return (
    <div className="space-y-md pb-10">
      {/* ── HEADER ── */}
      <div className="bg-surface p-xl border border-outline-variant flex justify-between items-center">
        <div>
          <h1 className="font-display text-display-sm text-primary uppercase tracking-tight">
            Livestock Health Registry
          </h1>
          <p className="font-body text-body-lg text-on-surface-variant mt-1">
            Monitoring logs, vaccinations, and disease status.
          </p>
        </div>
        <div className="bg-surface-container-highest p-md hidden sm:block border border-outline-variant">
          <span className="material-symbols-outlined text-[32px] text-primary">clinical_notes</span>
        </div>
      </div>

      {/* ── SUMMARY TAPE ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-outline-variant bg-surface">
        <div className="p-lg text-center border-b md:border-b-0 md:border-r border-outline-variant flex flex-col justify-center items-center bg-tertiary-fixed/10">
          <p className="font-mono text-label-caps text-on-surface-variant uppercase tracking-widest mb-2">
            Verified Healthy
          </p>
          <p className="font-display text-display-md text-tertiary">
            {farmerData.reduce((s, d) => s + d.verifiedHealthy, 0)}
          </p>
        </div>
        <div className="p-lg text-center border-b md:border-b-0 md:border-r border-outline-variant flex flex-col justify-center items-center bg-surface-container-low">
          <p className="font-mono text-label-caps text-on-surface-variant uppercase tracking-widest mb-2">
            Unverified
          </p>
          <p className="font-display text-display-md text-on-surface">
            {farmerData.reduce((s, d) => s + d.unverified, 0)}
          </p>
        </div>
        <div className="p-lg text-center flex flex-col justify-center items-center bg-error-container/20">
          <p className="font-mono text-label-caps text-error uppercase tracking-widest mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            Confirmed Sick
          </p>
          <p className="font-display text-display-md text-error">
            {farmerData.reduce((s, d) => s + d.sick, 0)}
          </p>
        </div>
      </div>

      {/* ── DATA TABLE SECTION ── */}
      <div className="bg-surface border border-outline-variant flex flex-col">
        {/* TOOLBAR */}
        <div className="p-md border-b border-outline-variant bg-surface-container-lowest flex flex-col lg:flex-row justify-between gap-md items-center">
          {/* SEARCH */}
          <div className="relative w-full lg:w-96">
            <span className="absolute left-3 top-2.5 text-on-surface-variant material-symbols-outlined text-[20px]">search</span>
            <input
              type="text"
              placeholder="Search Farmer or Barangay..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant text-on-surface font-body text-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors uppercase placeholder:normal-case placeholder:font-mono placeholder:text-label-caps"
            />
          </div>

          {/* FILTERS & SORT */}
          <div className="flex gap-sm w-full lg:w-auto">
            <select
              value={filterBarangay}
              onChange={(e) => setFilterBarangay(e.target.value)}
              className="flex-1 lg:w-48 bg-surface border border-outline-variant text-on-surface font-mono text-label-caps py-2 px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer uppercase"
            >
              {uniqueBarangays.map((b) => (
                <option key={b} value={b}>
                  {b === "All" ? "ALL BARANGAYS" : b}
                </option>
              ))}
            </select>

            <select
              value={sortConfig}
              onChange={(e) => setSortConfig(e.target.value)}
              className="flex-1 lg:w-56 bg-surface border border-outline-variant text-on-surface font-mono text-label-caps py-2 px-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer uppercase"
            >
              <option value="sick-desc">SORT: MOST SICK FIRST</option>
              <option value="total-desc">SORT: TOTAL INVENTORY</option>
              <option value="name-asc">SORT: NAME (A-Z)</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container border-b border-outline-variant">
                <th className="p-md pl-lg font-mono text-label-caps text-on-surface uppercase tracking-wider">
                  FARMER NAME
                </th>
                <th className="p-md font-mono text-label-caps text-on-surface uppercase tracking-wider">
                  BARANGAY
                </th>
                <th className="p-md text-center font-mono text-label-caps text-on-surface uppercase tracking-wider">
                  HEALTHY
                </th>
                <th className="p-md text-center font-mono text-label-caps text-on-surface uppercase tracking-wider">
                  UNVERIFIED
                </th>
                <th className="p-md text-center font-mono text-label-caps text-on-surface uppercase tracking-wider">
                  SICK
                </th>
                <th className="p-md text-center font-mono text-label-caps text-on-surface uppercase tracking-wider">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-xl text-center bg-surface-container-lowest">
                    <span className="material-symbols-outlined text-[48px] text-outline mb-2">folder_open</span>
                    <p className="font-mono text-label-caps text-on-surface-variant uppercase">
                      No records found
                    </p>
                    <p className="font-body text-body-sm text-outline mt-1">
                      Try adjusting your search or filters.
                    </p>
                  </td>
                </tr>
              ) : (
                processedData.map((data, idx) => (
                  <tr
                    key={idx}
                    className="bg-surface hover:bg-surface-container-low transition-colors group"
                  >
                    <td className="p-md pl-lg font-body text-body-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                      {data.farmer}
                    </td>
                    <td className="p-md font-mono text-label-caps text-on-surface-variant uppercase">
                      {data.barangay}
                    </td>
                    <td className="p-md text-center">
                      <span className="font-mono text-data-mono text-tertiary font-bold bg-tertiary-fixed/30 px-2 py-0.5 rounded-sm">
                        {data.verifiedHealthy || "-"}
                      </span>
                    </td>
                    <td className="p-md text-center">
                      <span className="font-mono text-data-mono text-on-surface-variant font-bold bg-surface-container-highest px-2 py-0.5 rounded-sm">
                        {data.unverified || "-"}
                      </span>
                    </td>
                    <td className="p-md text-center">
                      <span className="font-mono text-data-mono text-error font-bold bg-error-container/50 px-2 py-0.5 rounded-sm">
                        {data.sick || "-"}
                      </span>
                    </td>
                    <td className="p-md text-center pr-lg">
                      <button
                        onClick={() =>
                          viewFarmerAnimals(data.farmer, data.barangay)
                        }
                        className="bg-surface-container-high border border-outline-variant text-on-surface px-md py-xs font-mono text-label-caps uppercase hover:bg-surface-container-highest hover:text-primary transition-all flex items-center gap-2 mx-auto"
                      >
                        <span className="material-symbols-outlined text-[14px]">visibility</span>
                        VIEW BATCHES
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
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-md" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <div className="bg-surface w-full max-w-3xl max-h-[85vh] flex flex-col shadow-[0_2px_4px_rgba(28,43,58,0.08)] border border-outline-variant relative">
            <div className="px-lg py-md border-b border-outline-variant bg-surface flex justify-between items-center sticky top-0 z-10">
              <div className="flex flex-col">
                <h2 className="font-display text-headline-md text-primary uppercase tracking-tight">
                  Livestock Batches
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-label-caps bg-surface-container-highest px-2 py-0.5 text-on-surface-variant uppercase">
                    FARMER / DOMAIN
                  </span>
                  <span className="font-mono text-data-mono text-primary font-bold">
                    {selectedFarmer?.farmer} — {selectedFarmer?.barangay}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowAnimalListModal(false)}
                className="flex items-center justify-center w-10 h-10 hover:bg-error-container hover:text-error transition-colors text-outline"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-lg overflow-y-auto space-y-md bg-surface-container-lowest" style={{ scrollbarWidth: 'thin', scrollbarColor: '#bec8cb #f7f9ff' }}>
              {farmerAnimals.map((animal, i) => (
                <div
                  key={i}
                  className="bg-surface-container-low p-md border border-outline-variant hover:border-primary transition-all"
                >
                  <div className="flex justify-between items-start mb-md">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-body text-body-lg font-bold text-on-surface capitalize">
                          {animal.species}
                        </span>
                        <span className="bg-surface-container-highest text-on-surface-variant text-[10px] px-2 py-0.5 font-mono uppercase tracking-wider">
                          {animal.batchId || "LEGACY"}
                        </span>
                      </div>
                      <p className="font-mono text-label-caps text-on-surface-variant uppercase">
                        Qty: <span className="font-bold text-on-surface">{animal.quantity}</span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded-sm tracking-wider ${
                        animal.severity === "safe"
                          ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                          : animal.severity === "mild" ||
                              animal.severity === "dangerous"
                            ? "bg-error-container text-on-error-container"
                            : "bg-surface-container-highest text-on-surface-variant"
                      }`}
                    >
                      {animal.severity === "safe"
                        ? "VERIFIED HEALTHY"
                        : animal.severity === "mild" ||
                            animal.severity === "dangerous"
                          ? "SICK / FLAGGED"
                          : "UNVERIFIED"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-md border-t border-outline-variant mt-xs">
                    <p className="font-mono text-label-caps text-on-surface-variant uppercase">
                      Registered: <span className="font-mono text-data-mono text-on-surface">{formatDate(animal.timestamp)}</span>
                    </p>
                    <button
                      onClick={() => viewMedicalLog(animal)}
                      className="flex items-center gap-2 text-on-primary bg-primary px-lg py-xs font-mono text-label-caps uppercase hover:brightness-110 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">clinical_notes</span>
                      View Medical Log
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
