// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SubscriptionProvider } from "./components/context/SubscriptionContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { useAuthStore } from "./store/authStore";
import { initAutoTrack } from "./lib/analytics/autoTrack";

// Global shell components — mounted here so they live across every route.
import IncomingCallBanner from "./components/video/IncomingCallBanner";
import RouteTracker from "./lib/analytics/RouteTracker.jsx";

// Google OAuth client ID (same one used by the backend)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// ── Analytics: attach global click / scroll / error listeners once ──────────
initAutoTrack();

// Waits for Zustand to rehydrate from localStorage before
// mounting anything that makes authenticated API calls.
function HydratedApp() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return null;

  return (
    <SubscriptionProvider>
      {/* Router lives here so global components can use useNavigate / useLocation */}
      <BrowserRouter>
        {/* 🔔 Global incoming-call banner — appears on every route */}
        <IncomingCallBanner />

        {/* 📊 Route tracking for analytics */}
        <RouteTracker />

        {/* The route table (App.jsx is now just <Routes>) */}
        <App />
      </BrowserRouter>
    </SubscriptionProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <HelmetProvider>
        <ThemeProvider>
          <CurrencyProvider>
            <HydratedApp />
          </CurrencyProvider>
        </ThemeProvider>
      </HelmetProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
