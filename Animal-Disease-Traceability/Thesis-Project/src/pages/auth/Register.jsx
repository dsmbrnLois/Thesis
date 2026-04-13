import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../assets/styles/index.css";
import { registerUser } from "../../config/api";

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "", // Added contactNumber to state
    password: "",
    confirmPassword: "",
    role: "Farmer",
    barangay: "Aplaya",
    farmName: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const barangays = [
    "Aplaya", "Balibago", "Caingin", "Dila", "Dita", "Don Jose",
    "Ibaba", "Kanluran", "Labas", "Macabling", "Malitlit",
    "Malusak", "Market Area", "Pooc", "Pulong Santa Cruz",
    "Santo Domingo", "Sinalhan", "Tagapo",
  ];

  const roles = [
    { value: "Farmer", label: "Livestock Farmer (Producer)" },
    { value: "Veterinarian", label: "Veterinarian" },
    { value: "Regulator", label: "Regulator / Admin" },
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validatePassword = (pwd) => {
    const simpleRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/;
    return simpleRegex.test(pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // --- 1. FORMAT AND VALIDATE CONTACT NUMBER ---
    // This converts 0917... to +63917...
    let formattedContact = formData.contactNumber;
    if (formattedContact.startsWith('0')) {
      formattedContact = '+63' + formattedContact.substring(1);
    } else if (!formattedContact.startsWith('+63')) {
      formattedContact = '+63' + formattedContact;
    }

    // Validate the new formatted length (+63 + 10 digits = 13 characters)
    if (!/^\+63\d{10}$/.test(formattedContact)) {
      setError("Please enter a valid 11-digit mobile number (e.g., 09123456789).");
      setLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!validatePassword(formData.password)) {
      setError("Password must be at least 8 characters long and include at least 1 letter and 1 number.");
      setLoading(false);
      return;
    }

    try {
      const orgMap = {
        Farmer: "FarmerOrg",
        Veterinarian: "VetOrg",
        Regulator: "RegulatorOrg",
      };
      const targetOrg = orgMap[formData.role] || "FarmerOrg";

      const payload = {
        username: formData.email,
        org: targetOrg,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        contactNumber: formattedContact, // USE THE FORMATTED NUMBER HERE
        password: formData.password,
        role: formData.role,
        barangay: formData.barangay,
        farmName: formData.farmName,
      };

      await registerUser(payload);
      alert(`Registration successful! Account created for ${formData.firstName}.`);
      navigate("/login");
    } catch (err) {
      setError(err.message || "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl my-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--green)]">Create Account</h1>
          <p className="text-gray-500 mt-2">Join the Traceability Network</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <input type="text" name="firstName" placeholder="First Name" required className="w-1/2 p-3 border border-gray-300 rounded-lg" onChange={handleChange} />
            <input type="text" name="lastName" placeholder="Last Name" required className="w-1/2 p-3 border border-gray-300 rounded-lg" onChange={handleChange} />
          </div>

          <input type="email" name="email" placeholder="Email Address" required className="w-full p-3 border border-gray-300 rounded-lg" onChange={handleChange} />

          {/* New Contact Number Field */}
          <input 
            type="text" 
            name="contactNumber" 
            placeholder="Contact Number (11 digits)" 
            required 
            maxLength="11"
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--light-green)]" 
            onChange={handleChange} 
          />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Role</label>
              <select name="role" className="w-full p-3 border border-gray-300 rounded-lg" onChange={handleChange} value={formData.role}>
                {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barangay (Location)</label>
              <select name="barangay" className="w-full p-3 border border-gray-300 rounded-lg" onChange={handleChange} value={formData.barangay}>
                {barangays.map((bgy) => <option key={bgy} value={bgy}>{bgy}</option>)}
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

          <div className="space-y-4">
            <input type="password" name="password" placeholder="Password" required className="w-full p-3 border border-gray-300 rounded-lg" onChange={handleChange} />
            <input type="password" name="confirmPassword" placeholder="Confirm Password" required className="w-full p-3 border border-gray-300 rounded-lg" onChange={handleChange} />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 bg-[var(--green)] text-white font-bold rounded-lg hover:bg-[var(--dark-green)] disabled:opacity-50 mt-4">
            {loading ? "Registering..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          Already have an account? <Link to="/login" className="text-[var(--green)] font-bold hover:underline">Login here</Link>
        </div>
      </div>
    </div>
  );
}