import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import API_URL from "../../config/api";

export default function DigitalPassport() {
  const { batchId } = useParams();
  const [passportData, setPassportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPassport = async () => {
      try {
        const res = await fetch(`${API_URL}/passport/${batchId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Passport not found");
        }
        const data = await res.json();
        setPassportData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPassport();
  }, [batchId]);

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const speciesEmoji = (species) => {
    const map = { Hog: "🐷", Cow: "🐄", Chicken: "🐔", Carabao: "🐃", Duck: "🦆", Goat: "🐐" };
    return map[species] || "🐾";
  };

  // --- Sorted audit trail (newest first) ---
  const sortedAudit = useMemo(() => {
    if (!passportData?.auditTrail || !Array.isArray(passportData.auditTrail)) return [];
    return [...passportData.auditTrail].sort(
      (a, b) => new Date(b.data.timestamp) - new Date(a.data.timestamp)
    );
  }, [passportData]);

  // --- Chain of custody ---
  const movementPath = useMemo(() => {
    if (!passportData?.auditTrail || !Array.isArray(passportData.auditTrail)) return [];
    const chronological = [...passportData.auditTrail].sort(
      (a, b) => new Date(a.data.timestamp) - new Date(b.data.timestamp)
    );
    const path = [];
    chronological.forEach((item) => {
      const loc = item.data.location;
      if (loc && (path.length === 0 || path[path.length - 1] !== loc)) {
        path.push(loc);
      }
    });
    return path;
  }, [passportData]);

  const severityTheme = (severity) => {
    if (severity === "safe") return "bg-tertiary-fixed/20 border-tertiary-fixed-dim text-tertiary";
    if (severity === "mild") return "bg-surface-container-high border-outline-variant text-on-surface-variant";
    if (severity === "dangerous") return "bg-error-container/20 border-error/30 text-error";
    return "bg-surface-container-low border-outline-variant text-on-surface-variant";
  };

  const severityText = (severity) => {
    if (severity === "safe") return "VERIFIED HEALTHY";
    if (severity === "mild") return "MILD ILLNESS";
    if (severity === "dangerous") return "DANGEROUS DISEASE";
    return "PENDING VERIFICATION";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col justify-center items-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="font-mono text-label-caps text-primary uppercase tracking-widest animate-pulse">
          Loading Digital Passport...
        </p>
      </div>
    );
  }

  if (error || !passportData) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col justify-center items-center p-xl">
        <span className="material-symbols-outlined text-[48px] text-error mb-4">error</span>
        <h2 className="font-display text-headline-lg text-primary uppercase mb-2">Passport Not Found</h2>
        <p className="font-body text-body-lg text-on-surface-variant text-center max-w-md">
          {error || "Unable to retrieve the Digital Animal Passport for this asset."}
        </p>
        <p className="font-mono text-data-mono text-on-surface mt-4 uppercase">Batch ID: {batchId}</p>
      </div>
    );
  }

  const { animal, healthRecords, auditTrail, meta } = passportData;

  return (
    <div className="min-h-screen bg-surface-container-lowest py-xl px-md font-sans">
      <div className="max-w-3xl mx-auto flex flex-col shadow-[0_4px_12px_rgba(28,43,58,0.1)] border border-outline-variant bg-surface">
        
        {/* === HEADER === */}
        <div className="bg-surface border-b border-outline-variant p-xl text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
          <div className="inline-block bg-surface-container-highest px-md py-xs font-mono text-[10px] text-on-surface-variant uppercase tracking-widest border border-outline-variant mb-md">
            OFFICIAL DOCUMENT
          </div>
          <h1 className="font-display text-display-sm text-primary uppercase tracking-tight">
            Digital Animal Passport
          </h1>
          <p className="font-mono text-label-caps text-on-surface-variant uppercase mt-2">
            ADTS Regional Hub — Livestock Traceability System
          </p>
          <div className="mt-md inline-block bg-surface-container-lowest border border-outline-variant px-lg py-xs font-mono text-data-mono text-primary font-bold">
            {animal.batchId}
          </div>
        </div>

        {/* === ANIMAL IDENTITY CARD === */}
        <div className="p-xl border-b border-outline-variant bg-surface">
          <div className="flex items-center gap-lg mb-lg">
            <div className="w-16 h-16 bg-surface-container-low border border-outline-variant flex items-center justify-center text-3xl">
              {speciesEmoji(animal.species)}
            </div>
            <div>
              <h2 className="font-body text-headline-md font-bold text-on-surface uppercase">
                {animal.species}
              </h2>
              <p className="font-mono text-label-caps text-on-surface-variant uppercase mt-1">
                {animal.quantity} HEAD(S) REGISTERED
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-2 border px-md py-sm mb-lg ${severityTheme(animal.severity)}`}>
            <span className="material-symbols-outlined text-[16px]">
              {animal.severity === 'safe' ? 'check_circle' : animal.severity === 'dangerous' ? 'warning' : 'pending'}
            </span>
            <span className="font-mono text-label-caps uppercase font-bold tracking-widest">
              {severityText(animal.severity)}
            </span>
            {animal.diagnosedDisease && animal.severity !== "safe" && animal.severity !== "Ongoing" && (
              <span className="font-mono text-label-caps uppercase font-bold ml-2">
                — {animal.diagnosedDisease}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-md border border-outline-variant bg-surface-container-lowest divide-x divide-y divide-outline-variant">
            <div className="p-md flex flex-col col-span-2 sm:col-span-1">
              <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mb-1">OWNER</span>
              <span className="font-body text-body-lg font-bold text-on-surface uppercase">{animal.fullName}</span>
            </div>
            <div className="p-md flex flex-col col-span-2 sm:col-span-1">
              <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mb-1">LOCATION</span>
              <span className="font-body text-body-lg font-bold text-on-surface uppercase">{animal.location}</span>
            </div>
            <div className="p-md flex flex-col col-span-2 sm:col-span-1">
              <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mb-1">REGISTERED</span>
              <span className="font-mono text-data-mono text-on-surface font-bold">{formatDate(animal.timestamp)}</span>
            </div>
            <div className="p-md flex flex-col col-span-2 sm:col-span-1">
              <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mb-1">STATUS</span>
              <span className="font-mono text-label-caps text-on-surface font-bold uppercase">{animal.status}</span>
            </div>
          </div>

          {animal.parentBatchId && animal.parentBatchId !== "NONE" && (
            <div className="mt-md bg-surface-container-high border border-outline-variant p-sm flex items-center gap-2 font-mono text-[10px] uppercase text-on-surface-variant">
              <span className="material-symbols-outlined text-[14px]">link</span>
              SPLIT FROM PARENT BATCH: <span className="text-primary font-bold">{animal.parentBatchId}</span>
            </div>
          )}
        </div>

        {/* === CHAIN OF CUSTODY === */}
        {movementPath.length > 1 && (
          <div className="p-xl border-b border-outline-variant bg-surface-container-lowest">
            <h3 className="font-display text-headline-sm text-primary uppercase mb-md flex items-center gap-2">
              <span className="material-symbols-outlined">map</span>
              Chain of Custody
            </h3>
            <div className="flex flex-wrap items-center gap-sm">
              {movementPath.map((loc, idx) => (
                <React.Fragment key={idx}>
                  <div className={`border px-md py-xs font-mono text-label-caps uppercase ${idx === 0 ? 'bg-tertiary-fixed/20 border-tertiary-fixed-dim text-tertiary font-bold' : 'bg-surface border-outline-variant text-on-surface-variant'}`}>
                    {idx === 0 && <span className="material-symbols-outlined text-[12px] mr-1 inline-block align-text-bottom">location_on</span>}
                    {loc}
                  </div>
                  {idx < movementPath.length - 1 && (
                    <span className="material-symbols-outlined text-outline">arrow_right_alt</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* === MEDICAL RECORDS === */}
        <div className="p-xl border-b border-outline-variant bg-surface">
          <h3 className="font-display text-headline-sm text-primary uppercase mb-md flex items-center gap-2">
            <span className="material-symbols-outlined">clinical_notes</span>
            Medical Records
            <span className="bg-primary/10 text-primary px-2 py-0.5 font-mono text-[10px] ml-2">
              {healthRecords.length}
            </span>
          </h3>

          {healthRecords.length === 0 ? (
            <div className="text-center py-xl border border-outline-variant border-dashed bg-surface-container-lowest">
              <span className="material-symbols-outlined text-[32px] text-outline mb-2">folder_open</span>
              <p className="font-mono text-label-caps text-on-surface-variant uppercase">
                No medical records found
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-md">
              {healthRecords.map((log, i) => (
                <div key={i} className={`border p-md ${log.isInherited ? 'bg-surface-container-lowest border-outline-variant/50' : 'bg-surface border-outline-variant'}`}>
                  <div className="flex justify-between items-start mb-sm gap-4">
                    <span className="font-mono text-data-mono text-on-surface font-bold">
                      {formatDate(log.date)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-widest bg-surface-container-highest px-2 py-0.5 text-on-surface-variant border border-outline-variant">
                        {log.type}
                      </span>
                      {log.isInherited && (
                        <span className="font-mono text-[9px] uppercase tracking-widest bg-outline/20 px-2 py-0.5 text-on-surface border border-outline-variant">
                          INHERITED
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="font-body text-body-lg font-bold text-on-surface uppercase mb-1">
                    {log.name}
                  </p>
                  
                  {log.notes && (
                    <p className="font-body text-body-md text-on-surface-variant mb-sm italic">
                      "{log.notes}"
                    </p>
                  )}
                  
                  <div className="flex justify-between items-center mt-md pt-sm border-t border-outline-variant">
                    <span className="font-mono text-label-caps text-on-surface-variant uppercase">
                      VET: {log.vetUsername}
                    </span>
                    <span className={`font-mono text-[9px] uppercase px-2 py-0.5 border ${log.status === "Valid" ? 'bg-tertiary-fixed/20 border-tertiary-fixed-dim text-tertiary' : 'bg-error-container/20 border-error/30 text-error'}`}>
                      {log.status}
                    </span>
                  </div>

                  {log.nextDueDate && (
                    <div className="mt-sm font-mono text-[10px] bg-surface-container-high px-2 py-1 uppercase text-on-surface-variant border border-outline-variant inline-block">
                      NEXT DUE: {formatDate(log.nextDueDate)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* === BLOCKCHAIN AUDIT TRAIL === */}
        <div className="p-xl border-b border-outline-variant bg-surface-container-lowest">
          <h3 className="font-display text-headline-sm text-primary uppercase mb-md flex items-center gap-2">
            <span className="material-symbols-outlined">link</span>
            Blockchain Audit Trail
            <span className="bg-primary/10 text-primary px-2 py-0.5 font-mono text-[10px] ml-2">
              {sortedAudit.length}
            </span>
          </h3>

          {sortedAudit.length === 0 ? (
            <div className="text-center py-xl border border-outline-variant border-dashed bg-surface">
              <span className="material-symbols-outlined text-[32px] text-outline mb-2">cloud_off</span>
              <p className="font-mono text-label-caps text-on-surface-variant uppercase">
                Blockchain data unavailable.
              </p>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-outline-variant"></div>
              
              {sortedAudit.map((item, i) => {
                const isFirstInherited = item.isInherited && i > 0 && !sortedAudit[i - 1].isInherited;

                return (
                  <React.Fragment key={i}>
                    {isFirstInherited && (
                      <div className="relative mb-md mt-sm bg-surface-container-high border border-outline-variant px-md py-sm font-mono text-[10px] uppercase text-on-surface-variant">
                        🔗 INHERITED HISTORY (PARENT BATCH)
                      </div>
                    )}
                    <div className="relative mb-lg">
                      <div className={`absolute -left-6 top-1 w-3 h-3 rounded-none rotate-45 border-2 border-surface ${item.isInherited ? 'bg-outline shadow-[0_0_0_1px_#727d81]' : 'bg-primary shadow-[0_0_0_1px_#004a77]'} z-10`}></div>
                      
                      <div className={`border p-md ${item.isInherited ? 'bg-surface-container-lowest border-outline-variant/50' : 'bg-surface border-outline-variant'}`}>
                        <div className="flex flex-wrap justify-between items-center mb-sm gap-2">
                          <span className="font-mono text-[10px] bg-on-surface text-surface px-2 py-0.5 border border-outline-variant">
                            TX: {item.txId?.substring(0, 16)}...
                          </span>
                          <span className={`font-mono text-data-mono font-bold ${item.isInherited ? 'text-on-surface-variant' : 'text-primary'}`}>
                            {formatDateTime(item.data.timestamp)}
                          </span>
                        </div>

                        <p className="font-body text-body-lg font-bold text-on-surface uppercase mb-md flex items-center gap-2">
                          {item.data.status || "STATE UPDATE"}
                          {item.isInherited && (
                            <span className="font-mono text-[9px] uppercase tracking-widest bg-outline/20 px-2 py-0.5 text-on-surface border border-outline-variant">
                              INHERITED
                            </span>
                          )}
                        </p>

                        <div className="grid grid-cols-2 gap-sm border border-outline-variant bg-surface-container-lowest divide-x divide-y divide-outline-variant">
                          <div className="p-sm flex flex-col col-span-2 sm:col-span-1">
                            <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mb-1">BATCH ID</span>
                            <span className="font-mono text-data-mono text-on-surface font-bold">{item.data.batchId}</span>
                          </div>
                          <div className="p-sm flex flex-col col-span-2 sm:col-span-1">
                            <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mb-1">QTY</span>
                            <span className="font-body text-body-sm font-bold text-on-surface uppercase">{item.data.quantity} HEADS</span>
                          </div>
                          <div className="p-sm flex flex-col col-span-2">
                            <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-widest mb-1">LOCATION</span>
                            <span className="font-body text-body-sm font-bold text-on-surface uppercase">{item.data.location}</span>
                          </div>
                        </div>

                        {item.data.diagnosedDisease && item.data.severity !== "safe" && item.data.severity !== "Ongoing" && (
                          <div className="mt-sm bg-error-container/20 border border-error/30 p-sm flex items-center gap-2 font-mono text-[10px] text-error uppercase">
                            <span className="w-2 h-2 bg-error"></span>
                            DIAGNOSIS: <span className="font-bold">{item.data.diagnosedDisease}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* === FOOTER === */}
        <div className="bg-surface p-xl text-center">
          <div className="border border-outline-variant bg-surface-container-lowest p-lg mb-md">
            <span className="material-symbols-outlined text-[24px] text-primary mb-2">shield</span>
            <p className="font-mono text-label-caps text-primary uppercase tracking-widest mb-2 font-bold">
              Blockchain Verified
            </p>
            <p className="font-body text-body-sm text-on-surface-variant">
              Powered by <strong className="text-on-surface">Hyperledger Fabric</strong>. All records are cryptographically immutable and tamper-proof.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 font-mono text-[10px] text-on-surface-variant uppercase">
            <span>CH: {meta?.channel} • CC: {meta?.chaincode}</span>
            <span>SYNC: {formatDateTime(meta?.generatedAt)}</span>
          </div>
          
          <p className="font-mono text-[9px] text-outline uppercase tracking-widest mt-md">
            {meta?.source}
          </p>
        </div>

      </div>
    </div>
  );
}
