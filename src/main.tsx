import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { unlockPreview } from "./lib/unlock";

unlockPreview();

const rootEl = document.getElementById("root");
if (rootEl) {
  rootEl.style.minHeight = "100vh";
  rootEl.style.background = "#04180f";
  createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
