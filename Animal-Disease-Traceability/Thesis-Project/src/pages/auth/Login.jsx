import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import { loginUser } from "../../config/api";

const Login = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handleStakeholderLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginUser(input.username, input.password);
      if (response.success) {
        console.log("Login successful:", response);

        // --- CRITICAL FIXES START ---
        // 1. Save core identifiers
        localStorage.setItem("username", input.username);
        localStorage.setItem("mspId", response.mspId); // Needed for blockchain auth

        // 2. Save profile data needed for Transaction validation
        localStorage.setItem(
          "fullName",
          `${response.user.firstName} ${response.user.lastName}`,
        );

        // Ensure your server.js returns this field!
        localStorage.setItem(
          "contactNumber",
          response.user.contactNumber || "",
        );
        // --- CRITICAL FIXES END ---
        localStorage.setItem("barangay", response.user.barangay || "");
        // --- 2. ADD NEW OBJECT (For Vet Logic) ---

        const userData = {
          username: input.username,
          mspId: response.mspId,
          fullName: `${response.user.firstName} ${response.user.lastName}`,
          contactNumber: response.user.contactNumber || "",
          barangay: response.user.barangay || "",
        };
        localStorage.setItem("user", JSON.stringify(userData));

        const msp = response.mspId;
        if (msp === "FarmerMSP") {
          navigate("/farmer/livestock");
        } else if (msp === "VetMSP") {
          navigate("/vet/dashboard");
        } else if (msp === "RegulatorMSP") {
          navigate("/admin/dashboard");
        } else {
          navigate("/dashboard");
        }
      }
    } catch (err) {
      console.error("Login Error:", err);
      setError(err.message || "Invalid credentials or connection error.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = () => {
    navigate("/adminlogin");
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-white p-4">
      <div className="mt-24 bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-green-100">
        <h2 className="text-3xl font-bold text-[var(--green)] mb-6 text-center">
          Stakeholder Login
        </h2>

        {error && (
          <div className="mb-4 text-center text-red-500 text-sm font-semibold bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleStakeholderLogin} className="space-y-5">
          <div>
            <input
              type="text"
              name="username"
              placeholder="Username (Try: vet)"
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--green)]"
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Password (Try: 123)"
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--green)]"
              onChange={handleChange}
              required
            />
          </div>

          <div className="text-right mt-1">
            <Link to="/forgot-password" size="sm" className="text-xs text-[var(--green)] hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full bg-[var(--green)] text-white py-3 rounded-xl hover:bg-[var(--light-green)] hover:text-[var(--green)] transition font-medium shadow-md"
          >
            Login
          </button>
        </form>

        <div className="flex items-center justify-center my-5">
          <div className="border-t border-gray-300 w-1/3"></div>
          <span className="mx-2 text-gray-500 text-sm">or</span>
          <div className="border-t border-gray-300 w-1/3"></div>
        </div>

        <button
          onClick={handleAdminLogin}
          className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl hover:bg-gray-200 transition font-medium border border-gray-300"
        >
          Login as Admin
        </button>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-[var(--green)] font-semibold hover:underline"
            >
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
