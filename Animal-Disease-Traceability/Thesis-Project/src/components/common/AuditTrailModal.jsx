import React, { useMemo } from "react";

export default function AuditTrailModal({
  isOpen,
  onClose,
  historyLoading,
  history,
  selectedAnimal,
}) {
  if (!isOpen) return null;

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString();
  };

  // --- ORIGIN TRACE LOGIC (ARMORED) ---
  const movementPath = useMemo(() => {
    // 🛡️ DEFENSIVE CHECK: Ensure history is actually an array before spreading
    if (!Array.isArray(history) || history.length === 0) return [];
    
    const chronological = [...history].sort(
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
  }, [history]);

  // --- REVERSE CHRONOLOGICAL SORT FOR TIMELINE (ARMORED) ---
  const sortedHistory = useMemo(() => {
    // 🛡️ DEFENSIVE CHECK: Ensure history is actually an array before spreading
    if (!Array.isArray(history) || history.length === 0) return [];
    
    return [...history].sort(
      (a, b) => new Date(b.data.timestamp) - new Date(a.data.timestamp),
    );
  }, [history]);

  // --- DYNAMIC HEADER DATA EXTRACTION ---
  const displayData = useMemo(() => {
    if (sortedHistory.length > 0) {
      const newestRecord = sortedHistory[0].data;
      return {
        batchId: newestRecord.batchId,
        species: newestRecord.species,
        quantity: newestRecord.quantity,
      };
    }
    return {
      batchId: selectedAnimal?.batchId || "Loading...",
      species: selectedAnimal?.species || "...",
      quantity: selectedAnimal?.quantity || 0,
    };
  }, [sortedHistory, selectedAnimal]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-black text-slate-900">
              Blockchain Audit Trail
            </h3>
            <p className="text-emerald-500 text-sm font-bold uppercase tracking-tighter">
              {displayData.batchId} - {displayData.species} (
              {displayData.quantity} heads)
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-8 overflow-y-auto bg-slate-50/30">
          {historyLoading ? (
            <div className="flex flex-col items-center py-20">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-medium">
                Fetching Cryptographic Ledger...
              </p>
            </div>
          ) : !Array.isArray(history) ? (
            /* 🛡️ NEW ERROR STATE UI: Shows when backend sends an error instead of data */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-4">⚠️</span>
              <h4 className="text-lg font-bold text-red-600 mb-2">Ledger Verification Failed</h4>
              <p className="text-slate-500 text-sm px-10">
                The node was unable to retrieve the history for this asset. It may have been archived, or the network timed out.
              </p>
            </div>
          ) : sortedHistory.length === 0 ? (
            <p className="text-center text-slate-400 py-10 italic">
              No blockchain records found.
            </p>
          ) : (
            <>
              {/* --- VISUAL MOVEMENT TRACE --- */}
              {movementPath.length > 0 && (
                <div className="mb-8 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                  <h4 className="text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">
                    Chain of Custody (Origin Trace)
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {movementPath.map((loc, idx) => (
                      <React.Fragment key={idx}>
                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100">
                          {idx === 0 ? "📍 Origin: " : ""}
                          {loc}
                        </div>
                        {idx < movementPath.length - 1 && (
                          <span className="text-slate-300 font-black">➔</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* TIMELINE (Newest First) */}
              <div className="space-y-0 mt-4">
                {sortedHistory.map((item, i) => {
                  const isFirstParentEvent =
                    item.isInherited &&
                    i > 0 &&
                    !sortedHistory[i - 1].isInherited;

                  const olderItem = sortedHistory[i + 1];
                  const isDeduction =
                    olderItem &&
                    item.data.batchId === olderItem.data.batchId &&
                    item.data.quantity < olderItem.data.quantity;
                  const deductedQty = isDeduction
                    ? olderItem.data.quantity - item.data.quantity
                    : 0;

                  return (
                    <React.Fragment key={i}>
                      {isFirstParentEvent && (
                        <div className="relative pl-10 py-6">
                          <div className="absolute left-[11px] top-0 bottom-0 w-0.5 border-l-2 border-slate-300 border-dashed"></div>
                          <div className="bg-amber-100 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-widest p-3 rounded-xl flex items-center gap-3 relative z-10 w-fit shadow-sm">
                            <span>🔗</span> Batch Split Origin (Inherited
                            History Below)
                          </div>
                        </div>
                      )}

                      <div className="relative pl-10 pb-10 group">
                        {i !== sortedHistory.length - 1 &&
                          !isFirstParentEvent && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200 group-hover:bg-emerald-200 transition-colors"></div>
                          )}
                        {i !== sortedHistory.length - 1 &&
                          isFirstParentEvent && (
                            <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-slate-200 group-hover:bg-emerald-200 transition-colors"></div>
                          )}

                        <div
                          className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 ${item.isInherited ? "bg-slate-400 shadow-slate-200" : "bg-emerald-500 shadow-emerald-200"}`}
                        ></div>

                        <div
                          className={`bg-white border rounded-2xl p-5 transition-all hover:shadow-xl ${item.isInherited ? "border-slate-200 opacity-80" : "border-slate-200 hover:border-emerald-500/30 hover:shadow-slate-200/50"}`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded font-mono uppercase tracking-widest">
                              TX: {item.txId.substring(0, 12)}...
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-1 rounded ${item.isInherited ? "text-slate-600 bg-slate-100" : "text-emerald-600 bg-emerald-50"}`}
                            >
                              {formatDate(item.data.timestamp)}
                            </span>
                          </div>

                          <p
                            className={`text-lg font-black mb-4 flex items-center gap-2 ${item.isInherited ? "text-slate-600" : "text-slate-800"}`}
                          >
                            {item.data.status || "State Update"}
                            {item.isInherited && (
                              <span className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ml-2">
                                Inherited
                              </span>
                            )}
                          </p>

                          {isDeduction && (
                            <div className="mb-4 bg-orange-50 border border-orange-200 p-3.5 rounded-xl flex items-center gap-3 shadow-sm">
                              <span className="text-xl">✂️</span>
                              <div>
                                <div className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                                  Fractional Transfer Event
                                </div>
                                <div className="text-xs font-bold text-orange-800">
                                  {deductedQty} head(s) were split and moved
                                  from this batch.
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500 font-medium">
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="block text-slate-400 uppercase text-[9px] mb-1">
                                Batch ID
                              </span>
                              <span className="text-slate-800 font-bold font-mono">
                                {item.data.batchId}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="block text-slate-400 uppercase text-[9px] mb-1">
                                Quantity
                              </span>
                              <span className="text-slate-800 font-bold">
                                {item.data.quantity} heads
                              </span>
                            </div>
                            <div className="col-span-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="block text-slate-400 uppercase text-[9px] mb-1">
                                Location / Custody
                              </span>
                              <span className="text-slate-800">
                                {item.data.location}
                              </span>
                            </div>
                            <div className="col-span-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="block text-slate-400 uppercase text-[9px] mb-1">
                                {!item.data.severity ||
                                item.data.severity === "Ongoing"
                                  ? "Initial Observation"
                                  : "Official Health Status"}
                              </span>
                              <span className="text-slate-800">
                                {!item.data.severity ||
                                item.data.severity === "Ongoing" ? (
                                  <span className="italic text-slate-600">
                                    "{item.data.healthStatus}"
                                  </span>
                                ) : item.data.severity === "safe" ? (
                                  <span className="font-bold text-emerald-600">
                                    ✅ Verified Healthy
                                  </span>
                                ) : item.data.severity === "mild" ? (
                                  <span className="font-bold text-amber-600">
                                    ⚠️ Mild Illness
                                  </span>
                                ) : (
                                  <span className="font-bold text-red-600">
                                    ⛔ Dangerous Disease
                                  </span>
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
                    </React.Fragment>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}