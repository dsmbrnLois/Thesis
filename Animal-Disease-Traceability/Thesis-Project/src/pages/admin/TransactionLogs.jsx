// src/pages/admin/TransactionLogs.jsx
import API_URL from "../../config/api";
import { useState, useEffect } from "react";
import { format } from "date-fns";

export default function AdminTransaction() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch(`${API_URL}/transactions`);
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    alert("CSV export coming soon 👀");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-emerald-800">
            Transaction History
          </h1>
          <p className="text-gray-600 mt-2">
            All animal disease reports submitted by users
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-emerald-100 overflow-hidden">
          {loading ? (
            <div className="p-8 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 rounded animate-pulse"
                />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-emerald-100">
                <thead className="bg-emerald-50">
                  <tr>
                    {[
                      "Username",
                      "Full Name",
                      "Contact No.",
                      "Species",
                      "Quantity",
                      "Location",
                      "Initial Observation",
                      "Diagnosed Disease",
                      "Severity",
                      "Date & Time",
                    ].map((header) => (
                      <th
                        key={header}
                        className="px-5 py-3 text-center text-xs font-bold text-emerald-800 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx, idx) => (
                    <tr
                      key={tx._id}
                      className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                    >
                      <td className="px-5 py-3 text-sm text-center">
                        {tx.username}
                      </td>
                      <td className="px-5 py-3 text-sm text-center">
                        {tx.fullName}
                      </td>
                      <td className="px-5 py-3 text-sm text-center">
                        {tx.contactNumber}
                      </td>
                      <td className="px-5 py-3 text-sm text-center">
                        {tx.species}
                      </td>
                      <td className="px-5 py-3 text-sm text-center">
                        {tx.quantity}
                      </td>
                      <td className="px-5 py-3 text-sm text-center">
                        {tx.location}
                      </td>
                      <td className="px-5 py-3 text-sm text-center">
                        {tx.healthStatus}
                      </td>

                      {/* Diagnosed Disease */}
                      <td className="px-5 py-3 text-sm text-center">
                        {tx.diagnosedDisease || "-"}
                      </td>

                      {/* Severity with colors */}
                      <td className="px-5 py-3 text-sm text-center">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            tx.severity === "safe"
                              ? "bg-green-100 text-green-800"
                              : tx.severity === "mild"
                                ? "bg-yellow-100 text-yellow-800"
                                : tx.severity === "dangerous"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {tx.severity || "Ongoing"}
                        </span>
                      </td>

                      <td className="px-5 py-3 text-xs text-center text-gray-600">
                        {tx.timestamp
                          ? format(new Date(tx.timestamp), "PPp")
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={handleDownload}
            className="bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 transition font-medium shadow-md"
          >
            Download Transaction Data
          </button>
        </div>
      </div>
    </div>
  );
}
