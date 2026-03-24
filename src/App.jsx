import { BrowserRouter, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import LandingPage from "./app/LandingPage";

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          {/* Floating support chat — only renders for logged-in customers */}
          <FloatingSupportChat />
          <AppRoutes />
          <PoweredByGestech />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
    </Routes>
  );
}

export default App;
