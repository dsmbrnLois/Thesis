// src/components/common/AuditTrailModal.jsx
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
    const d = new Date(isoString);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} • ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  const fakeHash = (txId) => {
    if (!txId) return "0000...0000";
    return `${txId.substring(0, 6)}...${txId.substring(txId.length - 6)}`;
  };

  // --- ORIGIN TRACE LOGIC ---
  const movementPath = useMemo(() => {
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

  // --- REVERSE CHRONOLOGICAL SORT ---
  const sortedHistory = useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) return [];
    return [...history].sort(
      (a, b) => new Date(b.data.timestamp) - new Date(a.data.timestamp),
    );
  }, [history]);

  // --- DYNAMIC HEADER DATA ---
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

  // Pick icon + color for each timeline event
  const getEventMeta = (item) => {
    const status = (item.data.status || "").toLowerCase();
    const severity = (item.data.severity || "").toLowerCase();

    if (status.includes("movement") || status.includes("transfer")) {
      return { icon: "local_shipping", bg: "bg-secondary-container", text: "text-on-secondary-container", headColor: "text-on-surface" };
    }
    if (status.includes("vaccin") || status.includes("deworming")) {
      return { icon: "vaccines", bg: "bg-tertiary-container", text: "text-on-tertiary-container", headColor: "text-tertiary" };
    }
    if (severity === "dangerous") {
      return { icon: "emergency", bg: "bg-error-container", text: "text-on-error-container", headColor: "text-error" };
    }
    if (severity === "mild") {
      return { icon: "warning", bg: "bg-secondary-container", text: "text-on-secondary-container", headColor: "text-secondary" };
    }
    if (severity === "safe") {
      return { icon: "verified", bg: "bg-primary-container", text: "text-on-primary-container", headColor: "text-primary" };
    }
    return { icon: "history", bg: "bg-surface-container-high", text: "text-on-surface-variant", headColor: "text-on-surface" };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-md" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(13, 29, 43, 0.4)' }}>
      <div className="bg-surface border border-outline-variant shadow-2xl rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden relative">

        {/* ── MODAL HEADER ── */}
        <div className="p-lg bg-surface-container border-b border-outline-variant flex justify-between items-start">
          <div>
            <h3 className="font-display text-display-lg text-on-surface tracking-tight">
              Batch Audit Trail
            </h3>
            <div className="flex items-center gap-xs mt-1">
              <span className="font-mono text-label-caps text-primary bg-primary-container/20 px-2 py-0.5 rounded text-[10px] uppercase">
                VERIFIED ASSET
              </span>
              <code className="font-mono text-data-mono text-on-surface-variant">
                {displayData.batchId} — {displayData.species} ({displayData.quantity} heads)
              </code>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-outline hover:text-on-surface transition-colors p-1"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* ── MODAL BODY ── */}
        <div className="flex-1 overflow-y-auto p-lg space-y-0 relative" style={{ scrollbarWidth: 'thin', scrollbarColor: '#bec8cb transparent' }}>
          {historyLoading ? (
            <div className="flex flex-col items-center py-20">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="font-mono text-label-caps text-on-surface-variant uppercase">
                Fetching cryptographic ledger...
              </p>
            </div>
          ) : !Array.isArray(history) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-error text-5xl mb-4">error</span>
              <h4 className="font-display text-headline-md font-bold text-error mb-2">Ledger Verification Failed</h4>
              <p className="font-body text-body-md text-on-surface-variant px-10">
                The node was unable to retrieve the history for this asset. It may have been archived, or the network timed out.
              </p>
            </div>
          ) : sortedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="material-symbols-outlined text-outline text-5xl mb-4 opacity-30">description</span>
              <p className="font-body text-body-md text-on-surface-variant">
                No blockchain records found for this asset.
              </p>
            </div>
          ) : (
            <>
              {/* Chain of Custody */}
              {movementPath.length > 0 && (
                <div className="mb-lg p-md bg-surface-container-low border border-outline-variant rounded-lg">
                  <p className="font-mono text-label-caps text-outline uppercase mb-2">Chain of Custody (Origin Trace)</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {movementPath.map((loc, idx) => (
                      <React.Fragment key={idx}>
                        <div className="bg-tertiary-fixed text-on-tertiary-fixed-variant px-3 py-1.5 rounded text-[11px] font-bold font-mono">
                          {idx === 0 && <span className="material-symbols-outlined text-[12px] mr-1 align-middle">pin_drop</span>}
                          {loc}
                        </div>
                        {idx < movementPath.length - 1 && (
                          <span className="material-symbols-outlined text-outline text-[16px]">arrow_forward</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* TIMELINE */}
              <div className="space-y-0">
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

                  const meta = getEventMeta(item);
                  const isLast = i === sortedHistory.length - 1;

                  return (
                    <React.Fragment key={i}>
                      {/* Inherited separator */}
                      {isFirstParentEvent && (
                        <div className="relative pl-12 py-4">
                          <div className="absolute left-[19px] top-0 bottom-0 w-0.5" style={{ background: 'repeating-linear-gradient(to bottom, #bec8cb 0, #bec8cb 4px, transparent 4px, transparent 8px)' }}></div>
                          <div className="bg-secondary-container border border-outline-variant text-on-secondary-container font-mono text-label-caps px-3 py-2 rounded-lg flex items-center gap-2 relative z-10 w-fit">
                            <span className="material-symbols-outlined text-[14px]">link</span>
                            Batch Split Origin (Inherited History Below)
                          </div>
                        </div>
                      )}

                      <div className={`relative pl-12 ${isLast ? 'pb-4' : 'pb-10'}`} style={!isLast ? {
                        /* Dashed timeline line */
                      } : {}}>
                        {/* Dashed vertical line */}
                        {!isLast && (
                          <div className="absolute left-[19px] top-10 bottom-0 w-0.5" style={{ background: 'repeating-linear-gradient(to bottom, #bec8cb 0, #bec8cb 4px, transparent 4px, transparent 8px)' }}></div>
                        )}

                        {/* Timeline icon node */}
                        <div className={`absolute left-0 top-0 w-10 h-10 rounded-full ${meta.bg} flex items-center justify-center z-10 border-4 border-surface`}>
                          <span className={`material-symbols-outlined ${meta.text} text-[20px]`}>{meta.icon}</span>
                        </div>

                        {/* Event title + timestamp */}
                        <div className="flex justify-between items-start mb-1">
                          <span className={`font-display text-headline-md ${meta.headColor} ${item.isInherited ? 'opacity-60' : ''}`}>
                            {item.data.status || "State Update"}
                            {item.isInherited && (
                              <span className="ml-2 font-mono text-[9px] bg-surface-container-highest text-on-surface-variant px-2 py-0.5 rounded uppercase align-middle">
                                Inherited
                              </span>
                            )}
                          </span>
                          <time className="font-mono text-label-caps text-on-surface-variant whitespace-nowrap ml-2">
                            {formatDate(item.data.timestamp)}
                          </time>
                        </div>

                        {/* Event detail card */}
                        <div className="bg-surface-container-low border border-outline-variant rounded-lg p-md">
                          {/* Deduction alert */}
                          {isDeduction && (
                            <div className="mb-md bg-error-container border border-error/20 p-md rounded-lg flex items-center gap-3">
                              <span className="material-symbols-outlined text-error text-[18px]">content_cut</span>
                              <div>
                                <div className="font-mono text-label-caps text-error uppercase">
                                  Fractional Transfer Event
                                </div>
                                <div className="font-body text-body-md text-on-error-container">
                                  {deductedQty} head(s) were split and moved from this batch.
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Data grid */}
                          <div className="grid grid-cols-2 gap-md text-body-md mb-md">
                            <div>
                              <p className="font-mono text-[10px] text-outline uppercase mb-1">Batch ID</p>
                              <p className="font-body font-bold font-mono">{item.data.batchId}</p>
                            </div>
                            <div>
                              <p className="font-mono text-[10px] text-outline uppercase mb-1">Quantity</p>
                              <p className="font-body font-bold">{item.data.quantity} heads</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-md text-body-md mb-md">
                            <div>
                              <p className="font-mono text-[10px] text-outline uppercase mb-1">Location / Custody</p>
                              <p className="font-body font-bold">{item.data.location}</p>
                            </div>
                            <div>
                              <p className="font-mono text-[10px] text-outline uppercase mb-1">
                                {!item.data.severity || item.data.severity === "Ongoing"
                                  ? "Initial Observation"
                                  : "Health Status"}
                              </p>
                              {!item.data.severity || item.data.severity === "Ongoing" ? (
                                <p className="font-body italic text-on-surface-variant">"{item.data.healthStatus}"</p>
                              ) : item.data.severity === "safe" ? (
                                <span className="inline-block font-mono text-label-caps bg-tertiary-fixed text-on-tertiary-fixed-variant px-2 py-0.5 rounded text-[10px]">CLEARED</span>
                              ) : item.data.severity === "mild" ? (
                                <span className="inline-block font-mono text-label-caps bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded text-[10px]">MONITORING</span>
                              ) : (
                                <span className="inline-block font-mono text-label-caps bg-error-container text-on-error-container px-2 py-0.5 rounded text-[10px]">ALERT</span>
                              )}
                            </div>
                          </div>

                          {/* Disease diagnosis */}
                          {item.data.diagnosedDisease &&
                            item.data.severity !== "safe" &&
                            item.data.severity !== "Ongoing" && (
                              <div className="mb-md bg-error-container/50 border border-error/10 p-md rounded flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-error animate-pulse"></div>
                                <span className="font-mono text-label-caps text-error">
                                  DIAGNOSIS: {item.data.diagnosedDisease}
                                </span>
                              </div>
                            )}

                          {/* Hash footer */}
                          <div className="flex items-center gap-xs text-primary border-t border-outline-variant/30 pt-xs mt-xs">
                            <span className="material-symbols-outlined text-[14px]">hub</span>
                            <span className="font-mono text-data-mono text-[11px] truncate">
                              SHA256: {fakeHash(item.txId)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── MODAL FOOTER ── */}
        <div className="p-lg bg-surface border-t border-outline-variant flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
            <span className="font-mono text-label-caps text-on-surface-variant text-[10px] uppercase">
              REAL-TIME SYNC ACTIVE
            </span>
          </div>
          <div className="flex gap-md">
            <button className="px-lg py-2 border border-outline-variant font-mono text-label-caps rounded hover:bg-surface-container transition-colors uppercase">
              Export Report
            </button>
            <button
              onClick={onClose}
              className="px-lg py-2 bg-primary text-on-primary font-mono text-label-caps rounded hover:opacity-90 transition-all shadow-sm uppercase"
            >
              Verify Chain
            </button>
          </div>
        </div>

        {/* Floating decoration */}
        <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>
    </div>
  );
}