import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { SubscriptionProvider } from "./components/context/SubscriptionContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SubscriptionProvider>
      <App />
    </SubscriptionProvider>
  </React.StrictMode>,
);
