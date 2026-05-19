import { useState, useEffect, useRef } from "react";
import API_URL from "../../config/api";
import TransactionLoadingOverlay from "../../components/common/TransactionLoadingOverlay";

export default function Logistics() {
  const [animals, setAnimals] = useState([]);
  const [activeTab, setActiveTab] = useState("apply");
  const [outgoing, setOutgoing] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txMessage, setTxMessage] = useState("");

  // FILE UPLOAD STATE (For Senders - Exit Proofs & PODs)
  const fileInputRef = useRef(null);
  const [uploadingId, setUploadingId] = useState(null);

  // Form State
  const [selectedBatch, setSelectedBatch] = useState("");
  const [formData, setFormData] = useState({
    destinationType: "Internal",
    receiverUsername: "",
    receiverName: "",
    receiverAddress: "",
    purpose: "Sales",
    transportDate: "",
    transferQuantity: "",
  });

  // --- NEW: CULL WORKFLOW STATE ---
  const [cullOrders, setCullOrders] = useState([]);
  const [cullModal, setCullModal] = useState({
    isOpen: false,
    animal: null,
    disposalDate: "",
    disposalMethod: "Deep Burial",
    proofFile: null,
    transferQuantity: "",
  });

  const currentUser = localStorage.getItem("username");

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  useEffect(() => {
    fetchInventory();
    fetchMovements();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch(
        `${API_URL}/transactions/${currentUser}`,
      );
      const data = await res.json();
      setAnimals(data || []);

      // --- FILTER CULL ORDERS ---
      const pendingCulls = (data || []).filter(
        (a) => a.status === "Cull Ordered",
      );
      setCullOrders(pendingCulls);
    } catch (err) {
      console.error("Inventory Error");
    }
  };

  const fetchMovements = async () => {
    try {
      const res = await fetch(
        `${API_URL}/transfers/${currentUser}`,
      );
      const data = await res.json();
      const out = data.filter((r) => r.farmerUsername === currentUser);
      const inc = data.filter((r) => r.receiverUsername === currentUser);
      setOutgoing(out);
      setIncoming(inc);
    } catch (err) {
      console.error("History Error");
    }
  };

  // --- SENDER UPLOADING PROOF (Internal POD or External Exit) ---
  const triggerFileUpload = (requestId) => {
    setUploadingId(requestId);
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !uploadingId) return;

    const fd = new FormData();
    fd.append("requestId", uploadingId);
    fd.append("proofFile", file);

    try {
      const res = await fetch(
        `${API_URL}/transfers/upload-proof`,
        {
          method: "POST",
          body: fd,
        },
      );
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Upload failed");
      }
      alert(resData.message);
      fetchMovements();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setUploadingId(null);
      e.target.value = null;
    }
  };

  // --- RECEIVER CONFIRMING RECEIPT ---
  const handleReceive = async (requestId) => {
    if (
      !confirm(
        "Confirm receipt? This will transfer ownership to you on the Blockchain.",
      )
    )
      return;

    setTxLoading(true);
    setTxMessage("Confirming receipt on blockchain...");
    try {
      const res = await fetch(
        `${API_URL}/transfers/receiver-confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId, userMsp: "FarmerMSP" }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to receive");
      }

      alert("Transfer Successful! Animal is now in your inventory.");
      fetchMovements();
      fetchInventory();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setTxLoading(false);
    }
  };

  // Helper to get max quantity of selected batch
  const selectedAnimalData = animals.find((a) => a.batchId === selectedBatch);
  const maxQty = selectedAnimalData ? selectedAnimalData.quantity : 0;

  // --- SENDER SUBMITTING NEW REQUEST ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return alert("Please select an animal batch");

    const payload = {
      batchId: selectedBatch,
      farmerUsername: currentUser,
      destinationType: formData.destinationType,
      receiverUsername:
        formData.destinationType === "Internal"
          ? formData.receiverUsername
          : null,
      receiverDetails:
        formData.destinationType !== "Internal"
          ? { name: formData.receiverName, address: formData.receiverAddress }
          : null,
      purpose: formData.purpose,
      transportDate: formData.transportDate,
      transferQuantity: parseInt(formData.transferQuantity),
    };

    setTxLoading(true);
    setTxMessage("Submitting transport request...");
    try {
      const res = await fetch(`${API_URL}/transfers/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to submit");
      }
      alert("Transport Request Submitted!");
      setActiveTab("outgoing");
      fetchMovements();
    } catch (err) {
      alert("Submission Error: " + err.message);
    } finally {
      setTxLoading(false);
    }
  };

  // --- NEW: SUBMITTING CULL DISPOSAL ---
  const handleCullSubmit = async (e) => {
    e.preventDefault();
    if (!cullModal.proofFile)
      return alert("You must attach a proof of disposal document or photo.");
    if (
      !cullModal.transferQuantity ||
      cullModal.transferQuantity > cullModal.animal.quantity
    ) {
      return alert("Invalid quantity.");
    }

    const fd = new FormData();
    fd.append("batchId", cullModal.animal.batchId);
    fd.append("farmerUsername", currentUser);
    fd.append("transferQuantity", cullModal.transferQuantity);
    fd.append("disposalDate", cullModal.disposalDate);
    fd.append("disposalMethod", cullModal.disposalMethod);
    fd.append("proofFile", cullModal.proofFile);

    setTxLoading(true);
    setTxMessage("Recording disposal on blockchain...");
    try {
      const res = await fetch(
        `${API_URL}/transfers/submit-cull`,
        {
          method: "POST",
          body: fd,
        },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit cull");

      alert("Cull Disposal Submitted! Awaiting Regulator Verification.");
      setCullModal({ ...cullModal, isOpen: false, proofFile: null });
      fetchInventory();
      fetchMovements();
      setActiveTab("outgoing");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setTxLoading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    let color = "bg-slate-100 text-slate-600 border-slate-200";
    if (status === "Pending Vet Review")
      color = "bg-amber-100 text-amber-700 border-amber-200";
    if (status === "Approved (VHC Issued)")
      color = "bg-blue-100 text-blue-700 border-blue-200 animate-pulse";
    if (status.includes("Completed"))
      color = "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "Rejected") color = "bg-red-100 text-red-700 border-red-200";
    if (
      status === "Pending Regulator Verification" ||
      status === "Pending Cull Verification"
    )
      color = "bg-purple-100 text-purple-700 border-purple-200";

    return (
      <span
        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="p-8 lg:p-12 max-w-6xl mx-auto flex flex-col items-center">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tight">
          Logistics & <span className="text-[var(--green)]">Movement</span>
        </h1>
        <p className="text-slate-500 font-medium mt-2">
          Manage asset transfers, Health Certificates, and receipts.
        </p>
      </header>

      {/* --- NEW: CRITICAL CULL WARNING BANNER --- */}
      {cullOrders.length > 0 && (
        <div className="w-full max-w-4xl mb-8 space-y-4">
          {cullOrders.map((animal) => (
            <div
              key={animal.batchId}
              className="bg-red-600 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between shadow-lg shadow-red-200 border border-red-700"
            >
              <div className="flex items-center gap-4 text-white">
                <div className="text-4xl animate-pulse">⚠️</div>
                <div>
                  <h3 className="font-black uppercase tracking-widest text-lg">
                    Mandatory Cull Order
                  </h3>
                  <p className="text-red-100 font-medium text-sm mt-1">
                    Batch{" "}
                    <span className="font-bold bg-red-700 px-2 py-0.5 rounded">
                      {animal.batchId}
                    </span>{" "}
                    ({animal.quantity} heads) has been diagnosed with{" "}
                    {animal.diagnosedDisease}. It must be disposed of
                    immediately.
                  </p>
                </div>
              </div>
              <button
                onClick={() =>
                  setCullModal({
                    isOpen: true,
                    animal: animal,
                    disposalDate: new Date().toISOString().split("T")[0],
                    disposalMethod: "Deep Burial",
                    proofFile: null,
                    transferQuantity: animal.quantity, // Default to full batch
                  })
                }
                className="mt-4 md:mt-0 bg-white text-red-700 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-red-50 transition shadow-md whitespace-nowrap"
              >
                Upload Proof of Disposal
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden File Input for Senders */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf"
      />

      {/* TABS MENU */}
      <div className="flex gap-2 mb-12 bg-white p-2 rounded-2xl w-fit border border-slate-200 shadow-md">
        <button
          onClick={() => setActiveTab("apply")}
          className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === "apply"
              ? "bg-[var(--green)] text-white shadow-lg scale-105"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          📤 New Request
        </button>
        <button
          onClick={() => setActiveTab("outgoing")}
          className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === "outgoing"
              ? "bg-[var(--green)] text-white shadow-lg scale-105"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          🛫 Outgoing ({outgoing.length})
        </button>
        <button
          onClick={() => setActiveTab("incoming")}
          className={`px-8 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === "incoming"
              ? "bg-[var(--green)] text-white shadow-lg scale-105"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          🛬 Incoming (
          {incoming.filter((i) => i.status === "Approved (VHC Issued)").length})
        </button>
      </div>

      {/* APPLY TAB */}
      {activeTab === "apply" && (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-2xl transform transition-all">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-green-50/50 p-6 rounded-3xl border border-green-100">
              <label className="block text-xs font-black text-[var(--green)] uppercase tracking-widest mb-3">
                Select Asset from Inventory
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full p-4 border-2 border-slate-100 rounded-2xl bg-white text-slate-700 font-bold outline-none focus:border-[var(--green)] transition-all"
              >
                <option value="">-- Choose Animal --</option>
                {animals.map((a) => (
                  <option
                    key={a.batchId}
                    value={a.batchId}
                    disabled={
                      a.severity !== "safe" ||
                      a.status.includes("Pending") ||
                      a.status === "Cull Ordered"
                    }
                  >
                    [{a.batchId}] {a.species} ({a.quantity}) -{" "}
                    {a.status === "Pending Transfer"
                      ? "🔒 Pending Transfer"
                      : a.status === "Cull Ordered" ||
                          a.status === "Pending Cull Verification"
                        ? "🔥 Cull Lock"
                        : a.severity === "safe"
                          ? "✅ Ready"
                          : a.severity === "Ongoing"
                            ? "⏳ Unverified"
                            : "⛔ Sick"}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Transfer Qty (Max: {maxQty})
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={maxQty}
                  disabled={!selectedBatch}
                  value={formData.transferQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transferQuantity: e.target.value,
                    })
                  }
                  placeholder={`1 - ${maxQty}`}
                  className="w-full p-4 border-2 border-slate-50 rounded-xl outline-none focus:border-[var(--green)] font-bold text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Destination Type
                </label>
                <select
                  value={formData.destinationType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      destinationType: e.target.value,
                    })
                  }
                  className="w-full p-4 border-2 border-slate-50 rounded-xl outline-none focus:border-[var(--green)] font-medium"
                >
                  <option value="Internal">Local Farmer</option>
                  <option value="Slaughter">Slaughterhouse</option>
                  <option value="External">Export / Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Transport Date
                </label>
                <input
                  type="date"
                  required
                  min={getMinDate()}
                  value={formData.transportDate}
                  onChange={(e) =>
                    setFormData({ ...formData, transportDate: e.target.value })
                  }
                  className="w-full p-4 border-2 border-slate-50 rounded-xl outline-none focus:border-[var(--green)] font-medium"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                Receiver Details
              </h3>
              {formData.destinationType === "Internal" ? (
                <input
                  type="text"
                  placeholder="Enter Buyer Username/Email"
                  className="w-full p-4 border-2 border-white rounded-xl outline-none focus:border-[var(--green)] shadow-sm font-bold"
                  value={formData.receiverUsername}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      receiverUsername: e.target.value,
                    })
                  }
                />
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Receiver Name"
                    className="w-full p-4 border-2 border-white rounded-xl outline-none focus:border-[var(--green)] shadow-sm font-bold"
                    value={formData.receiverName}
                    onChange={(e) =>
                      setFormData({ ...formData, receiverName: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Full Destination Address"
                    className="w-full p-4 border-2 border-white rounded-xl outline-none focus:border-[var(--green)] shadow-sm font-bold"
                    value={formData.receiverAddress}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        receiverAddress: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>
            <button className="w-full bg-[var(--green)] text-white font-black py-5 rounded-2xl shadow-xl hover:opacity-90 active:scale-95 transition-all uppercase tracking-widest">
              Submit Transport Request
            </button>
          </form>
        </div>
      )}

      {/* TABLES SECTION */}
      {(activeTab === "outgoing" || activeTab === "incoming") && (
        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden w-full">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">
                  Identification
                </th>
                <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest">
                  Counterparty / Destination
                </th>
                <th className="p-6 text-xs font-black text-slate-400 uppercase tracking-widest text-center">
                  Status / Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeTab === "outgoing" &&
                outgoing.map((r) => (
                  <tr
                    key={r._id}
                    className={`hover:bg-slate-50/50 transition-colors ${r.destinationType === "Cull" ? "bg-red-50/20" : ""}`}
                  >
                    <td className="p-6">
                      <span className="font-mono text-xs font-black text-slate-500 bg-slate-100 px-2 py-1 rounded">
                        {r.batchId}
                      </span>
                      {r.destinationType === "Cull" && (
                        <span className="ml-2 text-[9px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200">
                          CULL RECORD
                        </span>
                      )}
                    </td>
                    <td className="p-6 font-bold text-slate-700">
                      {r.destinationType === "Internal"
                        ? r.receiverUsername
                        : r.receiverDetails?.name}
                    </td>
                    <td className="p-6 flex flex-col items-center gap-2">
                      <StatusBadge status={r.status} />

                      <div className="flex gap-2">
                        {/* SENDER PROOF UPLOAD (Works for Internal and External) */}
                        {((r.status === "Approved (VHC Issued)" &&
                          !r.proofDocumentUrl) ||
                          r.status === "Proof Rejected") && (
                          <button
                            onClick={() => triggerFileUpload(r._id)}
                            className="text-[10px] font-black bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-black transition shadow-md uppercase"
                          >
                            📄{" "}
                            {r.destinationType === "Internal"
                              ? "Upload POD"
                              : "Upload Exit Proof"}
                          </button>
                        )}

                        {/* VIEW UPLOADED PROOF */}
                        {r.proofDocumentUrl && (
                          <a
                            href={r.proofDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition shadow-sm uppercase"
                          >
                            👁️ View Proof
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {activeTab === "incoming" &&
                incoming.map((r) => (
                  <tr
                    key={r._id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-6">
                      <span className="font-mono text-xs font-black text-[var(--green)] bg-green-50 px-2 py-1 rounded">
                        {r.batchId}
                      </span>
                    </td>
                    <td className="p-6 font-bold text-slate-700">
                      {r.farmerUsername}
                    </td>
                    <td className="p-6 flex flex-col items-center gap-2">
                      <StatusBadge status={r.status} />

                      <div className="flex gap-2 items-center">
                        {/* VIEW SENDER'S UPLOADED PROOF */}
                        {r.proofDocumentUrl && (
                          <a
                            href={r.proofDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-black bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition shadow-sm uppercase"
                          >
                            👁️ View POD
                          </a>
                        )}

                        {/* RECEIVER CONFIRM */}
                        {r.status === "Approved (VHC Issued)" && (
                          <button
                            onClick={() => handleReceive(r._id)}
                            className="bg-[var(--green)] text-white px-6 py-2 rounded-xl text-xs font-black hover:opacity-90 shadow-md transition uppercase tracking-widest flex items-center gap-2"
                          >
                            📥 Confirm Receipt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- NEW: CULL DISPOSAL UPLOAD MODAL --- */}
      {cullModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-red-100">
            <div className="bg-red-600 p-6 flex justify-between items-center text-white">
              <h3 className="font-black text-xl tracking-tight">
                Record Farm Disposal
              </h3>
              <button
                onClick={() => setCullModal({ ...cullModal, isOpen: false })}
                className="w-8 h-8 rounded-full bg-red-700 hover:bg-red-800 flex items-center justify-center font-bold transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-8 space-y-5">
              <form onSubmit={handleCullSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                    Quantity Culled
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={cullModal.animal.quantity}
                    value={cullModal.transferQuantity}
                    onChange={(e) =>
                      setCullModal({
                        ...cullModal,
                        transferQuantity: e.target.value,
                      })
                    }
                    className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    If only part of the batch was culled, enter the exact
                    amount.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Disposal Method
                    </label>
                    <select
                      value={cullModal.disposalMethod}
                      onChange={(e) =>
                        setCullModal({
                          ...cullModal,
                          disposalMethod: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 font-bold"
                    >
                      <option>Deep Burial</option>
                      <option>Incineration</option>
                      <option>Chemical Rendering</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split("T")[0]}
                      value={cullModal.disposalDate}
                      onChange={(e) =>
                        setCullModal({
                          ...cullModal,
                          disposalDate: e.target.value,
                        })
                      }
                      className="w-full p-3 border-2 border-slate-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm"
                    />
                  </div>
                </div>

                <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                  <label className="block text-xs font-black text-red-600 uppercase tracking-widest mb-3 text-center">
                    Upload Required Proof
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-red-300 border-dashed rounded-xl cursor-pointer bg-white hover:bg-red-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <span className="text-xl mb-1 text-red-400">📸</span>
                      <p className="text-xs text-slate-500 font-medium">
                        Click to attach photo or PDF
                      </p>
                    </div>
                    <input
                      type="file"
                      required
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={(e) =>
                        setCullModal({
                          ...cullModal,
                          proofFile: e.target.files[0],
                        })
                      }
                    />
                  </label>
                  {cullModal.proofFile && (
                    <p className="text-[10px] text-red-700 font-bold mt-3 text-center truncate px-2">
                      ✅ {cullModal.proofFile.name}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg shadow-red-200 transition-all uppercase tracking-widest active:scale-95"
                >
                  Submit for Verification
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      <TransactionLoadingOverlay isOpen={txLoading} message={txMessage} />
    </div>
  );
}
