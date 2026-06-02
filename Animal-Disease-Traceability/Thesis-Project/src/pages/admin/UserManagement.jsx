import React, { useState, useEffect, useMemo } from "react";
import { fetchUsers, registerUser } from "../../config/api";
import { useNavigate } from "react-router-dom";

export default function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("All");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoading(false);
    }
  };

  const maskEmail = (email) => {
    if (!email) return "N/A";
    const [namePart, domain] = email.split("@");
    if (!domain) return email;
    if (namePart.length <= 2) return `${namePart[0]}***@${domain}`;
    return `${namePart[0]}${"*".repeat(namePart.length - 2)}${namePart[namePart.length - 1]}@${domain}`;
  };

  const processedUsers = useMemo(() => {
    return users.filter((user) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        (user.firstName || "").toLowerCase().includes(query) ||
        (user.lastName || "").toLowerCase().includes(query) ||
        (user.email || "").toLowerCase().includes(query);

      const matchesRole = filterRole === "All" || user.role === filterRole;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, filterRole]);

  return (
    <div className="p-6 md:p-10 min-h-screen w-full font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            Stakeholder Management
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Manage users, permissions, and network access.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[var(--green)] text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition font-bold shadow-md shadow-emerald-200 flex items-center gap-2 active:scale-95"
        >
          <span>+</span> Add New User
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row justify-between gap-4 items-center">
          <div className="relative w-full lg:w-96">
            <span className="absolute left-4 top-3 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--green)] font-medium text-sm shadow-sm transition-all"
            />
          </div>

          <div className="flex gap-3 w-full lg:w-auto">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="flex-1 lg:w-56 bg-white border border-slate-200 text-slate-700 py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-[var(--green)] font-medium text-sm shadow-sm cursor-pointer"
            >
              <option value="All">All Roles</option>
              <option value="Farmer">Farmers</option>
              <option value="Veterinarian">Veterinarians</option>
              <option value="Regulator">Regulators</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-slate-400 font-medium">
              Loading network stakeholders...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-5 px-6 pl-8">Account Details</th>
                  <th className="py-5 px-6">Role / Access</th>
                  <th className="py-5 px-6">Location</th>
                  <th className="py-5 px-6">Created By</th>
                  <th className="py-5 px-6">Joined Date</th>
                  <th className="py-5 px-6 text-right">Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {processedUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-16 text-center">
                      <div className="text-4xl mb-3 opacity-30">👥</div>
                      <p className="text-slate-500 font-bold text-lg">
                        No users found
                      </p>
                      <p className="text-slate-400 text-sm mt-1">
                        Try adjusting your search or filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  processedUsers.map((user) => (
                    <tr
                      key={user._id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="py-4 px-6 pl-8">
                        <div className="font-bold text-slate-800 text-base">
                          {user.firstName} {user.lastName}
                        </div>
                        <div
                          className="text-xs text-slate-500 font-mono mt-0.5"
                          title="Email is masked for privacy"
                        >
                          {maskEmail(user.email)}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border
                          ${
                            user.role === "Farmer"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : user.role === "Veterinarian"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-slate-600">
                        {user.barangay}
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                          {user.createdBy || "Self-Registered"}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-slate-400 font-medium text-xs">
                        {new Date(user.createdAt).toLocaleDateString(
                          undefined,
                          { year: "numeric", month: "short", day: "numeric" },
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowViewModal(true);
                          }}
                          className="bg-[var(--green)] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition shadow-md shadow-emerald-200 active:scale-95"
                        >
                          View Info
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadUsers();
          }}
        />
      )}

      {showViewModal && selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          onClose={() => {
            setSelectedUser(null);
            setShowViewModal(false);
          }} 
        />
      )}
    </div>
  );
}

