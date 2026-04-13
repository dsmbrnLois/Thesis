// src/components/common/MedicalLogModal.jsx
import React from "react";

export default function MedicalLogModal({
  isOpen,
  onClose,
  healthLoading,
  healthLogs,
  selectedAnimal,
}) {
  if (!isOpen) return null;

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-8 border-b border-blue-100 flex justify-between items-center bg-blue-50 sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-black text-blue-900 flex items-center gap-3">
              <span className="text-3xl">🩺</span> Official Medical Log
            </h3>
            {selectedAnimal && (
              <p className="text-blue-600 text-sm font-bold uppercase tracking-tighter mt-1">
                {selectedAnimal.batchId || "Legacy Record"} |{" "}
                {selectedAnimal.species}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors font-bold shadow-sm"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-8 overflow-y-auto bg-slate-50/30 flex-1">
          {healthLoading ? (
            <div className="flex flex-col items-center py-20">
              <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-medium">
                Loading medical data...
              </p>
            </div>
          ) : healthLogs.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4 opacity-30">📋</div>
              <p className="text-slate-600 font-bold text-lg">
                No Medical Records Found
              </p>
              <p className="text-sm text-slate-400 mt-2">
                This asset has no recorded vaccinations, deworming, or tests.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <th className="py-4 px-6 w-1/6">Date</th>
                    <th className="py-4 px-6 w-1/6">Type</th>
                    <th className="py-4 px-6 w-2/6">Description & Notes</th>
                    <th className="py-4 px-6 w-1/6">Next Due</th>
                    <th className="py-4 px-6 w-1/6">Administered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {healthLogs.map((log, i) => (
                    <tr
                      key={i}
                      className={`transition-colors group ${log.isInherited ? "bg-slate-50/50 hover:bg-slate-100/50" : "hover:bg-blue-50/30"}`}
                    >
                      {/* Date */}
                      <td className="py-5 px-6 align-top">
                        <span
                          className={`font-bold block ${log.isInherited ? "text-slate-500" : "text-slate-700"}`}
                        >
                          {formatDate(log.date)}
                        </span>
                        <div
                          className={`mt-2 text-[10px] font-bold px-2 py-1 rounded inline-block ${log.status === "Valid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                        >
                          {log.status}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-5 px-6 align-top">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest border px-3 py-1.5 rounded-lg whitespace-nowrap block w-fit ${log.isInherited ? "text-slate-500 bg-slate-100 border-slate-200" : "text-blue-600 bg-blue-50 border-blue-100"}`}
                        >
                          {log.type}
                        </span>
                        {/* THE INHERITED TAG */}
                        {log.isInherited && (
                          <span className="mt-2 text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full block w-fit">
                            Inherited
                          </span>
                        )}
                      </td>

                      {/* Description & Notes */}
                      <td className="py-5 px-6 align-top">
                        <h4
                          className={`font-bold text-sm mb-1 ${log.isInherited ? "text-slate-600" : "text-slate-800"}`}
                        >
                          {log.name}
                        </h4>
                        {log.notes ? (
                          <p className="text-xs text-slate-500 italic leading-relaxed">
                            "{log.notes}"
                          </p>
                        ) : (
                          <p className="text-xs text-slate-300 italic">
                            No additional notes provided.
                          </p>
                        )}

                        {/* Proof of Vaccination */}
                        {log.proofUrl && (
                          <a
                            href={log.proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={`mt-3 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded ${log.isInherited ? "text-slate-500 hover:text-slate-700 bg-slate-100" : "text-blue-500 hover:text-blue-700 bg-blue-50"}`}
                          >
                            📎 View Attached Proof
                          </a>
                        )}
                      </td>

                      {/* Next Due */}
                      <td className="py-5 px-6 align-top">
                        {log.nextDueDate ? (
                          <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            {formatDate(log.nextDueDate)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">-</span>
                        )}
                      </td>

                      {/* Administered By */}
                      <td className="py-5 px-6 align-top">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${log.isInherited ? "bg-slate-200 text-slate-400" : "bg-blue-100 text-blue-600"}`}
                          >
                            V
                          </div>
                          <span
                            className={`text-sm font-medium ${log.isInherited ? "text-slate-500" : "text-slate-700"}`}
                          >
                            {log.vetUsername}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
