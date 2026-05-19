// src/components/common/TransactionLoadingOverlay.jsx
import React from "react";

/**
 * Full-screen loading overlay that blocks ALL user interaction
 * during blockchain transactions. Prevents double-clicks and
 * double-submissions by covering the entire viewport.
 *
 * Usage:
 *   <TransactionLoadingOverlay isOpen={txLoading} message="Submitting to blockchain..." />
 */
export default function TransactionLoadingOverlay({ isOpen, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/85 backdrop-blur-md">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10"
            style={{
              width: 60 + i * 40,
              height: 60 + i * 40,
              left: `${15 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
              background: `radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)`,
              animation: `txPulse ${2 + i * 0.5}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Main Card */}
      <div className="relative flex flex-col items-center text-center px-10 py-12 max-w-sm mx-4">
        {/* Chain Link Spinner */}
        <div className="relative w-24 h-24 mb-8">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-emerald-500/20"
            style={{ animation: "txSpin 3s linear infinite" }}
          />
          {/* Middle ring */}
          <div
            className="absolute inset-2 rounded-full border-4 border-transparent border-t-emerald-400 border-r-emerald-400"
            style={{ animation: "txSpin 1.5s linear infinite" }}
          />
          {/* Inner ring */}
          <div
            className="absolute inset-4 rounded-full border-4 border-transparent border-b-emerald-300 border-l-emerald-300"
            style={{ animation: "txSpin 2s linear infinite reverse" }}
          />
          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl" style={{ animation: "txPulse 1.5s ease-in-out infinite" }}>
              ⛓️
            </span>
          </div>
        </div>

        {/* Status Text */}
        <h3 className="text-white text-xl font-black tracking-tight mb-2">
          Processing Transaction
        </h3>
        <p className="text-emerald-300 text-sm font-bold mb-6 leading-relaxed max-w-xs">
          {message || "Submitting to blockchain..."}
        </p>

        {/* Progress Dots */}
        <div className="flex items-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-emerald-400"
              style={{
                animation: `txBounce 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Warning */}
        <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
          <p className="text-white/50 text-[10px] font-bold uppercase tracking-[0.2em]">
            ⚠️ Please do not close this window
          </p>
        </div>
      </div>

      {/* Inline Keyframes */}
      <style>{`
        @keyframes txSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes txPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes txBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
