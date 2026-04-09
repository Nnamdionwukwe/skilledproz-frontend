import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SubscriptionProvider } from "./components/context/SubscriptionContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <CurrencyProvider>
        <SubscriptionProvider>
          <App />
        </SubscriptionProvider>
      </CurrencyProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
