// src/components/common/MedicalLogModal.jsx
import React, { useState } from "react";
import API_URL from "../../config/api";

export default function MedicalLogModal({
  isOpen,
  onClose,
  healthLoading,
  healthLogs,
  selectedAnimal,
}) {
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [healthLogForm, setHealthLogForm] = useState({
    type: "Vaccination",
    name: "",
    notes: "",
    nextDueDate: "",
    proofFile: null,
  });

  const storedUser = localStorage.getItem("user");
  const currentUser = storedUser ? JSON.parse(storedUser) : {};
  const isVet = currentUser.mspId === "VetMSP";

  if (!isOpen) return null;

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
    return `${d.getFullYear()}-${months[d.getMonth()]}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "valid" || s === "cleared" || s === "completed") {
      return { label: "CLEARED", className: "bg-tertiary-fixed text-on-tertiary-fixed-variant" };
    }
    if (s === "monitoring" || s === "pending") {
      return { label: "MONITORING", className: "bg-secondary-container text-on-secondary-container" };
    }
    if (s === "invalid" || s === "alert" || s === "expired") {
      return { label: "ALERT", className: "bg-error-container text-on-error-container" };
    }
    return { label: status || "—", className: "bg-surface-container-highest text-on-surface-variant" };
  };

  const statusCounts = (healthLogs || []).reduce((acc, log) => {
    const badge = getStatusBadge(log.status);
    acc[badge.label] = (acc[badge.label] || 0) + 1;
    return acc;
  }, {});

  const lastScreeningDate = (healthLogs || []).length > 0 
    ? formatDate(healthLogs[0]?.date)
    : "—";

  const handleHealthLogSubmit = async () => {
    if (!healthLogForm.name.trim()) return alert("Procedure name/description is required");

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("batchId", selectedAnimal?.batchId || selectedAnimal?._id);
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

      alert("Medical record added to digital log!");
      
      // Reset form and close modal so caller can refresh data naturally
      setHealthLogForm({
        type: "Vaccination",
        name: "",
        notes: "",
        nextDueDate: "",
        proofFile: null,
      });
      setIsAddingMode(false);
      onClose();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsAddingMode(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-md" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0, 0, 0, 0.4)' }}>
      <div className="bg-surface w-full max-w-5xl max-h-[85vh] flex flex-col shadow-[0_2px_4px_rgba(28,43,58,0.08)] border border-outline-variant relative">
        
        {/* ── HEADER ── */}
        <div className="px-lg py-md border-b border-outline-variant bg-surface flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="font-display text-headline-md text-primary uppercase tracking-tight">
              {isAddingMode ? "New Medical Entry" : "Medical History"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-label-caps bg-surface-container-highest px-2 py-0.5 text-on-surface-variant uppercase">
                SUBJECT ID
              </span>
              <span className="font-mono text-data-mono text-primary font-bold">
                {selectedAnimal?.batchId || selectedAnimal?._id || "—"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-xs">
            {!isAddingMode && (
              <button className="flex items-center justify-center w-10 h-10 hover:bg-surface-container-high transition-colors text-outline">
                <span className="material-symbols-outlined">print</span>
              </button>
            )}
            <button
              onClick={handleClose}
              className="flex items-center justify-center w-10 h-10 hover:bg-error-container hover:text-error transition-colors text-outline"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* ── DASHBOARD BODY ── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Summary Tape */}
          <div className="grid grid-cols-4 border-b border-outline-variant bg-surface-container-low">
            <div className="p-md border-r border-outline-variant">
              <p className="font-mono text-label-caps text-outline mb-1 uppercase">Specie / Breed</p>
              <p className="font-body text-body-md font-semibold">
                {selectedAnimal?.species || "—"}
              </p>
            </div>
            <div className="p-md border-r border-outline-variant">
              <p className="font-mono text-label-caps text-outline mb-1 uppercase">Current Status</p>
              {healthLogs && healthLogs.length > 0 ? (
                <span className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded-sm tracking-wider ${getStatusBadge(healthLogs[0]?.status).className}`}>
                  {getStatusBadge(healthLogs[0]?.status).label}
                </span>
              ) : (
                <span className="font-mono text-data-mono text-on-surface-variant">—</span>
              )}
            </div>
            <div className="p-md border-r border-outline-variant">
              <p className="font-mono text-label-caps text-outline mb-1 uppercase">Last Screening</p>
              <p className="font-mono text-data-mono">{lastScreeningDate}</p>
            </div>
            <div className="p-md">
              <p className="font-mono text-label-caps text-outline mb-1 uppercase">Facility Loc</p>
              <p className="font-body text-body-md font-semibold">
                {selectedAnimal?.location || "ADTS Regional Hub"}
              </p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto p-lg" style={{ scrollbarWidth: 'thin', scrollbarColor: '#bec8cb #f7f9ff' }}>
            {isAddingMode ? (
              /* --- NEW ENTRY FORM --- */
              <div className="max-w-2xl mx-auto bg-surface-container-lowest border border-outline-variant p-lg space-y-md shadow-sm">
                <div className="grid grid-cols-2 gap-md">
                  <div>
                    <label className="block font-mono text-label-caps text-outline uppercase mb-2">Record Type</label>
                    <select
                      value={healthLogForm.type}
                      onChange={(e) => setHealthLogForm({ ...healthLogForm, type: e.target.value })}
                      className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body text-body-md p-2 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    >
                      <option>Vaccination</option>
                      <option>Deworming</option>
                      <option>Lab Test</option>
                      <option>Vitamin</option>
                      <option>VHC Issuance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-mono text-label-caps text-outline uppercase mb-2">Next Due (Opt)</label>
                    <input
                      type="date"
                      value={healthLogForm.nextDueDate}
                      onChange={(e) => setHealthLogForm({ ...healthLogForm, nextDueDate: e.target.value })}
                      className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body text-body-md p-2 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-label-caps text-outline uppercase mb-2">Name / Description</label>
                  <input
                    type="text"
                    placeholder="e.g. FMD Viral RNA Screening"
                    value={healthLogForm.name}
                    onChange={(e) => setHealthLogForm({ ...healthLogForm, name: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body text-body-md p-2 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div>
                  <label className="block font-mono text-label-caps text-outline uppercase mb-2">Observations & Notes</label>
                  <textarea
                    placeholder="Enter clinical observations..."
                    value={healthLogForm.notes}
                    onChange={(e) => setHealthLogForm({ ...healthLogForm, notes: e.target.value })}
                    className="w-full bg-surface-container-lowest border border-outline-variant text-on-surface font-body text-body-md p-2 rounded h-24 resize-none outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  />
                </div>

                <div className="bg-surface-container-low p-md border border-outline-variant">
                  <label className="block font-mono text-label-caps text-outline uppercase mb-3 text-center">Upload Proof (Optional)</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-24 border border-outline-variant border-dashed cursor-pointer bg-surface-container-lowest hover:bg-surface-container-high transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <span className="material-symbols-outlined text-outline mb-2">upload_file</span>
                        <p className="mb-1 text-xs text-on-surface-variant font-body">
                          <span className="font-bold text-primary">Click to upload</span> or drag and drop
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf"
                        onChange={(e) => setHealthLogForm({ ...healthLogForm, proofFile: e.target.files[0] })}
                      />
                    </label>
                  </div>
                  {healthLogForm.proofFile && (
                    <p className="text-xs text-tertiary font-bold mt-3 text-center flex items-center justify-center gap-1 bg-tertiary-fixed py-2 rounded-sm border border-tertiary-fixed-dim">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      {healthLogForm.proofFile.name}
                    </p>
                  )}
                </div>
              </div>
            ) : healthLoading ? (
              /* --- LOADING STATE --- */
              <div className="flex flex-col items-center py-20">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                <p className="font-mono text-label-caps text-on-surface-variant uppercase">
                  Loading medical data...
                </p>
              </div>
            ) : !healthLogs || healthLogs.length === 0 ? (
              /* --- EMPTY STATE --- */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-outline text-5xl mb-4 opacity-30">clinical_notes</span>
                <p className="font-display text-headline-md font-bold text-on-surface-variant mb-1">No Medical Records Found</p>
                <p className="font-body text-body-md text-on-surface-variant">
                  This asset has no recorded vaccinations, deworming, or tests.
                </p>
              </div>
            ) : (
              /* --- TABLE DATA --- */
              <div className="border border-outline-variant bg-surface-container-lowest">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-surface-container-high border-b border-outline-variant">
                      <th className="px-md py-3 font-mono text-label-caps text-on-surface-variant border-r border-outline-variant uppercase">Date</th>
                      <th className="px-md py-3 font-mono text-label-caps text-on-surface-variant border-r border-outline-variant uppercase">Procedure / Test</th>
                      <th className="px-md py-3 font-mono text-label-caps text-on-surface-variant border-r border-outline-variant uppercase">Clinician</th>
                      <th className="px-md py-3 font-mono text-label-caps text-on-surface-variant border-r border-outline-variant uppercase w-32 text-center">Outcome</th>
                      <th className="px-md py-3 font-mono text-label-caps text-on-surface-variant uppercase">Observations & Notes</th>
                    </tr>
                  </thead>
                  <tbody className="font-body text-body-md divide-y divide-outline-variant">
                    {healthLogs.map((log, i) => {
                      const badge = getStatusBadge(log.status);
                      return (
                        <tr
                          key={i}
                          className={`hover:bg-surface-container transition-colors ${i % 2 !== 0 ? 'bg-surface-container-low' : ''}`}
                        >
                          <td className="px-md py-4 font-mono text-data-mono border-r border-outline-variant whitespace-nowrap">
                            {formatDate(log.date)}
                          </td>
                          <td className="px-md py-4 font-semibold border-r border-outline-variant">
                            {log.name || log.type || "—"}
                            {log.isInherited && (
                              <span className="ml-2 font-mono text-[9px] bg-surface-container-highest text-on-surface-variant px-1.5 py-0.5 rounded uppercase">
                                Inherited
                              </span>
                            )}
                          </td>
                          <td className="px-md py-4 border-r border-outline-variant whitespace-nowrap">
                            {log.vetUsername || "—"}
                          </td>
                          <td className="px-md py-4 border-r border-outline-variant text-center">
                            <span className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded-sm tracking-wider ${badge.className}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-md py-4 text-on-surface-variant italic text-body-md">
                            {log.notes || "No additional notes provided."}
                            {log.proofUrl && (
                              <a
                                href={log.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 font-mono text-label-caps text-primary hover:underline not-italic"
                              >
                                <span className="material-symbols-outlined text-[12px]">attach_file</span>
                                View Proof
                              </a>
                            )}
                            {log.nextDueDate && (
                              <div className="mt-2 font-mono text-[10px] text-secondary not-italic">
                                <span className="material-symbols-outlined text-[12px] align-middle mr-1">event</span>
                                Next Due: {formatDate(log.nextDueDate)}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── FOOTER ── */}
          <div className="px-lg py-md border-t border-outline-variant bg-surface flex justify-between items-center">
            <div className="flex gap-lg">
              {!isAddingMode ? (
                <>
                  {statusCounts["CLEARED"] > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-tertiary rounded-full"></span>
                      <span className="font-mono text-label-caps text-on-surface-variant uppercase">{statusCounts["CLEARED"]} CLEARED</span>
                    </div>
                  )}
                  {statusCounts["MONITORING"] > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-secondary rounded-full"></span>
                      <span className="font-mono text-label-caps text-on-surface-variant uppercase">{statusCounts["MONITORING"]} MONITORING</span>
                    </div>
                  )}
                  {statusCounts["ALERT"] > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-error rounded-full"></span>
                      <span className="font-mono text-label-caps text-on-surface-variant uppercase">{statusCounts["ALERT"]} ALERT</span>
                    </div>
                  )}
                  {Object.keys(statusCounts).length === 0 && (
                    <span className="font-mono text-label-caps text-on-surface-variant uppercase">No entries</span>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  <span className="font-mono text-label-caps text-on-surface-variant uppercase">CLINICAL DATA ENTRY MODE</span>
                </div>
              )}
            </div>
            <div className="flex gap-md">
              {isAddingMode ? (
                <>
                  <button
                    onClick={() => setIsAddingMode(false)}
                    disabled={submitting}
                    className="px-lg py-xs border border-outline-variant font-mono text-label-caps text-on-surface hover:bg-surface-container-low transition-colors uppercase disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleHealthLogSubmit}
                    disabled={submitting}
                    className="px-lg py-xs bg-primary text-on-primary font-mono text-label-caps hover:brightness-110 transition-all flex items-center gap-2 uppercase disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="w-4 h-4 border-2 border-on-primary/20 border-t-on-primary rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-[14px]">save</span>
                    )}
                    {submitting ? "Saving..." : "Save Record"}
                  </button>
                </>
              ) : (
                <>
                  <button className="px-lg py-xs border border-outline-variant font-mono text-label-caps text-on-surface hover:bg-surface-container-low transition-colors uppercase">
                    Export CSV
                  </button>
                  {isVet && (
                    <button
                      onClick={() => setIsAddingMode(true)}
                      className="px-lg py-xs bg-primary text-on-primary font-mono text-label-caps hover:brightness-110 transition-all flex items-center gap-2 uppercase"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      New Entry
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
