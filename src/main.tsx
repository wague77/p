import React from "react";
import { createRoot } from "react-dom/client";
import { AlertTriangle } from "lucide-react";
import App from "./App";

function BootFallback({ message }: { message: string }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        margin: 0,
        background: "#04180f",
        color: "#ecfdf5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        fontFamily: "Segoe UI, system-ui, sans-serif",
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <AlertTriangle size={32} color="#fcd34d" />
        <h1 style={{ margin: "12px 0 8px", fontSize: 24 }}>Partants PMU</h1>
        <p style={{ margin: 0, lineHeight: 1.5 }}>{String(message || "Erreur de démarrage.")}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: 16,
            minHeight: 44,
            border: 0,
            borderRadius: 12,
            background: "#fbbf24",
            color: "#062214",
            fontWeight: 800,
            padding: "10px 16px",
          }}
        >
          Recharger
        </button>
      </div>
    </div>
  );
}

function start() {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;
  const root = createRoot(rootEl);
  try {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    const message = error instanceof Error ? String(error.message ?? "") : String(error ?? "");
    root.render(<BootFallback message={message || "Impossible d'ouvrir l'application."} />);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
