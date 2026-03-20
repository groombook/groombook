import { useEffect, useState } from "react";

interface Props {
  clientName: string;
  expiresAt: string;
  onEnd: () => void;
  onExtend: () => void;
}

export function ImpersonationBanner({ clientName, expiresAt, onEnd, onExtend }: Props) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function tick() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Expired");
        return;
      }
      const mins = Math.floor(diff / 60_000);
      const secs = Math.floor((diff % 60_000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, "0")}`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        background: "#dc2626",
        color: "#fff",
        padding: "0.5rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 9999,
        fontSize: 14,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div>
        <strong>IMPERSONATING:</strong> {clientName} — Read-only mode
        <span style={{ marginLeft: "1rem", opacity: 0.85 }}>
          Time remaining: {remaining}
        </span>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={onExtend}
          style={{
            padding: "0.25rem 0.6rem",
            border: "1px solid rgba(255,255,255,0.5)",
            borderRadius: 4,
            background: "transparent",
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Extend
        </button>
        <button
          onClick={onEnd}
          style={{
            padding: "0.25rem 0.6rem",
            border: "1px solid #fff",
            borderRadius: 4,
            background: "#fff",
            color: "#dc2626",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          End Session
        </button>
      </div>
    </div>
  );
}
