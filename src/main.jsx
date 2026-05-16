import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SubscriptionProvider } from "./components/context/SubscriptionContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { useAuthStore } from "./store/authStore";

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
    <ThemeProvider>
      <CurrencyProvider>
        <HydratedApp />
      </CurrencyProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
