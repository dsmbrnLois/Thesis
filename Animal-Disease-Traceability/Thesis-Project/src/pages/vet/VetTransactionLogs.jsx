import { useState, useEffect, useMemo } from "react";
import API_URL from "../../config/api";
import TransactionLoadingOverlay from "../../components/common/TransactionLoadingOverlay";

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
  const [modalType, setModalType] = useState(null); // 'diagnose', 'update', 'healthLog'
  const [selectedTx, setSelectedTx] = useState(null);

  // FORM STATES
  const [diagnosisForm, setDiagnosisForm] = useState({
    severity: "safe",
    diseasePreset: "",
    customDisease: "",
  });
  const [healthLogForm, setHealthLogForm] = useState({
    type: "Vaccination",
    name: "",
    notes: "",
    nextDueDate: "",
    proofFile: null,
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

    setHealthLogForm({
      type: "Vaccination",
      name: "",
      notes: "",
      nextDueDate: "",
      proofFile: null,
    });
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedTx(null);
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

  const handleHealthLogSubmit = async () => {
    const storedUser = localStorage.getItem("user");
    const currentUser = JSON.parse(storedUser);

    setTxLoading(true);
    setTxMessage("Saving medical record...");
    try {
      const formData = new FormData();
      formData.append("batchId", selectedTx.batchId || selectedTx._id);
      formData.append("type", healthLogForm.type);
      formData.append("name", healthLogForm.name);
      formData.append("notes", healthLogForm.notes);
      formData.append("nextDueDate", healthLogForm.nextDueDate);
      formData.append("vetUsername", currentUser.username);
      formData.append("mspId", currentUser.mspId);
      formData.append("status", "Valid");

      if (healthLogForm.proofFile) {
        formData.append("proofFile", healthLogForm.proofFile);
      }

      const res = await fetch(`${API_URL}/health-records`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to save health record");

      closeModal();
      alert("Medical record added to digital log!");
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
                                    onClick={() => openModal("healthLog", tx)}
                                    className="bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 px-3 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                                    title="Add Medical Record"
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            {/* HEADER */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-xl text-slate-800">
                {modalType === "diagnose" && "Initial Verification"}
                {modalType === "update" && "Update Health Status"}
                {modalType === "healthLog" && "Add Medical Record"}
              </h3>
              <button
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="p-6 bg-white overflow-y-auto max-h-[80vh]">
              {/* 1. DIAGNOSIS / UPDATE FORM */}
              {(modalType === "diagnose" || modalType === "update") && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
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
                      className="w-full border-2 border-slate-100 rounded-xl p-3.5 focus:border-emerald-500 outline-none font-bold text-slate-700 transition-colors"
                    >
                      <option value="safe">✅ Verified Healthy (Safe)</option>
                      <option value="mild">⚠️ Mild Illness (Quarantine)</option>
                      <option value="dangerous">
                        ⛔ Dangerous Disease (Cull/Isolate)
                      </option>
                    </select>
                  </div>

                  {/* --- DYNAMIC DISEASE DROPDOWN --- */}
                  {diagnosisForm.severity !== "safe" && (
                    <div className="space-y-4 bg-red-50/50 p-5 rounded-2xl border border-red-100">
                      <div>
                        <label className="block text-xs font-bold text-red-500 uppercase tracking-widest mb-2">
                          {diagnosisForm.severity === "mild"
                            ? "Condition Category"
                            : "Select Disease"}
                        </label>
                        <select
                          value={diagnosisForm.diseasePreset}
                          onChange={(e) =>
                            setDiagnosisForm({
                              ...diagnosisForm,
                              diseasePreset: e.target.value,
                            })
                          }
                          className="w-full border-2 border-red-200 rounded-xl p-3.5 text-red-700 bg-white focus:border-red-500 outline-none font-bold transition-colors"
                        >
                          <option value="" disabled>
                            -- Select an Option --
                          </option>
                          {diagnosisForm.severity === "mild" && (
                            <>
                              <option value="Respiratory Infection">
                                Respiratory Infection
                              </option>
                              <option value="Parasitic Infection">
                                Parasitic Infection (Worms/Ticks)
                              </option>
                              <option value="Digestive Issue / Scours">
                                Digestive Issue / Scours
                              </option>
                              <option value="Skin Condition / Mange">
                                Skin Condition / Mange
                              </option>
                              <option value="Physical Injury / Lameness">
                                Physical Injury / Lameness
                              </option>
                            </>
                          )}
                          {diagnosisForm.severity === "dangerous" && (
                            <>
                              <option value="African Swine Fever (ASF)">
                                African Swine Fever (ASF)
                              </option>
                              <option value="Avian Influenza">
                                Avian Influenza (Bird Flu)
                              </option>
                              <option value="Foot and Mouth Disease (FMD)">
                                Foot and Mouth Disease (FMD)
                              </option>
                            </>
                          )}
                          <option value="Other">Other (Specify)</option>
                        </select>
                      </div>

                      {diagnosisForm.diseasePreset === "Other" && (
                        <div>
                          <label className="block text-xs font-bold text-red-500 uppercase tracking-widest mb-2">
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
                            className="w-full border-2 border-red-200 bg-white rounded-xl p-3.5 text-red-700 placeholder-red-300 focus:border-red-500 outline-none font-bold transition-colors"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* --- NEW: DYNAMIC WARNING BANNER --- */}
                  {diagnosisForm.severity === "dangerous" && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl mt-4 shadow-sm">
                      <h4 className="text-red-700 font-black text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
                        ⚠️ Legal Warning
                      </h4>
                      <p className="text-red-600 text-xs font-medium leading-relaxed">
                        Issuing this order will legally lock the batch. The
                        farmer will be required to dispose of the assets on-site
                        and provide proof to the Regulator.
                      </p>
                    </div>
                  )}

                  {/* --- NEW: DYNAMIC SUBMIT BUTTON --- */}
                  <button
                    onClick={handleDiagnosisSubmit}
                    className={`w-full text-white font-black uppercase tracking-widest py-4 rounded-xl mt-4 shadow-lg transition-all active:scale-[0.98] ${
                      diagnosisForm.severity === "dangerous"
                        ? "bg-red-600 hover:bg-red-700 shadow-red-200 animate-pulse"
                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
                    }`}
                  >
                    {diagnosisForm.severity === "dangerous"
                      ? "Issue Mandatory Cull Order"
                      : modalType === "diagnose"
                        ? "Submit Verification"
                        : "Update Status"}
                  </button>
                </div>
              )}

              {/* 2. HEALTH LOG FORM */}
              {modalType === "healthLog" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Record Type
                      </label>
                      <select
                        value={healthLogForm.type}
                        onChange={(e) =>
                          setHealthLogForm({
                            ...healthLogForm,
                            type: e.target.value,
                          })
                        }
                        className="w-full border-2 border-slate-100 rounded-xl p-3.5 outline-none focus:border-blue-500 font-bold text-slate-700 transition-colors"
                      >
                        <option>Vaccination</option>
                        <option>Deworming</option>
                        <option>Lab Test</option>
                        <option>Vitamin</option>
                        <option>VHC Issuance</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Next Due (Opt)
                      </label>
                      <input
                        type="date"
                        value={healthLogForm.nextDueDate}
                        onChange={(e) =>
                          setHealthLogForm({
                            ...healthLogForm,
                            nextDueDate: e.target.value,
                          })
                        }
                        className="w-full border-2 border-slate-100 rounded-xl p-3.5 outline-none focus:border-blue-500 font-bold text-slate-700 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Name / Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hog Cholera Vaccine (Batch 99)"
                      value={healthLogForm.name}
                      onChange={(e) =>
                        setHealthLogForm({
                          ...healthLogForm,
                          name: e.target.value,
                        })
                      }
                      className="w-full border-2 border-slate-100 rounded-xl p-3.5 outline-none focus:border-blue-500 text-slate-700 font-bold transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Notes
                    </label>
                    <textarea
                      placeholder="Any observation during administration..."
                      value={healthLogForm.notes}
                      onChange={(e) =>
                        setHealthLogForm({
                          ...healthLogForm,
                          notes: e.target.value,
                        })
                      }
                      className="w-full border-2 border-slate-100 rounded-xl p-3.5 h-24 resize-none outline-none focus:border-blue-500 text-slate-700 transition-colors"
                    />
                  </div>

                  <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                    <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-3 text-center">
                      Upload Proof (Optional)
                    </label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-blue-200 border-dashed rounded-xl cursor-pointer bg-white hover:bg-blue-50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg
                            className="w-6 h-6 mb-2 text-blue-400"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 20 16"
                          >
                            <path
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                            />
                          </svg>
                          <p className="mb-1 text-xs text-slate-500">
                            <span className="font-bold text-blue-600">
                              Click to upload
                            </span>{" "}
                            or drag and drop
                          </p>
                          <p className="text-[10px] text-slate-400 font-medium mt-1">
                            PDF, PNG, or JPG (MAX. 5MB)
                          </p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf"
                          onChange={(e) =>
                            setHealthLogForm({
                              ...healthLogForm,
                              proofFile: e.target.files[0],
                            })
                          }
                        />
                      </label>
                    </div>
                    {healthLogForm.proofFile && (
                      <p className="text-xs text-emerald-600 font-bold mt-3 text-center flex items-center justify-center gap-1 bg-emerald-50 py-2 rounded-lg border border-emerald-100">
                        ✅ {healthLogForm.proofFile.name}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleHealthLogSubmit}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl mt-4 shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                  >
                    Save to Digital Log
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <TransactionLoadingOverlay isOpen={txLoading} message={txMessage} />
    </div>
  );
}
