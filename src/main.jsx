import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SubscriptionProvider } from "./components/context/SubscriptionContext";
import { ThemeProvider } from "./context/ThemeContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <SubscriptionProvider>
        <App />
      </SubscriptionProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
