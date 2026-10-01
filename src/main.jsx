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

import IncomingCallBanner from "./components/video/IncomingCallBanner";
import RouteTracker from "./lib/analytics/RouteTracker.jsx";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

initAutoTrack();

function HydratedApp() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return null;

  return (
    <SubscriptionProvider>
      <BrowserRouter>
        <IncomingCallBanner />
        <RouteTracker />
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