function AddUserModal({ onClose, onSuccess }) {
  const storedUser = localStorage.getItem("user");
  let adminName = "Admin";

  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      const profile = u.user || u;
      if (profile.firstName) {
        adminName = `Admin: ${profile.firstName} ${profile.lastName}`;
      }
    } catch (e) {
      console.error("Error parsing user from local storage", e);
    }
  }

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    password: "",
    confirmPassword: "",
    role: "Farmer",
    barangay: "Aplaya",
    farmName: "", // still using farmName as the field name (backend compatibility)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const barangays = [
    "Aplaya",
    "Balibago",
    "Caingin",
    "Dila",
    "Dita",
    "Don Jose",
    "Ibaba",
    "Kanluran",
    "Labas",
    "Macabling",
    "Malitlit",
    "Malusak",
    "Market Area",
    "Pooc",
    "Pulong Santa Cruz",
    "Santo Domingo",
    "Sinalhan",
    "Tagapo",
  ];

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const orgMap = {
        Farmer: "FarmerOrg",
        Veterinarian: "VetOrg",
        Regulator: "RegulatorOrg",
      };

      const payload = {
        username: formData.email,
        org: orgMap[formData.role] || "FarmerOrg",
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        contactNumber: formData.contactNumber,
        password: formData.password,
        role: formData.role,
        barangay: formData.barangay,
        farmName: formData.farmName,
        createdBy: adminName,
      };

      await registerUser(payload);
      alert(`Success! Account created for ${formData.firstName}.`);
      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in zoom-in duration-200 p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
          <h2 className="text-xl font-black text-slate-800">
            Register New Stakeholder
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-8 overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[var(--green)] font-medium transition-colors"
                  onChange={handleChange}
                />
              </div>
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[var(--green)] font-medium transition-colors"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[var(--green)] font-medium transition-colors"
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Contact Number
              </label>
              <input
                type="text"
                name="contactNumber"
                placeholder="e.g. 09123456789"
                maxLength="11"
                required
                className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[var(--green)] font-medium transition-colors"
                onChange={handleChange}
              />
            </div>

            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Network Role
                </label>
                <select
                  name="role"
                  className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[var(--green)] font-bold text-slate-700 transition-colors"
                  onChange={handleChange}
                  value={formData.role}
                >
                  <option value="Farmer">Farmer</option>
                  <option value="Veterinarian">Veterinarian</option>
                  <option value="Regulator">Regulator</option>
                </select>
              </div>
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Barangay
                </label>
                <select
                  name="barangay"
                  className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[var(--green)] font-bold text-slate-700 transition-colors"
                  onChange={handleChange}
                  value={formData.barangay}
                >
                  {barangays.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.role === "Farmer" && (
              <div className="animate-fade-in-down">
                <label className="block text-sm font-medium text-gray-700 mb-1">Farm Type</label>
                <select
                  name="farmName"
                  required
                  className="w-full p-3 border border-gray-300 rounded-lg bg-green-50"
                  onChange={handleChange}
                  value={formData.farmName}
                >
                  <option value="" disabled>Select farm type</option>
                  <option value="Piggeries">Piggeries</option>
                  <option value="Poultry farm">Poultry farm</option>
                  <option value="Beef cattle farm">Beef cattle farm</option>
                  <option value="Sheep farm">Sheep farm</option>
                  <option value="Goat farm">Goat farm</option>
                </select>
                <p className="text-xs text-gray-500 mt-1 ml-1">* Required for Livestock Registration</p>
              </div>
            )}

            <div className="flex gap-4 pt-2 border-t border-slate-100">
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[var(--green)] font-medium transition-colors"
                  onChange={handleChange}
                />
              </div>
              <div className="w-1/2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  className="w-full p-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[var(--green)] font-medium transition-colors"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[var(--green)] text-white font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                {loading ? "Registering on Blockchain..." : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function UserDetailsModal({ user, onClose }) {
  const maskEmail = (email) => {
    if (!email) return "N/A";
    const [namePart, domain] = email.split("@");
    if (!domain) return email;
    if (namePart.length <= 2) return `${namePart[0]}***@${domain}`;
    return `${namePart[0]}${"*".repeat(namePart.length - 2)}${namePart[namePart.length - 1]}@${domain}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-slate-800">
          <h2 className="text-xl font-black tracking-tight">User Profile</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 font-bold text-xl transition-colors">✕</button>
        </div>

        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-black mb-3 border-4 border-white shadow-lg uppercase">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{user.firstName} {user.lastName}</h3>
            <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full mt-2 border border-emerald-100">
              {user.role}
            </span>
          </div>

          <div className="space-y-4">
            <InfoRow label="Email Address" value={maskEmail(user.email)} />
            <InfoRow label="Mobile Number" value={user.contactNumber || "N/A"} />
            <InfoRow label="Barangay" value={user.barangay} />
            {user.role === "Farmer" && (
              <InfoRow label="Farm Type" value={user.farmName || "Not Specified"} />
            )}
            <InfoRow label="Joined Date" value={new Date(user.createdAt).toLocaleDateString()} />
            <InfoRow label="Created By" value={user.createdBy || "System"} />
          </div>

          <button 
            onClick={onClose} 
            className="w-full mt-8 py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-all shadow-lg active:scale-95"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-bold text-slate-700 text-right">{value}</span>
    </div>
  );
}