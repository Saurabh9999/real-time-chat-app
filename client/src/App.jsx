import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/Forgot_password";
import ResetPassword from "./pages/Reset_password";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  // In your main App.jsx or index.jsx
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ""; // shows browser's default "are you sure?" dialog
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const sync = () => setToken(localStorage.getItem("token"));

    window.addEventListener("storage", sync);
    window.addEventListener("authChange", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("authChange", sync);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/chat" /> : <Login />} />

      <Route path="/login" element={<Login />} />

      <Route path="/signup" element={<Signup />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/chat"
        element={token ? <Chat /> : <Navigate to="/" replace />}
      />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
