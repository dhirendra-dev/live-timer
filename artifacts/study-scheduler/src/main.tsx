import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress cross-origin errors from embedded iframes (e.g. YouTube player).
// These have no source, lineno, or error object — they are not app errors.
window.addEventListener("error", (event) => {
  if (!event.filename && !event.lineno && !event.error) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
}, true);

window.addEventListener("unhandledrejection", (event) => {
  const msg = String(event.reason);
  if (msg === "undefined" || msg === "[object Object]" || !event.reason) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
}, true);

createRoot(document.getElementById("root")!).render(<App />);
