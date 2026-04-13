import { useState, useEffect } from "react";

export default function AdminAlert() {
  const [targetBarangay, setTargetBarangay] = useState("All");
  const [isSending, setIsSending] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [history, setHistory] = useState([]);
  
  const [formData, setFormData] = useState({
    title: "",
    severity: "Advisory",
    species: "All Species",
    instruction: "",
    description: ""
  });

  const VALID_BARANGAYS = ["All", "Aplaya", "Balibago", "Caingin", "Dila", "Dita", "Don Jose", "Ibaba", "Kanluran", "Labas", "Macabling", "Malitlit", "Malusak", "Market Area", "Pooc", "Pulong Santa Cruz", "Santo Domingo", "Sinalhan", "Tagapo"];

  const fetchAlertHistory = async () => {
    try {
      const response = await fetch("http://localhost:3001/api/alert-history");
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  useEffect(() => {
    fetchAlertHistory();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this record from the logs?")) return;

    try {
      const response = await fetch(`http://localhost:3001/api/delete-alert/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setHistory(prev => prev.filter(item => item._id !== id));
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.error || "Failed to delete record."}`);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Connection Error: Could not reach the server.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      alert("Please fill in at least the Title and Description.");
      return;
    }

    const confirmBroadcast = window.confirm(
      `Confirm: Send ${formData.severity} alert to ${targetBarangay === "All" ? "ALL barangays" : "Brgy. " + targetBarangay}?`
    );
    if (!confirmBroadcast) return;

    setIsSending(true);

    const fullMessage = `
      [${formData.severity.toUpperCase()}] ${formData.title}
      Affected: ${formData.species}
      Location: ${targetBarangay}
      Details: ${formData.description}
      Instruction: ${formData.instruction}
    `.trim();

    try {
      const response = await fetch("http://localhost:3001/api/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: fullMessage,
          targetBarangay: targetBarangay,
          metadata: { ...formData }
        }),
      });

      if (response.ok) {
        alert("✅ Success! Alert broadcasted to the community.");
        setFormData({ title: "", severity: "Advisory", species: "All Species", instruction: "", description: "" });
        fetchAlertHistory(); 
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.error || "Failed to send alert"}`);
      }
    } catch (err) {
      console.error("Alert Error:", err);
      alert("Connection Error: Is your backend running?");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-6 lg:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* CENTERED HEADER */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">
            Broadcast Alert System
          </h1>
          <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mt-1">
            Official Veterinary Alert Control
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* LEFT: TEMPLATE EDITOR (FORM) */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 lg:p-10">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">1. Configure Template</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Severity</label>
                  <select name="severity" value={formData.severity} onChange={handleInputChange} 
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                    <option value="Advisory">🟢 Advisory</option>
                    <option value="Warning">🟠 Warning</option>
                    <option value="Critical">🔴 Critical</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Area Scope</label>
                  <select value={targetBarangay} onChange={(e) => setTargetBarangay(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                    {VALID_BARANGAYS.map(b => <option key={b} value={b}>{b === "All" ? "Citywide" : b}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Alert Title</label>
                <input name="title" value={formData.title} onChange={handleInputChange} placeholder="Header of the alert"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500" required />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Species</label>
                <input name="species" value={formData.species} onChange={handleInputChange} placeholder="e.g. Hogs, Poultry"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Details</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" required
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold outline-none resize-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Instruction</label>
                <input name="instruction" value={formData.instruction} onChange={handleInputChange} placeholder="Required action"
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>

              <button type="submit" disabled={isSending}
                className={`w-full py-4 text-white rounded-xl font-black transition-all active:scale-[0.98] shadow-xl shadow-emerald-200 uppercase tracking-widest text-sm ${isSending ? 'bg-slate-400' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {isSending ? "Sending..." : "Broadcast Report"}
              </button>
            </form>
          </div>

          {/* RIGHT SIDE: PREVIEW & HISTORY */}
          <div className="space-y-8">
            {/* LIVE PREVIEW FLASHCARD */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">2. Live Preview</h3>
              <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-2 ${
                  formData.severity === 'Critical' ? 'bg-red-500' : formData.severity === 'Warning' ? 'bg-orange-500' : 'bg-emerald-500'
                }`} />
                
                <div className="flex justify-between items-start mb-6">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                    formData.severity === 'Critical' ? 'bg-red-50 text-red-600' : 
                    formData.severity === 'Warning' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {formData.severity}
                  </span>
                  <p className="text-[10px] font-bold text-slate-300">PREVIEW MODE</p>
                </div>

                <h2 className="text-2xl font-black text-slate-800 mb-6">{formData.title || "Untitled Report"}</h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Target</p>
                    <p className="font-black text-slate-700">{formData.species}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Location</p>
                    <p className="font-black text-slate-700">{targetBarangay}</p>
                  </div>
                </div>

                <p className="text-slate-600 font-medium leading-relaxed mb-6 italic">
                  "{formData.description || "Waiting for details..."}"
                </p>

                {formData.instruction && (
                  <div className="bg-slate-900 p-4 rounded-xl flex items-center gap-3 text-white">
                    <span className="text-xl">⚡</span>
                    <p className="text-xs font-bold uppercase tracking-tight">{formData.instruction}</p>
                  </div>
                )}
              </div>
            </div>

            {/* HISTORY FLASHCARD */}
            <div className="flex-1">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">3. System Logs</h3>
              <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 flex flex-col justify-between items-center h-[240px]">
                <div className="text-center pt-4">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="font-black text-slate-800 text-xl uppercase tracking-tight">Recent Broadcasts</p>
                  <p className="text-slate-400 text-xs font-medium">Archived logs and status reports</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsHistoryModalOpen(true)}
                  className="w-full py-4 bg-slate-50 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-slate-100 mb-4">
                  View Full History
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* MODAL FOR HISTORY ALERT LOGS (ADMIN VIEW) */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setIsHistoryModalOpen(false)}
          />

          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden border border-slate-100">
            {/* Modal Header */}
            <div className="px-7 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight uppercase">
                  Alert Archive
                </h2>
                <p className="text-sm text-red-600 mt-1 font-bold uppercase tracking-wider">
                  Management & Transmission Logs
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 bg-slate-50/40">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <p className="text-slate-400 font-medium text-lg">No broadcasts found.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {history.map((item) => (
                    <div
                      key={item._id}
                      className="relative bg-white rounded-[1.75rem] border border-slate-200/60 p-5 sm:p-6 hover:shadow-xl transition-all duration-300 flex flex-col gap-4 group"
                    >
                      {/* Status Indicator Line */}
                      <div className={`absolute left-0 top-6 bottom-6 w-1 rounded-r-full ${
                        item.severity === 'Critical' ? 'bg-red-500' : 
                        item.severity === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />

                      {/* Header Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                            item.severity === 'Critical' ? 'bg-red-600 text-white' : 
                            item.severity === 'Warning' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                          }`}>
                            {item.severity}
                          </span>
                          <time className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </time>
                        </div>
                        
                        {/* METADATA SECTION: Includes Species, Location, and Barangay */}
                        <div className="flex flex-col gap-1 text-[10px] font-bold self-start sm:self-auto">
                          <div className="text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                            {item.species} • {item.location}
                          </div>
                          <div className="px-3">
                            <span className="text-slate-400">Barangay:</span> 
                            <span className="text-slate-900 font-bold ml-1">{item.targetBarangay}</span>
                          </div>
                        </div>
                      </div>

                      {/* Title & Body */}
                      <div className="pr-12"> {/* Added padding-right to avoid delete button overlap */}
                        <h4 className="text-xl font-black text-slate-900 leading-tight mb-2 uppercase tracking-tight">
                          {item.title}
                        </h4>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4">
                          {item.details || item.description}
                        </p>

                        {item.instruction && (
                          <div className={`p-4 rounded-xl border-l-4 ${
                            item.severity === 'Critical' ? 'bg-red-50 border-red-500 text-red-900' : 
                            item.severity === 'Warning' ? 'bg-amber-50 border-amber-500 text-amber-900' : 'bg-emerald-50 border-emerald-500 text-emerald-900'
                          }`}>
                            <p className="text-[10px] font-black uppercase tracking-[0.1em] mb-1">Required Action:</p>
                            <p className="text-xs font-bold leading-snug">
                              {item.instruction}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* DELETE ACTION - Positioned absolutely inside card */}
                      <button 
                        onClick={() => handleDelete(item._id)}
                        className="absolute top-6 right-6 p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all opacity-0 group-hover:opacity-100 border border-transparent hover:border-red-100"
                        title="Delete Log"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-5 border-t border-slate-100 text-center bg-white">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                End of Logs • {history.length} Record{history.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}