// src/pages/public/DigitalPassport.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import API_URL from "../../config/api";

// =============================================
// Inline styles for complete standalone rendering
// (No TailwindCSS dependency — works even in isolation)
// =============================================
const COLORS = {
  emerald50: "#ecfdf5", emerald100: "#d1fae5", emerald200: "#a7f3d0",
  emerald500: "#10b981", emerald600: "#059669", emerald700: "#047857",
  emerald800: "#065f46", emerald900: "#064e3b",
  slate50: "#f8fafc", slate100: "#f1f5f9", slate200: "#e2e8f0",
  slate300: "#cbd5e1", slate400: "#94a3b8", slate500: "#64748b",
  slate600: "#475569", slate700: "#334155", slate800: "#1e293b",
  slate900: "#0f172a",
  red50: "#fef2f2", red100: "#fee2e2", red500: "#ef4444", red600: "#dc2626", red700: "#b91c1c",
  amber50: "#fffbeb", amber100: "#fef3c7", amber500: "#f59e0b", amber600: "#d97706", amber700: "#b45309",
  blue50: "#eff6ff", blue100: "#dbeafe", blue500: "#3b82f6", blue600: "#2563eb",
  white: "#ffffff",
};

export default function DigitalPassport() {
  const { batchId } = useParams();
  const [passportData, setPassportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPassport = async () => {
      try {
        const res = await fetch(`${API_URL}/passport/${batchId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Passport not found");
        }
        const data = await res.json();
        setPassportData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPassport();
  }, [batchId]);

  const formatDate = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString(undefined, {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  const speciesEmoji = (species) => {
    const map = { Hog: "🐷", Cow: "🐄", Chicken: "🐔", Carabao: "🐃", Duck: "🦆", Goat: "🐐" };
    return map[species] || "🐾";
  };

  // --- Sorted audit trail (newest first) ---
  const sortedAudit = useMemo(() => {
    if (!passportData?.auditTrail || !Array.isArray(passportData.auditTrail)) return [];
    return [...passportData.auditTrail].sort(
      (a, b) => new Date(b.data.timestamp) - new Date(a.data.timestamp)
    );
  }, [passportData]);

  // --- Chain of custody ---
  const movementPath = useMemo(() => {
    if (!passportData?.auditTrail || !Array.isArray(passportData.auditTrail)) return [];
    const chronological = [...passportData.auditTrail].sort(
      (a, b) => new Date(a.data.timestamp) - new Date(b.data.timestamp)
    );
    const path = [];
    chronological.forEach((item) => {
      const loc = item.data.location;
      if (loc && (path.length === 0 || path[path.length - 1] !== loc)) {
        path.push(loc);
      }
    });
    return path;
  }, [passportData]);

  const severityStyle = (severity) => {
    if (severity === "safe") return { bg: COLORS.emerald50, color: COLORS.emerald700, border: COLORS.emerald200, text: "✅ Verified Healthy", dot: COLORS.emerald500 };
    if (severity === "mild") return { bg: COLORS.amber50, color: COLORS.amber700, border: COLORS.amber100, text: "⚠️ Mild Illness", dot: COLORS.amber500 };
    if (severity === "dangerous") return { bg: COLORS.red50, color: COLORS.red700, border: COLORS.red100, text: "⛔ Dangerous Disease", dot: COLORS.red500 };
    return { bg: COLORS.slate50, color: COLORS.slate600, border: COLORS.slate200, text: "⏳ Pending Verification", dot: COLORS.slate400 };
  };

  // =============================================
  // LOADING STATE
  // =============================================
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <style>{printStyles}</style>
        <style>{fontImport}</style>
        <div style={styles.spinner}></div>
        <p style={{ color: COLORS.slate400, fontFamily: "'Inter', sans-serif", fontWeight: 600, marginTop: 16 }}>
          Loading Digital Passport...
        </p>
        <p style={{ color: COLORS.slate300, fontFamily: "'Inter', sans-serif", fontSize: 12, marginTop: 4 }}>
          Querying blockchain ledger
        </p>
      </div>
    );
  }

  // =============================================
  // ERROR STATE
  // =============================================
  if (error || !passportData) {
    return (
      <div style={styles.loadingContainer}>
        <style>{printStyles}</style>
        <style>{fontImport}</style>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontWeight: 900, color: COLORS.slate800, marginBottom: 8 }}>
          Passport Not Found
        </h2>
        <p style={{ fontFamily: "'Inter', sans-serif", color: COLORS.slate500, fontSize: 14, maxWidth: 360, textAlign: "center", lineHeight: 1.6 }}>
          {error || "Unable to retrieve the Digital Animal Passport for this asset."}
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", color: COLORS.slate400, fontSize: 12, marginTop: 12, fontStyle: "italic" }}>
          Batch ID: {batchId}
        </p>
      </div>
    );
  }

  const { animal, healthRecords, auditTrail, meta } = passportData;
  const sv = severityStyle(animal.severity);

  // =============================================
  // MAIN PASSPORT RENDER
  // =============================================
  return (
    <div style={styles.page}>
      <style>{printStyles}</style>
      <style>{fontImport}</style>
      <style>{spinnerKeyframes}</style>

      <div style={styles.container}>
        {/* ============================================= */}
        {/* HEADER — Official Document Seal               */}
        {/* ============================================= */}
        <div style={styles.header}>
          <div style={styles.headerBadge}>
            OFFICIAL DOCUMENT
          </div>
          <h1 style={styles.headerTitle}>
            Digital Animal Passport
          </h1>
          <p style={styles.headerSubtitle}>
            ADTS Regional Hub — Livestock Traceability System
          </p>
          <div style={styles.headerBatchId}>
            {animal.batchId}
          </div>
        </div>

        {/* ============================================= */}
        {/* ANIMAL IDENTITY CARD                          */}
        {/* ============================================= */}
        <div style={styles.sectionCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
            <div style={styles.animalEmoji}>
              {speciesEmoji(animal.species)}
            </div>
            <div>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 900, color: COLORS.slate900, margin: 0 }}>
                {animal.species}
              </h2>
              <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: COLORS.slate500, fontWeight: 600, margin: 0, marginTop: 2 }}>
                {animal.quantity} head(s) registered
              </p>
            </div>
          </div>

          {/* Health Status Badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            backgroundColor: sv.bg, border: `2px solid ${sv.border}`,
            padding: "10px 16px", borderRadius: 12, marginBottom: 20,
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: sv.dot, flexShrink: 0 }}></div>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 800, color: sv.color }}>
              {sv.text}
            </span>
            {animal.diagnosedDisease && animal.severity !== "safe" && animal.severity !== "Ongoing" && (
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: COLORS.red600, marginLeft: 8 }}>
                — {animal.diagnosedDisease}
              </span>
            )}
          </div>

          {/* Detail Grid */}
          <div style={styles.detailGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Owner</span>
              <span style={styles.detailValue}>{animal.fullName}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Location</span>
              <span style={styles.detailValue}>{animal.location}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Registered</span>
              <span style={styles.detailValue}>{formatDate(animal.timestamp)}</span>
            </div>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Status</span>
              <span style={styles.detailValue}>{animal.status}</span>
            </div>
          </div>

          {animal.parentBatchId && animal.parentBatchId !== "NONE" && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginTop: 16,
              backgroundColor: COLORS.amber50, border: `1px solid ${COLORS.amber100}`,
              padding: "8px 14px", borderRadius: 10, fontSize: 11,
              fontFamily: "'Inter', sans-serif", fontWeight: 700, color: COLORS.amber700,
            }}>
              🔗 Split from parent batch: <span style={{ fontFamily: "'Courier New', monospace" }}>{animal.parentBatchId}</span>
            </div>
          )}
        </div>

        {/* ============================================= */}
        {/* CHAIN OF CUSTODY                              */}
        {/* ============================================= */}
        {movementPath.length > 1 && (
          <div style={styles.sectionCard}>
            <h3 style={styles.sectionTitle}>
              <span style={{ marginRight: 8 }}>🗺️</span>Chain of Custody
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {movementPath.map((loc, idx) => (
                <React.Fragment key={idx}>
                  <div style={{
                    backgroundColor: idx === 0 ? COLORS.emerald50 : COLORS.slate50,
                    border: `1px solid ${idx === 0 ? COLORS.emerald200 : COLORS.slate200}`,
                    color: idx === 0 ? COLORS.emerald700 : COLORS.slate700,
                    padding: "6px 12px", borderRadius: 8,
                    fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                  }}>
                    {idx === 0 ? "📍 " : ""}{loc}
                  </div>
                  {idx < movementPath.length - 1 && (
                    <span style={{ color: COLORS.slate300, fontWeight: 900, fontSize: 14 }}>→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* ============================================= */}
        {/* MEDICAL RECORDS                               */}
        {/* ============================================= */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>
            <span style={{ marginRight: 8 }}>🩺</span>Medical Records
            <span style={{
              marginLeft: 8, backgroundColor: COLORS.blue50,
              color: COLORS.blue600, fontSize: 11, fontWeight: 800,
              padding: "2px 10px", borderRadius: 20,
            }}>
              {healthRecords.length}
            </span>
          </h3>

          {healthRecords.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>📋</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: COLORS.slate400, fontSize: 13 }}>
                No medical records found for this asset.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {healthRecords.map((log, i) => {
                const typeBadgeColor = log.isInherited
                  ? { bg: COLORS.slate100, color: COLORS.slate500, border: COLORS.slate200 }
                  : { bg: COLORS.blue50, color: COLORS.blue600, border: COLORS.blue100 };

                return (
                  <div key={i} style={{
                    backgroundColor: log.isInherited ? COLORS.slate50 : COLORS.white,
                    border: `1px solid ${log.isInherited ? COLORS.slate200 : COLORS.slate200}`,
                    borderRadius: 14, padding: 16,
                    opacity: log.isInherited ? 0.85 : 1,
                  }}>
                    {/* Row 1: Date + Type */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                      <span style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 12,
                        fontWeight: 700, color: log.isInherited ? COLORS.slate500 : COLORS.slate700,
                      }}>
                        {formatDate(log.date)}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 800, textTransform: "uppercase",
                          letterSpacing: "0.08em", padding: "3px 10px", borderRadius: 6,
                          fontFamily: "'Inter', sans-serif",
                          backgroundColor: typeBadgeColor.bg, color: typeBadgeColor.color,
                          border: `1px solid ${typeBadgeColor.border}`,
                        }}>
                          {log.type}
                        </span>
                        {log.isInherited && (
                          <span style={{
                            fontSize: 8, fontWeight: 900, textTransform: "uppercase",
                            letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
                            fontFamily: "'Inter', sans-serif",
                            backgroundColor: COLORS.slate200, color: COLORS.slate500,
                          }}>
                            Inherited
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Row 2: Name */}
                    <p style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 800,
                      color: log.isInherited ? COLORS.slate600 : COLORS.slate800,
                      margin: 0, marginBottom: 4,
                    }}>
                      {log.name}
                    </p>
                    {/* Row 3: Notes */}
                    {log.notes && (
                      <p style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 12, color: COLORS.slate500,
                        fontStyle: "italic", margin: 0, marginBottom: 6, lineHeight: 1.5,
                      }}>
                        "{log.notes}"
                      </p>
                    )}
                    {/* Row 4: Vet + Validity */}
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: COLORS.slate400, fontWeight: 600 }}>
                        Vet: {log.vetUsername}
                      </span>
                      <span style={{
                        fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700,
                        padding: "2px 8px", borderRadius: 4,
                        backgroundColor: log.status === "Valid" ? COLORS.emerald50 : COLORS.red50,
                        color: log.status === "Valid" ? COLORS.emerald700 : COLORS.red700,
                      }}>
                        {log.status}
                      </span>
                    </div>
                    {/* Next Due */}
                    {log.nextDueDate && (
                      <div style={{
                        marginTop: 8, fontSize: 11, fontWeight: 600,
                        color: COLORS.amber700, fontFamily: "'Inter', sans-serif",
                        backgroundColor: COLORS.amber50, padding: "4px 10px",
                        borderRadius: 6, display: "inline-block",
                      }}>
                        Next due: {formatDate(log.nextDueDate)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================= */}
        {/* BLOCKCHAIN AUDIT TRAIL                        */}
        {/* ============================================= */}
        <div style={styles.sectionCard}>
          <h3 style={styles.sectionTitle}>
            <span style={{ marginRight: 8 }}>⛓️</span>Blockchain Audit Trail
            <span style={{
              marginLeft: 8, backgroundColor: COLORS.emerald50,
              color: COLORS.emerald600, fontSize: 11, fontWeight: 800,
              padding: "2px 10px", borderRadius: 20,
            }}>
              {sortedAudit.length}
            </span>
          </h3>

          {sortedAudit.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>🔗</div>
              <p style={{ fontFamily: "'Inter', sans-serif", fontWeight: 600, color: COLORS.slate400, fontSize: 13 }}>
                Blockchain data unavailable. The network may be offline.
              </p>
            </div>
          ) : (
            <div style={{ position: "relative", paddingLeft: 24 }}>
              {/* Vertical Line */}
              <div style={{
                position: "absolute", left: 7, top: 8, bottom: 8,
                width: 2, backgroundColor: COLORS.slate200,
              }}></div>

              {sortedAudit.map((item, i) => {
                const isFirstInherited = item.isInherited && i > 0 && !sortedAudit[i - 1].isInherited;

                return (
                  <React.Fragment key={i}>
                    {isFirstInherited && (
                      <div style={{
                        position: "relative", marginBottom: 16, marginTop: 8,
                        backgroundColor: COLORS.amber50, border: `1px solid ${COLORS.amber100}`,
                        padding: "8px 14px", borderRadius: 10,
                        fontSize: 10, fontWeight: 900, textTransform: "uppercase",
                        letterSpacing: "0.12em", color: COLORS.amber700,
                        fontFamily: "'Inter', sans-serif",
                      }}>
                        🔗 Inherited History (Parent Batch)
                      </div>
                    )}
                    <div style={{ position: "relative", marginBottom: 16 }}>
                      {/* Dot */}
                      <div style={{
                        position: "absolute", left: -20, top: 6,
                        width: 14, height: 14, borderRadius: "50%",
                        backgroundColor: item.isInherited ? COLORS.slate400 : COLORS.emerald500,
                        border: `3px solid ${COLORS.white}`,
                        boxShadow: `0 0 0 2px ${item.isInherited ? COLORS.slate300 : COLORS.emerald200}`,
                        zIndex: 2,
                      }}></div>

                      <div style={{
                        backgroundColor: item.isInherited ? COLORS.slate50 : COLORS.white,
                        border: `1px solid ${COLORS.slate200}`,
                        borderRadius: 14, padding: 16,
                        opacity: item.isInherited ? 0.85 : 1,
                      }}>
                        {/* TX Hash + Timestamp */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                          <span style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: 10, fontWeight: 600, color: COLORS.white,
                            backgroundColor: COLORS.slate900,
                            padding: "3px 8px", borderRadius: 4,
                          }}>
                            TX: {item.txId?.substring(0, 12)}...
                          </span>
                          <span style={{
                            fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600,
                            color: item.isInherited ? COLORS.slate500 : COLORS.emerald600,
                            backgroundColor: item.isInherited ? COLORS.slate100 : COLORS.emerald50,
                            padding: "3px 8px", borderRadius: 4,
                          }}>
                            {formatDateTime(item.data.timestamp)}
                          </span>
                        </div>

                        {/* Status */}
                        <p style={{
                          fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 900,
                          color: item.isInherited ? COLORS.slate600 : COLORS.slate800,
                          margin: 0, marginBottom: 10,
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          {item.data.status || "State Update"}
                          {item.isInherited && (
                            <span style={{
                              fontSize: 8, fontWeight: 900, textTransform: "uppercase",
                              letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
                              fontFamily: "'Inter', sans-serif",
                              backgroundColor: COLORS.slate200, color: COLORS.slate500,
                            }}>
                              Inherited
                            </span>
                          )}
                        </p>

                        {/* Detail mini-grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                          <div style={styles.auditDetail}>
                            <span style={styles.auditDetailLabel}>Batch</span>
                            <span style={{ fontWeight: 700, color: COLORS.slate800, fontFamily: "'Courier New', monospace", fontSize: 10 }}>
                              {item.data.batchId}
                            </span>
                          </div>
                          <div style={styles.auditDetail}>
                            <span style={styles.auditDetailLabel}>Qty</span>
                            <span style={{ fontWeight: 700, color: COLORS.slate800 }}>{item.data.quantity} heads</span>
                          </div>
                          <div style={{ ...styles.auditDetail, gridColumn: "1 / -1" }}>
                            <span style={styles.auditDetailLabel}>Location</span>
                            <span style={{ fontWeight: 600, color: COLORS.slate700, fontSize: 11 }}>{item.data.location}</span>
                          </div>
                        </div>

                        {/* Diagnosis Alert */}
                        {item.data.diagnosedDisease && item.data.severity !== "safe" && item.data.severity !== "Ongoing" && (
                          <div style={{
                            marginTop: 10, display: "flex", alignItems: "center", gap: 8,
                            backgroundColor: COLORS.red50, border: `1px solid ${COLORS.red100}`,
                            padding: "6px 12px", borderRadius: 8,
                          }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: COLORS.red500 }}></div>
                            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 800, color: COLORS.red600 }}>
                              DIAGNOSIS: {item.data.diagnosedDisease}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ============================================= */}
        {/* VERIFICATION FOOTER                           */}
        {/* ============================================= */}
        <div style={styles.footer}>
          <div style={styles.footerSeal}>
            <span style={{ fontSize: 20, marginBottom: 8, display: "block" }}>🛡️</span>
            <p style={{ fontWeight: 900, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: COLORS.emerald700, marginBottom: 6 }}>
              Blockchain Verified Document
            </p>
            <p style={{ fontSize: 11, color: COLORS.slate500, lineHeight: 1.6, maxWidth: 420, margin: "0 auto" }}>
              This Digital Animal Passport is powered by <strong>Hyperledger Fabric</strong> blockchain technology.
              All records are cryptographically immutable and tamper-proof.
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginTop: 16 }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: COLORS.slate400, fontWeight: 600 }}>
              Channel: {meta?.channel} • Chaincode: {meta?.chaincode}
            </span>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, color: COLORS.slate400, fontWeight: 600 }}>
              Generated: {formatDateTime(meta?.generatedAt)}
            </span>
          </div>
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: 9, color: COLORS.slate400,
            textAlign: "center", marginTop: 16, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            {meta?.source}
          </p>
        </div>
      </div>
    </div>
  );
}

// =============================================
// STYLES OBJECT
// =============================================
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: COLORS.slate100,
    padding: "20px 12px",
    fontFamily: "'Inter', sans-serif",
  },
  container: {
    maxWidth: 640,
    margin: "0 auto",
  },
  loadingContainer: {
    display: "flex", flexDirection: "column",
    justifyContent: "center", alignItems: "center",
    minHeight: "100vh", backgroundColor: COLORS.slate50,
  },
  spinner: {
    width: 40, height: 40,
    border: `4px solid ${COLORS.emerald200}`,
    borderTopColor: COLORS.emerald600,
    borderRadius: "50%",
    animation: "passport-spin 0.8s linear infinite",
  },

  // Header
  header: {
    background: `linear-gradient(135deg, ${COLORS.emerald900} 0%, ${COLORS.slate900} 100%)`,
    borderRadius: "24px 24px 0 0",
    padding: "32px 24px 28px",
    textAlign: "center",
    color: COLORS.white,
  },
  headerBadge: {
    display: "inline-block",
    fontSize: 9, fontWeight: 900,
    textTransform: "uppercase", letterSpacing: "0.2em",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: "4px 16px", borderRadius: 20,
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 22, fontWeight: 900,
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  headerSubtitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 11, fontWeight: 500,
    opacity: 0.7, margin: "0 0 16px 0",
  },
  headerBatchId: {
    fontFamily: "'Courier New', monospace",
    fontSize: 13, fontWeight: 700,
    backgroundColor: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    display: "inline-block",
    padding: "6px 20px", borderRadius: 10,
  },

  // Section Card
  sectionCard: {
    backgroundColor: COLORS.white,
    borderLeft: `1px solid ${COLORS.slate200}`,
    borderRight: `1px solid ${COLORS.slate200}`,
    borderBottom: `1px solid ${COLORS.slate200}`,
    padding: "24px 24px",
    pageBreakInside: "avoid",
  },
  sectionTitle: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14, fontWeight: 900,
    color: COLORS.slate800,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 16,
    display: "flex", alignItems: "center",
    margin: "0 0 16px 0",
  },

  // Animal Emoji
  animalEmoji: {
    width: 56, height: 56,
    backgroundColor: COLORS.emerald50,
    border: `2px solid ${COLORS.emerald200}`,
    borderRadius: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 28, flexShrink: 0,
  },

  // Detail Grid
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  },
  detailItem: {
    backgroundColor: COLORS.slate50,
    border: `1px solid ${COLORS.slate200}`,
    borderRadius: 10,
    padding: "10px 14px",
    display: "flex", flexDirection: "column",
  },
  detailLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 9, fontWeight: 900,
    textTransform: "uppercase", letterSpacing: "0.1em",
    color: COLORS.slate400, marginBottom: 4,
  },
  detailValue: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 13, fontWeight: 700,
    color: COLORS.slate800,
  },

  // Audit Detail
  auditDetail: {
    backgroundColor: COLORS.slate50,
    border: `1px solid ${COLORS.slate100}`,
    borderRadius: 6,
    padding: "6px 10px",
    display: "flex", flexDirection: "column",
    fontFamily: "'Inter', sans-serif",
  },
  auditDetailLabel: {
    fontSize: 8, fontWeight: 900,
    textTransform: "uppercase", letterSpacing: "0.1em",
    color: COLORS.slate400, marginBottom: 2,
  },

  // Footer
  footer: {
    backgroundColor: COLORS.white,
    borderLeft: `1px solid ${COLORS.slate200}`,
    borderRight: `1px solid ${COLORS.slate200}`,
    borderBottom: `1px solid ${COLORS.slate200}`,
    borderRadius: "0 0 24px 24px",
    padding: "24px 24px 20px",
  },
  footerSeal: {
    textAlign: "center",
    padding: "20px",
    backgroundColor: COLORS.emerald50,
    border: `1px solid ${COLORS.emerald200}`,
    borderRadius: 16,
  },
};

// =============================================
// PRINT STYLES
// =============================================
const printStyles = `
  @media print {
    body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { box-shadow: none !important; }
  }
`;

const fontImport = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
`;

const spinnerKeyframes = `
  @keyframes passport-spin {
    to { transform: rotate(360deg); }
  }
`;
