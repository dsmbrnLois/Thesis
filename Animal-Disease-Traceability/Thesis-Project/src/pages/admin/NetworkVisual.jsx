import React from 'react';

const BlockchainFlow = () => {
  return (
    <div className="bg-gradient-to-b from-slate-50 to-white rounded-3xl shadow-xl border border-slate-100/80 overflow-hidden relative transition-all duration-500 hover:-translate-y-4 hover:shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,#10b98122_0%,transparent_25%)]" />
      </div>

      <div className="relative p-8 md:p-10 lg:p-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-6">
          <div className="text-left">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Blockchain <span className="text-emerald-600">Architecture</span>
            </h2>
            <p className="mt-2 text-slate-600 max-w-2xl text-base">
              Livestock traceability system — combining off-chain scalability with on-chain immutability
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-semibold border border-emerald-100/80 shadow-sm">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            Live Architecture View
          </div>
        </div>

        {/* Grid uses items-stretch to force equal height */}
        <div className="relative grid md:grid-cols-[1fr_auto_1fr] gap-8 md:gap-12 items-stretch">
          
          {/* OFF-CHAIN – Left Card (Light Gray Background) */}
          <div className="bg-slate-100 backdrop-blur-sm border border-slate-200 rounded-2xl p-7 shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">☁️</div>
              <div className="text-left">
                <h3 className="font-bold text-slate-800 text-lg">Off-Chain Layer</h3>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-tight text-left">Cloud Services (MongoDB) & Analytics</p>
              </div>
            </div>

            <div className="space-y-4 flex-grow">
              {[
                { icon: '📍', title: 'Real-time Movement', desc: 'GPS logs, timestamps, and geofencing' },
                { icon: '🔔', title: 'Notification Engine', desc: 'Barangay-wide health broadcasts' },
                { icon: '📄', title: 'Document Cache', desc: 'Temporary photo storage & session logs' },
                { 
                  icon: '🧠', 
                  title: 'Analytics & ML Engine', 
                  desc: 'Predictive health modeling & data visualization dashboards' 
                }
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 bg-white/60 rounded-xl hover:bg-white/80 transition-all border border-transparent hover:border-slate-200"
                >
                  <div className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</div>
                  <div className="text-left">
                    <div className="font-bold text-slate-800 text-sm">{item.title}</div>
                    <div className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CENTERED ARROW CONNECTOR */}
          <div className="hidden md:flex flex-col items-center justify-center relative min-h-full">
            <div className="absolute inset-y-0 flex items-center justify-center">
              <div className="w-px h-full bg-gradient-to-b from-transparent via-slate-300 to-transparent" />
            </div>

            <div className="relative z-10 bg-white p-5 rounded-full shadow-xl border border-slate-100">
              <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>

            <div className="absolute bottom-0 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Data Hashing
            </div>
          </div>

          {/* ON-CHAIN – Right Card */}
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-2xl p-7 shadow-2xl shadow-emerald-950/30 text-white relative overflow-hidden flex flex-col">
            <div className="absolute inset-0 opacity-5">
              <div className="w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
            </div>

            <div className="relative flex flex-col h-full">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-700/40">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-xl">🔗</div>
                <div className="text-left">
                  <h3 className="font-bold text-emerald-100 text-lg">On-Chain Ledger</h3>
                  <p className="text-sm text-emerald-300/90 font-mono">Hyperledger Fabric</p>
                </div>
              </div>

              <div className="space-y-4 flex-grow">
                {[
                  { msp: 'CA_Authority', action: 'Stakeholder Registration', seq: '101' },
                  { msp: 'FarmerMSP', action: 'Register Livestock Asset', seq: '102' },
                  { msp: 'VetMSP', action: 'Validate Health Status', seq: '103' },
                  { msp: 'RegulatorMSP', action: 'Approve & Seal Record', seq: '104' }
                ].map((node, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-emerald-800/30 backdrop-blur-sm rounded-xl border border-emerald-700/40 hover:bg-emerald-800/50 transition-colors"
                  >
                    <div className="text-left">
                      <div className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-1">
                        {node.msp}
                      </div>
                      <div className="font-mono text-sm text-white">{node.action}</div>
                    </div>
                    <div className="text-xs font-mono bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-700/50">
                      BLOCK #{node.seq}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-emerald-700/30 text-center">
                <div className="inline-flex items-center gap-2 text-emerald-300 text-sm font-medium">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Consensus Achieved – Immutable
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function NetworkMonitor() {
  return (
    <div className="min-h-screen bg-transparent pb-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pt-10">
        <div className="mb-12 text-center flex flex-col items-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3 text-center">
            Santa Rosa Livestock <span className="text-emerald-600">Traceability Network</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto text-center font-medium">
            Visual representation of the blockchain architecture powering secure, transparent animal health records.
          </p>
        </div>

        <BlockchainFlow />
      </div>
    </div>
  );
}