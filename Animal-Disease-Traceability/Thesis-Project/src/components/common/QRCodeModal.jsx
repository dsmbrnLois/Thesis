// src/components/common/QRCodeModal.jsx
import React, { useRef, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function QRCodeModal({ isOpen, onClose, batchId, animal }) {
  if (!isOpen || !batchId) return null;

  const qrRef = useRef(null);
  const baseUrl = import.meta.env.VITE_PUBLIC_FRONTEND_URL || window.location.origin;
  const passportUrl = `${baseUrl}/passport/${batchId}`;

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handlePrint = useCallback(() => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgElement = qrRef.current?.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code — ${batchId}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              background: #fff;
            }
            .card {
              text-align: center;
              padding: 48px 40px;
              border: 3px solid #0f172a;
              border-radius: 24px;
              max-width: 380px;
              width: 100%;
            }
            .seal {
              font-size: 8px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 3px;
              color: #059669;
              margin-bottom: 8px;
            }
            .title {
              font-size: 14px;
              font-weight: 900;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin-bottom: 24px;
            }
            .qr-container {
              display: inline-block;
              padding: 16px;
              background: #fff;
              border: 2px solid #e2e8f0;
              border-radius: 16px;
              margin-bottom: 20px;
            }
            .qr-container svg { display: block; }
            .species {
              font-size: 20px;
              font-weight: 900;
              color: #0f172a;
              margin-bottom: 4px;
            }
            .batch-id {
              font-size: 11px;
              font-family: 'Courier New', monospace;
              font-weight: 600;
              color: #64748b;
              background: #f1f5f9;
              padding: 4px 12px;
              border-radius: 6px;
              display: inline-block;
              margin-bottom: 8px;
            }
            .date {
              font-size: 10px;
              color: #94a3b8;
              font-weight: 600;
            }
            .footer {
              margin-top: 20px;
              font-size: 8px;
              color: #94a3b8;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 1px;
              line-height: 1.6;
            }
            @media print {
              body { background: #fff; }
              .card { border: 3px solid #000; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="seal">ADTS Regional Hub</div>
            <div class="title">Digital Animal Passport</div>
            <div class="qr-container">${svgData}</div>
            <div class="species">${animal?.species || "Livestock"}</div>
            <div class="batch-id">${batchId}</div>
            <div class="date">Registered: ${formatDate(animal?.timestamp)}</div>
            <div class="footer">
              Scan to verify on the Blockchain Traceability System<br/>
              Powered by Hyperledger Fabric
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  }, [batchId, animal]);

  const handleDownloadPNG = useCallback(() => {
    const svgElement = qrRef.current?.querySelector("svg");
    if (!svgElement) return;

    const canvas = document.createElement("canvas");
    const scale = 4;
    const size = 200;
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext("2d");

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `passport-qr-${batchId}.png`;
      a.click();
    };
    img.src = url;
  }, [batchId]);

  const severityBadge = () => {
    const s = animal?.severity;
    if (s === "safe") return { text: "Verified Healthy ✅", bg: "bg-emerald-50", color: "text-emerald-700", border: "border-emerald-200" };
    if (s === "mild") return { text: "Mild Illness ⚠️", bg: "bg-amber-50", color: "text-amber-700", border: "border-amber-200" };
    if (s === "dangerous") return { text: "Dangerous ⛔", bg: "bg-red-50", color: "text-red-700", border: "border-red-200" };
    return { text: "Pending Verification ⏳", bg: "bg-slate-50", color: "text-slate-600", border: "border-slate-200" };
  };

  const badge = severityBadge();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        {/* HEADER */}
        <div className="p-6 pb-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <span className="text-2xl">📱</span> QR Passport
            </h3>
            <p className="text-emerald-600 text-xs font-bold uppercase tracking-wider mt-1">
              {batchId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-white text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors font-bold shadow-sm"
          >
            ✕
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 flex flex-col items-center">
          {/* QR CODE */}
          <div
            ref={qrRef}
            className="bg-white p-5 rounded-2xl border-2 border-slate-100 shadow-sm mb-5"
          >
            <QRCodeSVG
              value={passportUrl}
              size={200}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#0f172a"
            />
          </div>

          {/* ANIMAL INFO */}
          <div className="text-center mb-5 w-full">
            <h4 className="text-2xl font-black text-slate-800 mb-1">
              {animal?.species || "Livestock"}
            </h4>
            <span className="inline-block bg-slate-100 text-slate-500 text-[11px] font-mono font-semibold px-3 py-1 rounded-lg border border-slate-200 mb-2">
              {batchId}
            </span>
            <div className="flex items-center justify-center gap-3 text-sm text-slate-500 font-medium">
              <span>{animal?.quantity || 0} heads</span>
              <span className="text-slate-300">•</span>
              <span>{formatDate(animal?.timestamp)}</span>
            </div>
          </div>

          {/* HEALTH STATUS */}
          <div className={`w-full text-center py-2.5 px-4 rounded-xl text-xs font-bold ${badge.bg} ${badge.color} border ${badge.border} mb-5`}>
            {badge.text}
          </div>

          {/* URL PREVIEW */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 mb-5">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Passport URL
            </p>
            <p className="text-[11px] font-mono text-slate-600 break-all leading-relaxed">
              {passportUrl}
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="w-full grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.97] text-sm uppercase tracking-widest"
            >
              🖨️ Print
            </button>
            <button
              onClick={handleDownloadPNG}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.97] text-sm uppercase tracking-widest"
            >
              ⬇️ Save PNG
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-relaxed">
            Scan with any camera app to view the<br />
            Digital Animal Passport on the blockchain
          </p>
        </div>
      </div>
    </div>
  );
}
