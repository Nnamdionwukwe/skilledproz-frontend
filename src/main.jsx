// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { SubscriptionProvider } from "./components/context/SubscriptionContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { useAuthStore } from "./store/authStore";

// Google OAuth client ID (same one used by the backend)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Waits for Zustand to rehydrate from localStorage before
// mounting anything that makes authenticated API calls.
function HydratedApp() {
  const isHydrated = useAuthStore((s) => s.isHydrated);

  if (!isHydrated) return null; // or a spinner

  return (
    <SubscriptionProvider>
      <App />
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
