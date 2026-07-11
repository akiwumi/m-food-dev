import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { trackError } from "./telemetry";
import "./styles.css";

class ErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Recover for the user, but make the crash visible in the field.
    trackError(error, info.componentStack ?? undefined);
  }
  render() {
    return this.state.failed
      ? <main style={{ padding: 24 }}><h1>MoodFood needs a fresh start.</h1><p>Your data has not been sent anywhere. Reload to continue.</p><button onClick={() => location.reload()}>Reload</button></main>
      : this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><ErrorBoundary><Suspense fallback={<div style={{ minHeight: "100vh" }} />}><App /></Suspense></ErrorBoundary></React.StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}
