import React, { useState } from "react";
// ADDED Link HERE 👇
import { useNavigate, Link } from "react-router-dom"; 
import { loginUser } from "../../config/api";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await loginUser(username, password);

      if (response.success) {
        // Security check for Admin MSP
        if (response.mspId === "RegulatorMSP") {
          const adminData = {
            username: username,
            mspId: response.mspId,
            role: "Admin",
          };
          localStorage.setItem("user", JSON.stringify(adminData));
          navigate("/admin/dashboard");
        } else {
          setError("Access Denied: You are not authorized as an Administrator.");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-[var(--green)] text-white w-full shadow-lg fixed top-0 left-0 z-50">
        <div className="w-full px-6 lg:px-12 py-4 flex justify-between items-center">
          <h1 className="text-xl md:text-3xl font-bold tracking-wide">Animal Disease Traceability</h1>
          <nav className="flex space-x-6 text-lg">
            <Link to="/" className="hover:text-[var(--light-green)] transition-all">Home</Link>
            <Link to="/login" className="hover:text-[var(--light-green)] transition-all">Login</Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center bg-gradient-to-br from-green-50 to-white pt-28 pb-12 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-green-100">
          <h2 className="text-3xl font-bold text-[var(--green)] mb-6 text-center">Admin Login</h2>

          {error && (
            <div className="mb-4 text-center text-red-500 text-sm font-semibold bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-5">
            <input
              type="text"
              placeholder="Admin Username"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--green)] outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--green)] outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="text-right mt-1">
              {/* This link will now work correctly */}
              <Link to="/forgot-password" size="sm" className="text-xs text-[var(--green)] hover:underline font-bold">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--green)] text-white py-3 rounded-xl hover:bg-[var(--dark-green)] transition font-bold shadow-md disabled:opacity-50"
            >
              {loading ? "Verifying Access..." : "Login as Admin"}
            </button>
          </form>

          <button
            onClick={() => navigate("/")}
            className="w-full mt-4 bg-gray-600 text-white py-3 rounded-xl hover:bg-gray-700 transition font-medium shadow-md"
          >
            Back to Home
          </button>
        </div>
      </main>

      <footer className="bg-[var(--green)] text-white text-center py-6 w-full mt-auto">
        <p className="text-xs opacity-80">© 2026 Santa Rosa City Laguna Animal Disease Traceability.</p>
      </footer>
    </div>
  );
};

export default AdminLogin;