import { useState, useEffect, useMemo } from "react";
import API_URL from "../../config/api";
import TransactionLoadingOverlay from "../../components/common/TransactionLoadingOverlay";
import MedicalLogModal from "../../components/common/MedicalLogModal";

export default function VetTransactionLogs() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // 'pending' or 'managed'
  const [txLoading, setTxLoading] = useState(false);
  const [txMessage, setTxMessage] = useState("");

  // --- Table Controls State ---
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("All");
  const [sortConfig, setSortConfig] = useState("newest"); // 'newest' or 'oldest'

  // MODAL STATES
  const [modalType, setModalType] = useState(null); // 'diagnose', 'update'
  const [selectedTx, setSelectedTx] = useState(null);

  // MEDICAL LOG MODAL STATES
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthLogs, setHealthLogs] = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);

  // FORM STATES
  const [diagnosisForm, setDiagnosisForm] = useState({
    severity: "safe",
    diseasePreset: "",
    customDisease: "",
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/transactions`);
      const data = await res.json();
      const activeData = (data || []).filter(
        (tx) => !["Slaughtered", "Exported", "Culled"].includes(tx.status),
      );
      setTransactions(activeData);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- BASE FILTERS ---
  const pendingTransactions = transactions.filter(
    (t) => t.severity === "Ongoing" || !t.severity,
  );

  const managedTransactions = transactions.filter(
    (t) => t.severity && t.severity !== "Ongoing",
  );

  // --- FILTERING & SORTING LOGIC ---
  const processedTransactions = useMemo(() => {
    const baseList =
      activeTab === "pending" ? pendingTransactions : managedTransactions;

    return baseList
      .filter((tx) => {
        // 1. Search Logic
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          (tx.batchId || "legacy").toLowerCase().includes(query) ||
          (tx.fullName || "").toLowerCase().includes(query) ||
          (tx.location || "").toLowerCase().includes(query) ||
          (tx.species || "").toLowerCase().includes(query);

        // 2. Severity Filter Logic (Mainly useful for 'managed' tab)
        const matchesSeverity =
          filterSeverity === "All" || tx.severity === filterSeverity;

        return matchesSearch && matchesSeverity;
      })
      .sort((a, b) => {
        // 3. Sorting Logic
        const dateA = new Date(a.timestamp).getTime();
        const dateB = new Date(b.timestamp).getTime();
        return sortConfig === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [
    activeTab,
    pendingTransactions,
    managedTransactions,
    searchQuery,
    filterSeverity,
    sortConfig,
  ]);

  // When switching tabs, reset the severity filter since 'pending' only has 'Ongoing'
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setFilterSeverity("All");
  };

  // --- ACTIONS ---
  const openModal = (type, tx) => {
    setModalType(type);
    setSelectedTx(tx);

    const existingDisease = tx.diagnosedDisease || "";
    const standardDiseases = [
      "African Swine Fever (ASF)",
      "Avian Influenza",
      "Foot and Mouth Disease (FMD)",
      "",
    ];
    const isStandard = standardDiseases.includes(existingDisease);

    setDiagnosisForm({
      severity: tx.severity === "Ongoing" ? "safe" : tx.severity,
      diseasePreset: isStandard ? existingDisease : "Other",
      customDisease: isStandard ? "" : existingDisease,
    });
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedTx(null);
  };

  const viewMedicalLog = async (tx) => {
    setSelectedAnimal(tx);
    setShowHealthModal(true);
    setHealthLoading(true);

    const lookupId = tx.batchId || tx._id;

    try {
      const res = await fetch(`${API_URL}/health-records/${lookupId}`);
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

  const handleDiagnosisSubmit = async () => {
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return alert("You are not logged in.");
    const currentUser = JSON.parse(storedUser);

    if (currentUser.mspId !== "VetMSP") return alert("Access Denied.");

    const finalDisease =
      diagnosisForm.severity === "safe"
        ? "None"
        : diagnosisForm.diseasePreset === "Other"
          ? diagnosisForm.customDisease
          : diagnosisForm.diseasePreset;

    if (diagnosisForm.severity !== "safe" && !finalDisease.trim()) {
      return alert("Please select or type a specific disease.");
    }

    // --- NEW: DYNAMIC STATUS BASED ON SEVERITY ---
    const finalStatus =
      diagnosisForm.severity === "dangerous"
        ? "Cull Ordered"
        : "Verified by Vet";

    setTxLoading(true);
    setTxMessage(diagnosisForm.severity === "dangerous" ? "Issuing cull order on blockchain..." : "Recording diagnosis on blockchain...");
    try {
      const res = await fetch(
        `${API_URL}/transactions/${selectedTx._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: finalStatus,
            diagnosedDisease: finalDisease,
            severity: diagnosisForm.severity,
            username: currentUser.username,
            mspId: currentUser.mspId,
          }),
        },
      );

      if (!res.ok) throw new Error("Failed to update status");

      const updatedTx = await res.json();

      setTransactions((prev) =>
        prev.map((tx) => (tx._id === updatedTx._id ? updatedTx : tx)),
      );

      if (activeTab === "pending") setActiveTab("managed");

      closeModal();
      alert(
        diagnosisForm.severity === "dangerous"
          ? "Cull Order Issued Successfully!"
          : "Animal status updated successfully!",
      );
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setTxLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleDateString();
  };

  return (
    <div className="p-6 md:p-10 bg-slate-50 min-h-screen w-full font-sans">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Veterinary Medical Ledger
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage active triage, diagnoses, and medical logs.
          </p>
        </div>

        {/* TAB SWITCHER */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex w-full md:w-auto">
          <button
            onClick={() => handleTabSwitch("pending")}
            className={`flex-1 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "pending" ? "bg-emerald-500 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
          >
            Pending Triage ({pendingTransactions.length})
          </button>
          <button
            onClick={() => handleTabSwitch("managed")}
            className={`flex-1 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === "managed" ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
          >
            Managed Inventory ({managedTransactions.length})
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col">
        {/* DATA TOOLBAR */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between gap-4 items-center">
          {/* SEARCH */}
          <div className="relative w-full lg:w-96">
            <span className="absolute left-4 top-2.5 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search Batch ID, Farmer, or Location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm shadow-sm transition-all"
            />
          </div>

          {/* FILTERS & SORT */}
          <div className="flex gap-3 w-full lg:w-auto">
            {activeTab === "managed" && (
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="flex-1 lg:w-48 bg-white border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm shadow-sm cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="safe">✅ Healthy Only</option>
                <option value="mild">⚠️ Mild Illness Only</option>
                <option value="dangerous">⛔ Dangerous Only</option>
              </select>
            )}

            <select
              value={sortConfig}
              onChange={(e) => setSortConfig(e.target.value)}
              className="flex-1 lg:w-48 bg-white border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm shadow-sm cursor-pointer"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-medium">Loading records...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-5 pl-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Batch ID & Date
                  </th>
                  <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Farmer / Location
                  </th>
                  <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Animal Details
                  </th>
                  <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                    Health Status
                  </th>
                  <th className="p-5 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {processedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-16 text-center">
                      <div className="text-4xl mb-3 opacity-30">📭</div>
                      <p className="text-slate-500 font-bold text-lg">
                        No matching records
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        Try adjusting your search or filter settings.
                      </p>
                    </td>
                  </tr>
                ) : (
                  processedTransactions.map((tx) => {
                    // --- NEW: CULL LOCK LOGIC ---
                    const isLocked = [
                      "Pending Transfer",
                      "Pending Regulator Verification",
                      "Pending Vet Review",
                      "Cull Ordered",
                      "Pending Cull Verification",
                    ].includes(tx.status);

                    return (
                      <tr
                        key={tx._id}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        <td className="p-5 pl-8">
                          <span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">
                            {tx.batchId || "LEGACY"}
                          </span>
                          <div className="text-xs text-slate-400 mt-2 font-medium">
                            {formatDate(tx.timestamp)}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="font-bold text-slate-700 group-hover:text-blue-600 transition-colors">
                            {tx.fullName}
                          </div>
                          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            📍 {tx.location}
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="font-black text-slate-800 text-base block mb-1">
                            {tx.quantity}x {tx.species}
                          </span>
                          <div
                            className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded w-fit border border-slate-100 line-clamp-1 max-w-[200px]"
                            title={tx.healthStatus}
                          >
                            "{tx.healthStatus}"
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          {tx.severity === "safe" && (
                            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                              ✅ Healthy
                            </span>
                          )}
                          {tx.severity === "mild" && (
                            <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                              ⚠️ {tx.diagnosedDisease}
                            </span>
                          )}
                          {tx.severity === "dangerous" && (
                            <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-[10px] font-black uppercase tracking-widest border border-red-100 animate-pulse">
                              ⛔ {tx.diagnosedDisease}
                            </span>
                          )}
                          {(!tx.severity || tx.severity === "Ongoing") && (
                            <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                              ⏳ Unverified
                            </span>
                          )}
                        </td>

                        <td className="p-5 text-center">
                          {isLocked ? (
                            <div className="relative group inline-block">
                              <button
                                disabled
                                className="cursor-not-allowed bg-slate-50 text-slate-400 px-4 py-2 rounded-lg text-xs font-bold border border-slate-200 flex items-center gap-2"
                              >
                                🔒 Locked
                              </button>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg text-center z-10">
                                {tx.status === "Cull Ordered"
                                  ? "Awaiting Farmer Disposal."
                                  : "Action disabled. Asset is locked in a workflow."}
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center gap-2">
                              {activeTab === "pending" ? (
                                <button
                                  onClick={() => openModal("diagnose", tx)}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-md shadow-emerald-200 transition-all active:scale-95"
                                >
                                  Verify & Triage
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => viewMedicalLog(tx)}
                                    className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                    title="Manage Medical Records"
                                  >
                                    + Record
                                  </button>
                                  <button
                                    onClick={() => openModal("update", tx)}
                                    className="bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                    title="Update Status"
                                  >
                                    Update
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- MODAL LOGIC --- */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-md" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
          <div className="bg-surface w-full max-w-lg max-h-[85vh] flex flex-col shadow-[0_2px_4px_rgba(28,43,58,0.08)] border border-outline-variant relative">
            {/* ── HEADER ── */}
            <div className="px-lg py-md border-b border-outline-variant bg-surface flex justify-between items-center">
              <div className="flex flex-col">
                <h1 className="font-display text-headline-md text-primary uppercase tracking-tight">
                  {modalType === "diagnose" && "Initial Verification"}
                  {modalType === "update" && "Update Health Status"}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-label-caps bg-surface-container-highest px-2 py-0.5 text-on-surface-variant uppercase">
                    SUBJECT ID
                  </span>
                  <span className="font-mono text-data-mono text-primary font-bold">
                    {selectedTx?.batchId || selectedTx?._id || "—"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-xs">
                <button
                  onClick={closeModal}
                  className="flex items-center justify-center w-10 h-10 hover:bg-error-container hover:text-error transition-colors text-outline"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* ── BODY ── */}
            <div className="p-lg bg-surface-container-lowest overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#bec8cb #f7f9ff' }}>
              {(modalType === "diagnose" || modalType === "update") && (
                <div className="space-y-md">
                  <div>
                    <label className="block font-mono text-label-caps text-outline uppercase mb-2">
                      Status Verdict
                    </label>
                    <select
                      value={diagnosisForm.severity}
                      onChange={(e) =>
                        setDiagnosisForm({
                          ...diagnosisForm,
                          severity: e.target.value,
                          diseasePreset: "",
                          customDisease: "",
                        })
                      }
                      className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body text-body-md p-3 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    >
                      <option value="safe">✅ Verified Healthy (Safe)</option>
                      <option value="mild">⚠️ Mild Illness (Quarantine)</option>
                      <option value="dangerous">⛔ Dangerous Disease (Cull/Isolate)</option>
                    </select>
                  </div>

                  {/* --- DYNAMIC DISEASE DROPDOWN --- */}
                  {diagnosisForm.severity !== "safe" && (
                    <div className="space-y-md bg-error-container/30 p-lg border border-error/20">
                      <div>
                        <label className="block font-mono text-label-caps text-error uppercase mb-2">
                          {diagnosisForm.severity === "mild" ? "Condition Category" : "Select Disease"}
                        </label>
                        <select
                          value={diagnosisForm.diseasePreset}
                          onChange={(e) =>
                            setDiagnosisForm({
                              ...diagnosisForm,
                              diseasePreset: e.target.value,
                            })
                          }
                          className="w-full bg-surface-container-lowest border border-error/30 text-error font-body text-body-md p-3 rounded outline-none focus:border-error focus:ring-1 focus:ring-error transition-colors"
                        >
                          <option value="" disabled>-- Select an Option --</option>
                          {diagnosisForm.severity === "mild" && (
                            <>
                              <option value="Respiratory Infection">Respiratory Infection</option>
                              <option value="Parasitic Infection">Parasitic Infection (Worms/Ticks)</option>
                              <option value="Digestive Issue / Scours">Digestive Issue / Scours</option>
                              <option value="Skin Condition / Mange">Skin Condition / Mange</option>
                              <option value="Physical Injury / Lameness">Physical Injury / Lameness</option>
                            </>
                          )}
                          {diagnosisForm.severity === "dangerous" && (
                            <>
                              <option value="African Swine Fever (ASF)">African Swine Fever (ASF)</option>
                              <option value="Avian Influenza">Avian Influenza (Bird Flu)</option>
                              <option value="Foot and Mouth Disease (FMD)">Foot and Mouth Disease (FMD)</option>
                            </>
                          )}
                          <option value="Other">Other (Specify)</option>
                        </select>
                      </div>

                      {diagnosisForm.diseasePreset === "Other" && (
                        <div>
                          <label className="block font-mono text-label-caps text-error uppercase mb-2">
                            Specify Condition
                          </label>
                          <input
                            type="text"
                            placeholder="Type specific diagnosis..."
                            value={diagnosisForm.customDisease}
                            onChange={(e) =>
                              setDiagnosisForm({
                                ...diagnosisForm,
                                customDisease: e.target.value,
                              })
                            }
                            className="w-full bg-surface-container-lowest border border-error/30 text-error font-body text-body-md p-3 rounded outline-none focus:border-error focus:ring-1 focus:ring-error transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- NEW: DYNAMIC WARNING BANNER --- */}
                  {diagnosisForm.severity === "dangerous" && (
                    <div className="bg-error-container text-on-error-container p-md border border-error/30 mt-md">
                      <h4 className="font-mono text-label-caps text-error uppercase mb-1 flex items-center gap-2 font-bold">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        Legal Warning
                      </h4>
                      <p className="font-body text-body-sm">
                        Issuing this order will legally lock the batch. The farmer will be required to dispose of the assets on-site and provide proof to the Regulator.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── FOOTER ── */}
            <div className="px-lg py-md border-t border-outline-variant bg-surface flex justify-end gap-md">
              <button
                onClick={closeModal}
                className="px-lg py-xs border border-outline-variant font-mono text-label-caps text-on-surface hover:bg-surface-container-low transition-colors uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleDiagnosisSubmit}
                className={`px-lg py-xs font-mono text-label-caps hover:brightness-110 transition-all flex items-center gap-2 uppercase ${
                  diagnosisForm.severity === "dangerous"
                    ? "bg-error text-white animate-pulse"
                    : "bg-primary text-on-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">fact_check</span>
                {diagnosisForm.severity === "dangerous"
                  ? "Issue Mandatory Cull Order"
                  : modalType === "diagnose"
                    ? "Submit Verification"
                    : "Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === MEDICAL LOG MODAL === */}
      <MedicalLogModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        healthLoading={healthLoading}
        healthLogs={healthLogs}
        selectedAnimal={selectedAnimal}
      />

      <TransactionLoadingOverlay isOpen={txLoading} message={txMessage} />
    </div>
  );
}
