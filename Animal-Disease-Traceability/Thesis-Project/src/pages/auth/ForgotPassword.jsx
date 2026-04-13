import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestOTP, resetPassword, verifyOTP } from "../../config/api"; 

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Request, 2: Code, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Step 1: Request OTP via Email
  const handleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await requestOTP(email); 
      setMessage("Verification code sent to your email address.");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "User not found.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify the 6-digit code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verifyOTP(email, otp); 
      setStep(3);
      setMessage("Code verified! Set your new password.");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Update Password
  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resetPassword(email, otp, newPassword);
      alert("Success! Your password has been updated.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border border-green-100">
        <h2 className="text-3xl font-bold text-[var(--green)] mb-2 text-center">
          {step === 1 ? "Forgot Password" : step === 2 ? "Verify Code" : "New Password"}
        </h2>
        <p className="text-gray-500 text-center mb-6 text-sm">
          {step === 1 && "Enter your email to receive a verification code."}
          {step === 2 && "Enter the 6-digit code sent to your inbox."}
          {step === 3 && "Create a secure new password."}
        </p>

        {error && <div className="mb-4 text-red-500 bg-red-50 p-2 rounded text-sm text-center border border-red-100">{error}</div>}
        {message && step !== 3 && <div className="mb-4 text-green-600 bg-green-50 p-2 rounded text-sm text-center border border-green-100">{message}</div>}

        <form onSubmit={step === 1 ? handleRequest : step === 2 ? handleVerifyCode : handleReset} className="space-y-4">
          
          {step === 1 && (
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--green)] outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}

          {step === 2 && (
            <input
              type="text"
              placeholder="000000"
              className="w-full p-3 border border-gray-300 rounded-xl tracking-[1em] text-center font-bold text-2xl focus:border-[var(--green)] outline-none"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              maxLength="6"
              required
            />
          )}

          {step === 3 && (
            <>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--green)] outline-none"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-400 hover:text-[var(--green)] text-xs font-semibold"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm New Password"
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[var(--green)] outline-none"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--green)] text-white py-3 rounded-xl hover:bg-[var(--dark-green)] transition font-bold disabled:opacity-50 shadow-lg"
          >
            {loading ? "Processing..." : step === 1 ? "Send Code" : step === 2 ? "Verify Code" : "Update Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : navigate("/login")}
            className="text-gray-500 hover:text-[var(--green)] text-sm transition font-medium underline underline-offset-4"
          >
            {step > 1 ? "← Go Back" : "Back to Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;