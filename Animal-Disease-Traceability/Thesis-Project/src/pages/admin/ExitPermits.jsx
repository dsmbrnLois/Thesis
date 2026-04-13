import { useState, useEffect } from "react";

export default function ExitPermits() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch(
        "http://localhost:3001/api/transfers/pending-exit",
      );
      const data = await res.json();
      setRequests(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision, request) => {
    let rejectionReason = null;

    if (decision === "REJECT") {
      rejectionReason = prompt(
        "Reason for rejection (e.g., 'Unclear receipt'):",
      );
      if (!rejectionReason) return;
    } else {
      const isCull = request.destinationType === "Cull";
      const warningMsg = isCull
        ? "Verify this disposal? This will PERMANENTLY BURN the asset on the Blockchain as a BIOHAZARD CULL."
        : "Verify this exit? This will PERMANENTLY REMOVE the asset from active inventory on the Blockchain.";

      if (!confirm(warningMsg)) return;
    }

    setProcessing(true);
    const user = JSON.parse(localStorage.getItem("user"));

    try {
      const res = await fetch(
        "http://localhost:3001/api/transfers/regulator-verify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: request._id,
            regulatorUsername: user.username,
            decision,
            rejectionReason,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Operation failed");
      }

      alert(
        decision === "APPROVE"
          ? "Exit Verified & Asset Burned."
          : "Proof Rejected.",
      );
      fetchRequests();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-black text-slate-800 mb-6">
        Exit Verification (Slaughter / Export / Disposal)
      </h1>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">
            Loading pending verifications...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-4">✅</div>
            <p className="text-slate-500 font-bold">All Clear</p>
            <p className="text-xs text-slate-400">
              No pending exit verifications.
            </p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-xs font-bold uppercase text-slate-500">
                  Asset / Batch ID
                </th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500">
                  Exit Type & Details
                </th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500">
                  Proof Provided
                </th>
                <th className="p-4 text-xs font-bold uppercase text-slate-500 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => {
                const isCull = r.destinationType === "Cull";

                return (
                  <tr
                    key={r._id}
                    className={`transition-colors ${isCull ? "bg-red-50/40 hover:bg-red-50/80" : "hover:bg-slate-50/50"}`}
                  >
                    <td className="p-4">
                      <div
                        className={`font-bold ${isCull ? "text-red-800" : "text-slate-700"}`}
                      >
                        {r.farmerUsername}
                      </div>
                      <div
                        className={`text-xs font-mono w-fit px-2 py-0.5 rounded mt-1 border ${isCull ? "bg-red-100 text-red-700 border-red-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                      >
                        {r.batchId}
                      </div>
                      {isCull && (
                        <div className="text-[10px] font-black text-red-600 mt-1 uppercase tracking-widest animate-pulse">
                          🔥 Biohazard
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest ${
                          r.destinationType === "Slaughter"
                            ? "bg-orange-100 text-orange-700"
                            : r.destinationType === "Cull"
                              ? "bg-red-600 text-white shadow-md shadow-red-200"
                              : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {r.destinationType}
                      </span>
                      <div className="text-xs font-bold text-slate-700 mt-2">
                        Qty: {r.transferQuantity} heads
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {isCull
                          ? `Method: ${r.receiverDetails?.address}`
                          : r.receiverDetails?.name}
                      </div>
                    </td>
                    <td className="p-4">
                      <a
                        href={r.proofDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 font-medium text-sm hover:underline px-3 py-2 rounded-lg w-fit ${isCull ? "text-red-700 bg-red-100/50" : "text-blue-600 bg-blue-50"}`}
                      >
                        📄 View {isCull ? "Disposal Photo" : "Receipt"}
                      </a>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleDecision("REJECT", r)}
                          className="px-3 py-2 rounded-lg text-xs font-bold bg-white text-red-600 hover:bg-red-50 transition border border-red-200"
                          disabled={processing}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleDecision("APPROVE", r)}
                          className={`px-4 py-2 rounded-lg text-xs font-black text-white shadow-md transition uppercase tracking-widest ${isCull ? "bg-red-600 hover:bg-red-700 shadow-red-300" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"}`}
                          disabled={processing}
                        >
                          {processing
                            ? "..."
                            : isCull
                              ? "Verify Burn"
                              : "Verify Exit"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
