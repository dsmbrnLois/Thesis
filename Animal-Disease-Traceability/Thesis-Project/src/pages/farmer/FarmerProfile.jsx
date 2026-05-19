import React, { useState, useEffect } from "react";
import API_URL from "../../config/api";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";

export default function FarmerProfile() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    contactNumber: "",
    farmName: ""
  });

  const farmTypes = [
    "Piggeries", "Poultry farm", "Beef cattle farm", "Sheep farm", "Goat farm"
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("user"));
      const username = savedUser?.username || savedUser?.email;
      const response = await axios.get(`${API_URL}/profile/${username}`);
      
      setProfile(response.data);
      setFormData({
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        contactNumber: response.data.contactNumber,
        farmName: response.data.farmName || ""
      });
    } catch (err) {
      console.error("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!/^\d{11}$/.test(formData.contactNumber)) {
      alert("Contact number must be exactly 11 digits.");
      return;
    }

    try {
      const res = await axios.put(`${API_URL}/profile/update/${profile.username}`, {
        contactNumber: formData.contactNumber,
        farmName: formData.farmName
      });
      setProfile(res.data.user);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Update failed. Check server connection.");
    }
  };

  // Logic to format the QR text for a clean phone alert
  const getQRValue = () => {
    if (!profile) return "";
    return `ANIMAL TRACEABILITY ID\n\n` +
           `Name: ${profile.firstName} ${profile.lastName}\n` +
           `Username: ${profile.username}\n` +
           `Barangay: ${profile.barangay}\n` +
           `Contact: ${profile.contactNumber}\n` +
           `Farm Type: ${profile.farmName || "Not Set"}\n` +
           `Organization: ${profile.mspId || "Verified User"}`;
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-[var(--green)] rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Banner / Avatar Section */}
        <div className="h-40 bg-gradient-to-br from-[var(--green)] to-emerald-600 relative">
          
          {/* QR BUTTON */}
          <button 
            onClick={() => setShowQR(true)}
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-xl border border-white/30 transition-all active:scale-95 text-xl"
            title="Show QR ID"
          >
            📱
          </button>

          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-5xl font-black text-[var(--green)] border-4 border-white">
            {profile?.firstName?.[0] || "?"}
          </div>
        </div>

        <div className="pt-20 pb-12 px-6 sm:px-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
              {isEditing ? "Edit Profile" : `${profile?.firstName || ""} ${profile?.lastName || ""}`}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              @{profile?.username || "loading..."}
            </p>
          </div>

          <div className="space-y-6">
            {isEditing ? (
              <div className="space-y-5 bg-slate-50/70 p-6 rounded-2xl border border-slate-100">
                <div className="text-center py-3 bg-white rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
                    Registered Name (cannot change)
                  </p>
                  <p className="text-lg font-semibold text-slate-700">
                    {profile?.firstName} {profile?.lastName}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Contact Number
                  </label>
                  <input 
                    maxLength="11"
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/20 transition-all"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({...formData, contactNumber: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Farm Category
                  </label>
                  <select 
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none focus:border-[var(--green)] focus:ring-2 focus:ring-[var(--green)]/20 transition-all"
                    value={formData.farmName}
                    onChange={(e) => setFormData({...formData, farmName: e.target.value})}
                  >
                    <option value="" disabled>Select specialization</option>
                    {farmTypes.map(ft => (
                      <option key={ft} value={ft}>{ft}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 space-y-6">
                <DisplayRow label="Contact" value={profile?.contactNumber || "—"} icon="📞" />
                <DisplayRow label="Barangay" value={profile?.barangay || "—"} icon="🏛️" />
                <DisplayRow label="Farm Type" value={profile?.farmName || "Not Set"} icon="🚜" />
                <DisplayRow label="Organization" value={profile?.mspId || "—"} icon="🛡️" color="text-emerald-600" />
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            {isEditing ? (
              <>
                <button onClick={handleSave} className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm uppercase tracking-wider shadow-lg transition-all active:scale-95">
                  Save Changes
                </button>
                <button onClick={() => setIsEditing(false)} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-sm uppercase tracking-wider transition-all">
                  Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)} className="w-full py-5 bg-[var(--green)] hover:brightness-110 text-white font-bold rounded-2xl text-sm uppercase tracking-wider shadow-xl shadow-green-900/10 transition-all active:scale-95">
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* --- QR MODAL --- */}
      {showQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl text-center relative">
            <button 
              onClick={() => setShowQR(false)} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 text-2xl font-bold"
            >
              &times;
            </button>
            
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">User ID Pass</h3>
            
            <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed border-slate-200 flex justify-center mb-6">
              <QRCodeCanvas 
                value={getQRValue()} // Plain text instead of JSON
                size={200}
                level={"H"}
                includeMargin={true}
              />
            </div>

            <div className="space-y-1">
              <p className="text-lg font-bold text-slate-800">{profile?.firstName} {profile?.lastName}</p>
              <p className="text-xs font-black text-[var(--green)] uppercase tracking-widest">{profile?.mspId || "Verified User"}</p>
            </div>

            <button 
              onClick={() => setShowQR(false)}
              className="mt-8 w-full py-4 bg-slate-900 text-white font-bold rounded-2xl text-xs uppercase tracking-widest hover:bg-black transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const DisplayRow = ({ label, value, icon, color = "text-slate-700" }) => (
  <div className="flex justify-between items-center py-3 border-b border-slate-100 last:border-0">
    <div className="flex items-center gap-4">
      <span className="text-xl opacity-60">{icon}</span>
      <span className="text-sm font-semibold text-slate-600">{label}</span>
    </div>
    <span className={`text-base font-bold ${color}`}>{value}</span>
  </div>
);