import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AuditTrailModal from "../../components/common/AuditTrailModal";
import MedicalLogModal from "../../components/common/MedicalLogModal";

export default function PublicLedger() {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [mspId, setMspId] = useState("");

  // Blockchain History States
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Health Log States
  const [healthLogs, setHealthLogs] = useState([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [selectedAnimalForHealth, setSelectedAnimalForHealth] = useState(null);
  const [healthLogCounts, setHealthLogCounts] = useState({});

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // --- RISK ASSESSMENT MODAL STATES ---
  const [farmRisk, setFarmRisk] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    contactNumber: "",
    species: "",
    quantity: "",
    healthStatus: "",
    location: "",
  });

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const loggedInUser = localStorage.getItem("username");
        const userMsp = localStorage.getItem("mspId");
        if (!loggedInUser) return;

        setUsername(loggedInUser);
        setMspId(userMsp);

        const res = await fetch(
          `http://localhost:3001/api/transactions/${loggedInUser}`,
        );
        const data = await res.json();
        setTransactions(data || []);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    const storedName = localStorage.getItem("fullName") || "";
    const storedContact = localStorage.getItem("contactNumber") || "";
    let storedLocation = localStorage.getItem("barangay") || "";
    if (storedLocation && !storedLocation.toLowerCase().includes("brgy")) {
      storedLocation = `Brgy ${storedLocation}`;
    }
    setFormData((prev) => ({
      ...prev,
      fullName: storedName,
      contactNumber: storedContact,
      location: storedLocation,
    }));

    fetchTransactions();
  }, []);

  // --- ML RISK CALCULATION LOGIC ---
  const handleCalculateRisk = async () => {
    setIsCalculating(true);
    try {
      const totalPop = transactions.reduce(
        (acc, tx) => acc + Number(tx.quantity || 0),
        0,
      );
      let safeCount = 0;
      let mildCount = 0;
      let dangerousCount = 0;

      transactions.forEach((tx) => {
        if (tx.severity === "safe") safeCount++;
        else if (tx.severity === "mild") mildCount++;
        else if (tx.severity === "dangerous") dangerousCount++;
      });

      const totalDiagnosed = safeCount + mildCount + dangerousCount;

      if (totalDiagnosed === 0) {
        alert(
          "No verified blockchain health records found to perform assessment.",
        );
        return;
      }

      // 1. Fetch missing health log counts
      const lookupIds = transactions
        .map((tx) => tx.batchId || tx._id)
        .filter(Boolean);
      const missingIds = lookupIds.filter(
        (id) => healthLogCounts[id] === undefined,
      );
      let fetchedCounts = {};

      if (missingIds.length > 0) {
        const fetchedEntries = await Promise.all(
          missingIds.map(async (id) => {
            try {
              const res = await fetch(
                `http://localhost:3001/api/health-records/${id}`,
              );
              const data = await res.json();
              return [id, Array.isArray(data) ? data.length : 0];
            } catch {
              return [id, 0];
            }
          }),
        );
        fetchedCounts = Object.fromEntries(fetchedEntries);
        setHealthLogCounts((prev) => ({ ...prev, ...fetchedCounts }));
      }

      const mergedCounts = { ...healthLogCounts, ...fetchedCounts };
      const totalMedicalLogs = lookupIds.reduce(
        (sum, id) => sum + Number(mergedCounts[id] || 0),
        0,
      );

      // 2. SEND TO PYTHON ML ENGINE
      const response = await fetch("http://localhost:3001/api/calculate-risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safeCount,
          mildCount,
          dangerousCount,
          totalPop,
          totalMedicalLogs,
        }),
      });

      const riskData = await response.json();

      if (riskData.error) {
        alert("Risk Engine Error: " + riskData.error);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 800)); // UI delay

      // 3. Update UI with backend results
      setFarmRisk({
        score: riskData.score,
        level: riskData.level,
        color: riskData.color,
        description: riskData.description,
        advice: riskData.advice,
        totalPop,
        safeCount,
        mildCount,
        dangerousCount,
        totalMedicalLogs,
      });
      setShowRiskModal(true);
    } catch (err) {
      console.error("Risk Assessment Error:", err);
      alert("Failed to reach Machine Learning engine.");
    } finally {
      setIsCalculating(false);
    }
  };

  const viewBlockchainHistory = async (lookupId) => {
    setHistoryLoading(true);
    setShowHistoryModal(true);
    try {
      const res = await fetch(
        `http://localhost:3001/api/transactions/history/${lookupId}?username=${username}&mspId=${mspId}`,
      );
      const data = await res.json();
      setHistory(data || []);
    } catch (err) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const viewHealthRecords = async (tx) => {
    const lookupId = tx.batchId || tx._id;
    setSelectedAnimalForHealth(tx);
    setHealthLoading(true);
    setShowHealthModal(true);
    try {
      const res = await fetch(
        `http://localhost:3001/api/health-records/${lookupId}`,
      );
      const data = await res.json();
      setHealthLogs(data || []);
      setHealthLogCounts((prev) => ({
        ...prev,
        [lookupId]: Array.isArray(data) ? data.length : 0,
      }));
    } catch {
      setHealthLogs([]);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username) return alert("No user logged in");

    const newTx = {
      ...formData,
      status: "Submitted to Vet",
      severity: "Ongoing",
      username: username,
      mspId: localStorage.getItem("mspId"),
      quantity: Number(formData.quantity),
      timestamp: new Date().toISOString(),
      blockchainTxId: null,
    };

    try {
      const response = await fetch("http://localhost:3001/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTx),
      });
      const savedTx = await response.json();
      setTransactions((prev) => [savedTx, ...prev]);
      alert("Record added successfully!");
      setFormData((prev) => ({
        ...prev,
        species: "",
        quantity: "",
        healthStatus: "",
      }));
    } catch (err) {
      alert("Error: " + err.message);
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const query = searchQuery.toLowerCase();
    return (
      (tx.batchId || "").toLowerCase().includes(query) ||
      (tx.species || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen py-6 px-3 sm:px-6 lg:px-10 bg-transparent">
      <header className="max-w-7xl mx-auto mb-8 text-left">
        <h1 className="text-3xl sm:text-4xl font-black text-emerald-900 tracking-tighter">
          Animal Health Ledger
        </h1>
        <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest mt-1 opacity-80">
          Secure Traceability Protocol
        </p>
      </header>

      {/* Grid container: Fixed height on large screens (lg), Auto height on mobile (default) */}
      <div className="max-w-[1600px] mx-auto grid gap-6 lg:grid-cols-12 items-start lg:h-[calc(100vh-180px)]">
        {/* LEFT: FORM SECTION */}
        <section className="lg:col-span-4 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/40 p-6 sm:p-8 lg:overflow-y-auto lg:max-h-full custom-scrollbar">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-600 text-white p-2 rounded-xl text-xl">
              📝
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              Register Animal
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                Farmer Name
              </label>
              <input
                name="fullName"
                value={formData.fullName}
                readOnly
                className="w-full px-5 py-4 bg-slate-100/50 border-none rounded-2xl text-slate-500 font-bold outline-none text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                Contact Number
              </label>
              <input
                name="contactNumber"
                value={formData.contactNumber}
                readOnly
                className="w-full px-5 py-4 bg-slate-100/50 border-none rounded-2xl text-slate-500 font-bold outline-none text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 ml-2">
                  Animal Type
                </label>
                <select
                  name="species"
                  value={formData.species}
                  onChange={handleChange}
                  required
                  className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold text-slate-700 focus:border-emerald-500 transition-all text-sm outline-none"
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {["Hog", "Cow", "Chicken", "Carabao", "Duck", "Goat"].map(
                    (opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 ml-2">
                  How many?
                </label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleChange}
                  placeholder="0"
                  required
                  className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 transition-all text-sm outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-700 ml-2">
                How do they look?
              </label>
              <textarea
                name="healthStatus"
                value={formData.healthStatus}
                onChange={handleChange}
                placeholder="Ex: All are eating well..."
                rows={3}
                required
                className="w-full px-5 py-4 bg-white border-2 border-slate-100 rounded-2xl font-bold focus:border-emerald-500 transition-all text-sm resize-none outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
                Location
              </label>
              <input
                name="location"
                value={formData.location}
                readOnly
                className="w-full px-5 py-4 bg-slate-100/50 border-none rounded-2xl text-slate-500 font-bold text-sm"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-2xl shadow-xl shadow-emerald-200 transition-all active:scale-[0.95] text-base uppercase tracking-widest mt-2"
            >
              Send to Vet!
            </button>
          </form>
        </section>

        {/* RIGHT: DASHBOARD - Fixed only on Large Screens */}
        <section className="lg:col-span-8 flex flex-col lg:h-full bg-white/60 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white/40 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-white/40 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/30">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-xl text-xl">
                📜
              </div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                Record History
              </h2>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button
                onClick={handleCalculateRisk}
                disabled={isCalculating}
                className="flex-1 md:flex-none whitespace-nowrap bg-indigo-600 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg disabled:opacity-50 transition-all"
              >
                {isCalculating ? "Analyzing..." : "Analyze Risk"}
              </button>
              <div className="relative flex-1 md:w-48">
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-5 pr-5 py-4 bg-white/80 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* This div only scrolls on Desktop (lg:overflow-y-auto) */}
          <div className="flex-1 lg:overflow-y-auto p-6 sm:p-8 custom-scrollbar">
            <table className="w-full border-separate border-spacing-y-3">
              <thead className="hidden sm:table-header-group">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="pb-2 px-4 text-left">Tools</th>
                  <th className="pb-2 px-4 text-left">Animal</th>
                  <th className="pb-2 px-4 text-center">Qty</th>
                  <th className="pb-2 px-4 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx) => (
                  <tr key={tx._id} className="group">
                    <td className="py-3 px-4 bg-white rounded-l-3xl shadow-sm group-hover:shadow-md transition-all">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            viewBlockchainHistory(tx.batchId || tx._id)
                          }
                          className="bg-emerald-50 text-emerald-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all"
                        >
                          Trail
                        </button>
                        <button
                          onClick={() => viewHealthRecords(tx)}
                          className="bg-blue-50 text-blue-600 px-3 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all"
                        >
                          Log
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 bg-white shadow-sm group-hover:shadow-md transition-all">
                      <div className="font-black text-slate-800 flex items-center gap-2 text-base">
                        {tx.species}
                        <span>
                          {tx.severity === "dangerous"
                            ? "⛔"
                            : tx.severity === "mild"
                              ? "⚠️"
                              : tx.severity === "safe"
                                ? "✅"
                                : "⏳"}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">
                        {tx.batchId || "Legacy ID"}
                      </div>
                    </td>
                    <td className="py-3 px-4 bg-white shadow-sm text-center group-hover:shadow-md transition-all font-black text-slate-700">
                      {tx.quantity}
                    </td>
                    <td className="py-3 px-4 bg-white rounded-r-3xl shadow-sm text-right group-hover:shadow-md transition-all">
                      <div className="text-xs font-bold text-slate-500">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* --- RISK ANALYSIS MODAL --- */}
      {showRiskModal && farmRisk && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
          <div className="bg-slate-900 w-full max-w-2xl rounded-[3rem] p-8 shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-2">
                    Farm Health Security Index
                  </h3>
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`text-7xl font-black tracking-tighter ${farmRisk.color}`}
                    >
                      {farmRisk.score}%
                    </span>
                    <span className="text-xl font-bold text-slate-400 italic tracking-tight">
                      {farmRisk.level}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowRiskModal(false)}
                  className="bg-white/5 hover:bg-white/10 text-white w-12 h-12 flex items-center justify-center rounded-2xl transition-all font-bold text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Total Population
                  </p>
                  <p className="text-3xl font-black text-white">
                    {farmRisk.totalPop}
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem]">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Medical Logs
                  </p>
                  <p className="text-3xl font-black text-white">
                    {farmRisk.totalMedicalLogs}
                  </p>
                </div>
              </div>

              {/* FARMER FRIENDLY DESCRIPTIVE TEXT */}
              <div className="space-y-4 mb-8">
                <div className="bg-white/5 border-l-4 border-emerald-500 p-4 rounded-r-2xl">
                  <h4 className="text-white font-black text-sm uppercase mb-1">
                    Current Status
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {farmRisk.description}
                  </p>
                </div>
                <div
                  className={`bg-white/5 border-l-4 ${farmRisk.score >= 35 ? "border-amber-500" : "border-blue-500"} p-4 rounded-r-2xl`}
                >
                  <h4 className="text-white font-black text-sm uppercase mb-1">
                    Recommended Action
                  </h4>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {farmRisk.advice}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-10">
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-2xl text-sm font-black">
                  ✅ {farmRisk.safeCount} Safe
                </div>
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl text-sm font-black">
                  ⛔ {farmRisk.dangerousCount} Alert
                </div>
              </div>

              <button
                onClick={() => setShowRiskModal(false)}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-black py-5 rounded-2xl uppercase tracking-widest transition-all"
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <MedicalLogModal
        isOpen={showHealthModal}
        onClose={() => setShowHealthModal(false)}
        healthLoading={healthLoading}
        healthLogs={healthLogs}
        selectedAnimal={selectedAnimalForHealth}
      />
      <AuditTrailModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        historyLoading={historyLoading}
        history={history}
        selectedAnimal={
          transactions.find(
            (t) => (t.batchId || t._id) === history[0]?.data?.batchId,
          ) || {}
        }
      />
    </div>
  );
}
