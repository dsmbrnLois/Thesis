import React, { useState, useEffect } from "react";
import axios from "axios";

export default function VetProfile() {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    contactNumber: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("user"));
      const username = savedUser?.username || savedUser?.email;
      const response = await axios.get(`http://localhost:3001/api/profile/${username}`);
      
      setProfile(response.data);
      setFormData({
        contactNumber: response.data.contactNumber || ""
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
      const res = await axios.put(
        `http://localhost:3001/api/profile/update/${profile.username}`, 
        { contactNumber: formData.contactNumber }
      );
      setProfile(res.data.user);
      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (err) {
      alert("Update failed. Check server connection.");
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Banner / Avatar Section */}
        <div className="h-40 bg-gradient-to-br from-slate-800 to-slate-900 relative">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center text-5xl font-black text-slate-800 border-4 border-white">
            {profile?.firstName?.[0] || "V"}
          </div>
        </div>

        <div className="pt-20 pb-12 px-6 sm:px-12">
          {/* Name & Username */}
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
              {isEditing ? "Edit Profile" : `Dr. ${profile?.firstName} ${profile?.lastName}`}
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500 uppercase tracking-widest">
              @{profile?.username}
            </p>
          </div>

          <div className="space-y-6">
            {isEditing ? (
              <div className="space-y-5 bg-slate-50/70 p-6 rounded-2xl border border-slate-100">
                {/* Information Header */}
                <div className="text-center py-3 bg-white rounded-xl border border-dashed border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                    System Identity (Locked)
                  </p>
                  <p className="text-sm font-bold text-slate-500 italic">
                    Location: Barangay {profile?.barangay}
                  </p>
                </div>

                {/* Editable Contact Only */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">
                    Contact Number
                  </label>
                  <input 
                    maxLength="11"
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-medium text-slate-700 outline-none focus:border-slate-800 focus:ring-2 focus:ring-slate-800/20 transition-all"
                    value={formData.contactNumber}
                    onChange={(e) => setFormData({ contactNumber: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100 space-y-6">
                <DisplayRow label="Office Contact" value={profile?.contactNumber || "—"} icon="📞" />
                <DisplayRow label="Office Location" value={`Brgy. ${profile?.barangay}`} icon="🏛️" />
                <DisplayRow label="License Status" value="Verified City Vet" icon="🛡️" color="text-blue-600" />
                <DisplayRow label="Organization" value={profile?.mspId || "VetMSP"} icon="🏢" />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            {isEditing ? (
              <>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm uppercase tracking-wider shadow-lg transition-all active:scale-95"
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-sm uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full py-5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl text-sm uppercase tracking-wider shadow-xl shadow-slate-900/10 transition-all active:scale-95"
              >
                Edit Profile Info
              </button>
            )}
          </div>
        </div>
      </div>
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