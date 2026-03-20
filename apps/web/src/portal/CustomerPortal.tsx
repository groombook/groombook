import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import type { ImpersonationSession } from "@groombook/types";
import { ImpersonationBanner } from "./ImpersonationBanner.js";
import { AuditLogViewer } from "./AuditLogViewer.js";

interface Props {
  children: React.ReactNode;
}

/**
 * Wraps the app to provide impersonation state.
 * Start impersonation by navigating with ?impersonate=<clientId>.
 * The banner is non-dismissable while a session is active.
 */
export function CustomerPortal({ children }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [session, setSession] = useState<ImpersonationSession | null>(null);
  const [clientName, setClientName] = useState("");
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start session from URL param
  const impersonateClientId = searchParams.get("impersonate");

  const startSession = useCallback(
    async (clientId: string) => {
      try {
        const res = await fetch("/api/impersonation/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string; sessionId?: string };
          if (res.status === 409 && err.sessionId) {
            // Already have an active session — load it
            const existing = await fetch(`/api/impersonation/sessions/${err.sessionId}`);
            if (existing.ok) {
              setSession((await existing.json()) as ImpersonationSession);
            }
          } else {
            setError(err.error ?? `HTTP ${res.status}`);
          }
          return;
        }
        setSession((await res.json()) as ImpersonationSession);
      } catch {
        setError("Failed to start impersonation session");
      }
    },
    []
  );

  useEffect(() => {
    if (impersonateClientId && !session) {
      // Fetch client name
      fetch(`/api/clients/${impersonateClientId}`)
        .then((r) => r.json())
        .then((c: { name?: string }) => setClientName(c.name ?? "Unknown"))
        .catch(() => setClientName("Unknown"));
      void startSession(impersonateClientId);
      // Clean the URL param
      const next = new URLSearchParams(searchParams);
      next.delete("impersonate");
      setSearchParams(next, { replace: true });
    }
  }, [impersonateClientId, session, searchParams, setSearchParams, startSession]);

  // Log page visits
  useEffect(() => {
    if (!session || session.status !== "active") return;
    void fetch(`/api/impersonation/sessions/${session.id}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "page_visit", pageVisited: location.pathname }),
    });
  }, [location.pathname, session]);

  async function endSession() {
    if (!session) return;
    const res = await fetch(`/api/impersonation/sessions/${session.id}/end`, {
      method: "POST",
    });
    if (res.ok) {
      setSession(null);
      setClientName("");
    }
  }

  async function extendSession() {
    if (!session) return;
    const res = await fetch(`/api/impersonation/sessions/${session.id}/extend`, {
      method: "POST",
    });
    if (res.ok) {
      setSession((await res.json()) as ImpersonationSession);
    }
  }

  return (
    <>
      {error && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            background: "#fef2f2",
            color: "#dc2626",
            padding: "0.5rem 1rem",
            fontSize: 14,
            zIndex: 9999,
            textAlign: "center",
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: "1rem", cursor: "pointer", background: "none", border: "none", color: "#dc2626", textDecoration: "underline" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {session && session.status === "active" && (
        <ImpersonationBanner
          clientName={clientName}
          expiresAt={session.expiresAt}
          onEnd={endSession}
          onExtend={extendSession}
        />
      )}

      {/* Push content down when banner is visible */}
      <div style={{ paddingTop: session?.status === "active" ? "2.5rem" : 0 }}>
        {children}
      </div>

      {showAuditLog && session && (
        <AuditLogViewer sessionId={session.id} onClose={() => setShowAuditLog(false)} />
      )}
    </>
  );
}
