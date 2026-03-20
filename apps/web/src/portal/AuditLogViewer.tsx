import { useEffect, useState } from "react";
import type { ImpersonationAuditLog } from "@groombook/types";

interface Props {
  sessionId: string;
  onClose: () => void;
}

export function AuditLogViewer({ sessionId, onClose }: Props) {
  const [logs, setLogs] = useState<ImpersonationAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/impersonation/sessions/${sessionId}/audit-log`)
      .then((r) => r.json())
      .then((data) => setLogs(data as ImpersonationAuditLog[]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: "1.5rem",
          maxWidth: 600,
          width: "calc(100% - 2rem)",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Audit Log</h2>
          <button
            onClick={onClose}
            style={{
              padding: "0.25rem 0.6rem",
              border: "1px solid #d1d5db",
              borderRadius: 4,
              background: "#f9fafb",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#6b7280", fontSize: 14 }}>Loading audit log...</p>
        ) : logs.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 14 }}>No audit entries.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", color: "#6b7280" }}>Time</th>
                <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", color: "#6b7280" }}>Action</th>
                <th style={{ textAlign: "left", padding: "0.4rem 0.5rem", color: "#6b7280" }}>Page</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.4rem 0.5rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </td>
                  <td style={{ padding: "0.4rem 0.5rem" }}>{log.action}</td>
                  <td style={{ padding: "0.4rem 0.5rem", color: "#6b7280" }}>
                    {log.pageVisited ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
