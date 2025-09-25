import React from "react";
import { createRoot } from "react-dom/client";
import Popup from "./popup";
import "./main.css";

// Ensure DOM is loaded before rendering
function initializePopup() {
  const container = document.getElementById("root");
  
  if (!container) {
    console.error("Root container not found!");
    return;
  }

  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <Popup />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Failed to render popup:", error);
    // Fallback: show a simple HTML message
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2>FocusTracker</h2>
        <p>Loading extension...</p>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  // DOM is already loaded
  initializePopup();
}

// Also handle the case where the script loads after DOMContentLoaded
setTimeout(() => {
  if (!document.getElementById("root")?.hasChildNodes()) {
    initializePopup();
  }
}, 100);