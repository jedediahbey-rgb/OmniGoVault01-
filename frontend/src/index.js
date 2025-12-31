import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// AGGRESSIVE suppression of ResizeObserver loop error (common with ReactFlow)
// This error is benign and just noise - suppress it everywhere
const RESIZE_ERROR_PATTERNS = [
  'ResizeObserver loop',
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications'
];

const isResizeObserverError = (message) => {
  if (!message) return false;
  const msg = String(message);
  return RESIZE_ERROR_PATTERNS.some(pattern => msg.includes(pattern));
};

// Override window.onerror
const originalOnerror = window.onerror;
window.onerror = (message, source, lineno, colno, error) => {
  if (isResizeObserverError(message) || isResizeObserverError(error?.message)) {
    return true; // Suppress the error
  }
  if (originalOnerror) {
    return originalOnerror(message, source, lineno, colno, error);
  }
  return false;
};

// Capture phase error listener
window.addEventListener('error', (e) => {
  if (isResizeObserverError(e.message) || isResizeObserverError(e.error?.message)) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return true;
  }
}, true);

// Unhandled rejection listener
window.addEventListener('unhandledrejection', (e) => {
  if (isResizeObserverError(e.reason?.message) || isResizeObserverError(String(e.reason))) {
    e.stopImmediatePropagation();
    e.preventDefault();
    return;
  }
});

// Override ResizeObserver to catch errors internally
const OriginalResizeObserver = window.ResizeObserver;
window.ResizeObserver = class ResizeObserver extends OriginalResizeObserver {
  constructor(callback) {
    super((entries, observer) => {
      // Use requestAnimationFrame to batch updates and avoid loop errors
      window.requestAnimationFrame(() => {
        try {
          callback(entries, observer);
        } catch (e) {
          if (!isResizeObserverError(e?.message)) {
            throw e;
          }
        }
      });
    });
  }
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
