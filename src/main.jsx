// src/main.jsx
// ─────────────────────────────────────────────────────────────────────────────
// App entry point.
//
// Mount order (outermost → innermost):
//   GoogleOAuthProvider
//     HelmetProvider
//       ThemeProvider
//         CurrencyProvider
//           SubscriptionProvider
//             BrowserRouter
//               VoiceCallStateProvider   ← global voice-call state
//                 <IncomingCallBanner />          (booking video)
//                 <ConversationVideoCallBanner /> (conversation video)
//                 <VoiceCallBanner />             (conversation voice — ringer)
//                 <VoiceCallProvider />           (persistent full/mini widget)
//                 <RouteTracker />
//                 <App />                          (route table)
//
// Because the VoiceCallProvider and banners live ABOVE <App />, they
// survive every route change. Minimizing a voice call and navigating to
// /dashboard keeps the audio flowing.
// ─────────────────────────────────────────────────────────────────────────────

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

// Global shell — mounted once, persists across routes.
import IncomingCallBanner from "./components/video/IncomingCallBanner";
import ConversationVideoCallBanner from "./components/video/ConversationVideoCallBanner";
import VoiceCallBanner from "./components/video/VoiceCallBanner";
import VoiceCallProvider from "./components/video/VoiceCallProvider";
import RouteTracker from "./lib/analytics/RouteTracker.jsx";

// Voice-call state — provider component renamed to avoid clashing with the
// widget component of the same name.
import { VoiceCallProvider as VoiceCallStateProvider } from "./context/VoiceCallContext";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Attach global analytics listeners once.
initAutoTrack();

// Wait for Zustand to rehydrate from localStorage before mounting anything
// that makes authenticated API calls.
function HydratedApp() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  if (!isHydrated) return null;

  return (
    <SubscriptionProvider>
      <BrowserRouter>
        <VoiceCallStateProvider>
          {/* ── Global incoming-call banners ─────────────────────────── */}
          <IncomingCallBanner />
          <ConversationVideoCallBanner />
          <VoiceCallBanner />

          {/* ── Persistent voice-call widget (full-screen or mini) ───── */}
          <VoiceCallProvider />

          {/* ── Analytics + routes ───────────────────────────────────── */}
          <RouteTracker />
          <App />
        </VoiceCallStateProvider>
      </BrowserRouter>
    </SubscriptionProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <HelmetProvider>
      <ThemeProvider>
        <CurrencyProvider>
          <HydratedApp />
        </CurrencyProvider>
      </ThemeProvider>
    </HelmetProvider>
  </GoogleOAuthProvider>,
);
