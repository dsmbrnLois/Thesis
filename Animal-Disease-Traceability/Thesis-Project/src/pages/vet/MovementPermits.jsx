import { useState, useEffect, useMemo } from "react";
import API_URL from "../../config/api";
import TransactionLoadingOverlay from "../../components/common/TransactionLoadingOverlay";

export default function MovementPermits() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // --- MODAL STATE ---
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("medical"); // 'medical' or 'audit'
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [newTransportDate, setNewTransportDate] = useState(""); // For Vet overrides

  // Data State
  const [auditTrail, setAuditTrail] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/transfers/pending`);
      const data = await res.json();
      console.log("Raw Pending Requests from DB:", data);
      setRequests(data || []);
    } catch (err) {
      console.error("Error fetching permits:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- OPEN REVIEW MODAL ---
  const handleOpenReview = async (request) => {
    setSelectedRequest(request);
    setShowModal(true);
    setLoadingDetails(true);
    setActiveTab("medical"); // Default to Medical View
    setNewTransportDate(request.transportDate); // Default to requested date

    const user = JSON.parse(localStorage.getItem("user"));

    try {
      // 1. Fetch Medical Records (Using existing healthRecords.js route)
      const medRes = await fetch(
        `${API_URL}/health-records/${request.batchId}`,
      );
      const medData = await medRes.json();
      console.log("Raw Medical Data:", medData);
      setMedicalRecords(medData || []);

      // 2. Fetch Audit Trail (Blockchain)
      const auditRes = await fetch(
        `${API_URL}/transactions/history/${request.batchId}?username=${user.username}&mspId=${user.mspId}`,
      );
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        console.log("Raw Audit Data:", auditData);
        setAuditTrail(auditData);
      }
    } catch (err) {
      console.error("Failed to load details", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRequest(null);
  };

  // --- EXECUTION LOGIC ---
  const handleDecision = async (decision, request, rejectionReason = null) => {
    if (decision === "REJECT" && !rejectionReason) {
      rejectionReason = prompt("Enter rejection reason:") || "Vet Decision";
      if (!rejectionReason) return;
    }

    setProcessing(true);
    const user = JSON.parse(localStorage.getItem("user"));

    try {
      let url =
        decision === "APPROVE"
          ? `${API_URL}/transfers/vet-approve`
          : `${API_URL}/transfers/reject`;

      let body =
        decision === "APPROVE"
          ? {
              requestId: request._id,
              userMsp: user.mspId,
              vetUsername: user.username,
            }
          : { requestId: request._id, reason: rejectionReason };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      alert(
        decision === "APPROVE"
          ? "Transfer Executed & VHC Issued!"
          : "Request Rejected.",
      );
      setShowModal(false);
      fetchRequests();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString();
  };

  // Helper to check if lapsed
  const isLapsed = (dateString) => {
    return new Date(dateString) < new Date().setHours(0, 0, 0, 0);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString();
  };

  // Chain of custody origin trace
  const movementPath = useMemo(() => {
    if (!auditTrail || auditTrail.length === 0) return [];
    const chronological = [...auditTrail].sort(
      (a, b) => new Date(a.data.timestamp) - new Date(b.data.timestamp),
    );
    const path = [];
    chronological.forEach((item) => {
      const loc = item.data.location;
      if (loc && (path.length === 0 || path[path.length - 1] !== loc)) {
        path.push(loc);
      }
    });
    return path;
  }, [auditTrail]);

  return (
    <div className="p-8 bg-slate-50 min-h-screen w-full relative">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800">
          Movement & VHC Permits
        </h1>
        <p className="text-slate-500">
          Approve transport requests and issue health certificates.
        </p>
      </div>

      {/* --- MAIN TABLE --- */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">
            Loading permits...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-slate-500 font-bold">No Pending Requests</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-slate-500">
                  Date Requested
                </th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500">
                  Farmer / Batch
                </th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500">
                  Destination
                </th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {requests.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/50">
                  <td className="p-4 text-sm text-slate-600">
                    <div>{formatDate(r.createdAt)}</div>
                    <div className="text-xs text-emerald-600 font-bold mt-1">
                      Travel: {formatDate(r.transportDate)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-slate-700">
                      {r.farmerUsername}
                    </div>
                    <div className="text-xs font-mono bg-slate-100 w-fit px-2 rounded mt-1">
                      {r.batchId}
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded uppercase ${
                        r.destinationType === "Internal"
                          ? "bg-blue-100 text-blue-700"
                          : r.destinationType === "Slaughter"
                            ? "bg-red-100 text-red-700"
                            : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {r.destinationType}
                    </span>
                    <div className="text-xs text-slate-500 mt-1">
                      {r.destinationType === "Internal"
                        ? r.receiverUsername
                        : r.receiverDetails?.address}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleOpenReview(r)}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 shadow-md transition"
                    >
                      Review & Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- REVIEW MODAL --- */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-800">
                  Veterinary Review
                </h2>
                <p className="text-sm text-slate-500">
                  Evaluating Batch:{" "}
                  <span className="font-mono font-bold text-slate-700">
                    {selectedRequest.batchId}
                  </span>
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab("medical")}
                className={`flex-1 py-4 text-sm font-bold transition ${activeTab === "medical" ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50" : "text-slate-400 hover:bg-slate-50"}`}
              >
                🩺 Medical Records
              </button>
              <button
                onClick={() => setActiveTab("audit")}
                className={`flex-1 py-4 text-sm font-bold transition ${activeTab === "audit" ? "text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50" : "text-slate-400 hover:bg-slate-50"}`}
              >
                ⛓️ Chain of Custody
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
              {loadingDetails ? (
                <div className="text-center py-10 text-slate-400">
                  Loading records...
                </div>
              ) : (
                <>
                  {/* TAB 1: MEDICAL RECORDS */}
                  {activeTab === "medical" && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                        <h4 className="text-xs font-bold text-blue-500 uppercase">
                          Transport Schedule
                        </h4>

                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1">
                            <p className="text-xs text-slate-400">
                              Requested Date
                            </p>
                            <p
                              className={`font-bold ${
                                isLapsed(selectedRequest.transportDate)
                                  ? "text-red-500 line-through"
                                  : "text-slate-700"
                              }`}
                            >
                              {formatDate(selectedRequest.transportDate)}
                            </p>
                          </div>

                          {/* Allow Vet to Change Date if Lapsed or needed */}
                          <div className="flex-1">
                            <p className="text-xs text-slate-400">
                              Approved Date (VHC Validity)
                            </p>
                            <input
                              type="date"
                              value={newTransportDate.split("T")[0]} // Handle ISO string format
                              min={new Date().toISOString().split("T")[0]} // Vet can only set Today or Future
                              onChange={(e) =>
                                setNewTransportDate(e.target.value)
                              }
                              className="w-full p-2 border border-blue-200 rounded-lg text-sm font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                        </div>

                        {isLapsed(selectedRequest.transportDate) && (
                          <p className="text-xs text-red-500 mt-2 font-bold flex items-center gap-1">
                            ⚠️ The requested date has passed. You must set a new
                            valid date before approving.
                          </p>
                        )}
                      </div>

                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-4">
                        <h4 className="text-xs font-bold text-blue-500 uppercase">
                          Requirements Check
                        </h4>
                        <p className="text-sm text-slate-600 mt-1">
                          Ensure animal has required vaccinations (e.g. ASF/CSF)
                          within the valid period.
                        </p>
                      </div>

                      {medicalRecords.length === 0 ? (
                        <p className="text-center text-slate-400 italic py-8">
                          No medical records found for this batch.
                        </p>
                      ) : (
                        medicalRecords.map((rec, idx) => (
                          <div
                            key={idx}
                            className="flex gap-4 p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition"
                          >
                            <div className="text-center w-16 flex-shrink-0">
                              <div className="text-xl">💉</div>
                            </div>
                            <div>
                              <div className="font-bold text-slate-700">
                                {rec.type}
                              </div>
                              <div className="text-sm text-slate-500">
                                {rec.name}
                              </div>
                              <div className="text-xs text-emerald-600 font-bold mt-1">
                                Date: {formatDate(rec.date)}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                Vet: {rec.vetUsername}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* TAB 2: AUDIT TRAIL */}
                  {activeTab === "audit" && (
                    <div>
                      {auditTrail.length === 0 ? (
                        <p className="text-center text-slate-400 py-10 italic">
                          No blockchain records found.
                        </p>
                      ) : (
                        <>
                          {/* Origin Trace */}
                          {movementPath.length > 0 && (
                            <div className="mb-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                              <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">
                                Chain of Custody (Origin Trace)
                              </h4>
                              <div className="flex flex-wrap items-center gap-2">
                                {movementPath.map((loc, idx) => (
                                  <span key={idx} className="flex items-center gap-2">
                                    <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100">
                                      {idx === 0 ? "📍 Origin: " : ""}{loc}
                                    </div>
                                    {idx < movementPath.length - 1 && (
                                      <span className="text-slate-300 font-black">➔</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Timeline */}
                          <div className="space-y-0 mt-2">
                            {auditTrail.map((item, i) => (
                              <div key={i} className="relative pl-10 pb-8 group">
                                {/* Timeline line */}
                                {i !== auditTrail.length - 1 && (
                                  <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200 group-hover:bg-emerald-200 transition-colors"></div>
                                )}
                                {/* Node dot */}
                                <div className="absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white bg-emerald-500 shadow-md shadow-emerald-200 z-10"></div>

                                <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-500/30 transition-all hover:shadow-xl hover:shadow-slate-200/50">
                                  <div className="flex justify-between items-start mb-4">
                                    <span className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded font-mono uppercase tracking-widest">
                                      TX: {item.txId.substring(0, 12)}...
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                                      {formatDateTime(item.data.timestamp)}
                                    </span>
                                  </div>

                                  <p className="text-lg font-black text-slate-800 mb-4">
                                    {item.data.status || "State Update"}
                                  </p>

                                  <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 font-medium">
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                      <span className="block text-slate-400 uppercase text-[9px] mb-1">Species</span>
                                      <span className="text-slate-800 font-bold">{item.data.species}</span>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                      <span className="block text-slate-400 uppercase text-[9px] mb-1">Quantity</span>
                                      <span className="text-slate-800 font-bold">{item.data.quantity} heads</span>
                                    </div>
                                    <div className="col-span-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                      <span className="block text-slate-400 uppercase text-[9px] mb-1">Location / Custody</span>
                                      <span className="text-slate-800">{item.data.location}</span>
                                    </div>
                                    <div className="col-span-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                      <span className="block text-slate-400 uppercase text-[9px] mb-1">
                                        {!item.data.severity || item.data.severity === "Ongoing"
                                          ? "Initial Observation (Farmer)"
                                          : "Official Health Status (Vet)"}
                                      </span>
                                      <span className="text-slate-800">
                                        {!item.data.severity || item.data.severity === "Ongoing" ? (
                                          <span className="italic text-slate-600">"{item.data.healthStatus}"</span>
                                        ) : item.data.severity === "safe" ? (
                                          <span className="font-bold text-emerald-600">✅ Verified Healthy</span>
                                        ) : item.data.severity === "mild" ? (
                                          <span className="font-bold text-amber-600">⚠️ Mild Illness</span>
                                        ) : (
                                          <span className="font-bold text-red-600">⛔ Dangerous Disease</span>
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  {item.data.diagnosedDisease &&
                                    item.data.severity !== "safe" &&
                                    item.data.severity !== "Ongoing" && (
                                      <div className="mt-3 bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                        <span className="text-xs font-black text-red-600">
                                          DIAGNOSIS: {item.data.diagnosedDisease}
                                        </span>
                                      </div>
                                    )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => handleDecision("REJECT", selectedRequest)}
                className="px-4 py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition"
                disabled={processing}
              >
                Reject
              </button>
              <button
                onClick={() => handleDecision("APPROVE", selectedRequest)}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition flex items-center gap-2"
                disabled={processing}
              >
                {processing ? "Signing..." : "✅ Sign & Issue VHC"}
              </button>
            </div>
          </div>
        </div>
      )}
      <TransactionLoadingOverlay isOpen={processing} message="Signing VHC on blockchain..." />
    </div>
  );
}
