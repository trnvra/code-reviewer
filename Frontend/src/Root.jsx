import { useState, useEffect } from "react";
import axios from "axios";
import AuthPage from "./Auth.jsx";
import App from "./App.jsx";

const AUTH_BASE = import.meta.env.VITE_AUTH_URL || "http://localhost:3000/auth";

export default function Root() {
  const [user, setUser]       = useState(null);   // null = unknown, false = not logged in
  const [checking, setChecking] = useState(true);  // checking stored token on mount

  /* On mount: verify stored token */
  useEffect(() => {
    async function checkToken() {
      const token = localStorage.getItem("codemind_token");
      if (!token) { setChecking(false); return; }

      try {
        const res = await axios.get(`${AUTH_BASE}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          setUser(res.data.user);
        } else {
          localStorage.removeItem("codemind_token");
          localStorage.removeItem("codemind_user");
        }
      } catch {
        // Token invalid / server unreachable — fall back to stored user if available
        const stored = localStorage.getItem("codemind_user");
        if (stored) {
          try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
        } else {
          localStorage.removeItem("codemind_token");
        }
      } finally {
        setChecking(false);
      }
    }
    checkToken();
  }, []);

  function handleAuthSuccess(userData) {
    setUser(userData);
  }

  function handleLogout() {
    localStorage.removeItem("codemind_token");
    localStorage.removeItem("codemind_user");
    localStorage.removeItem("codemind_history");
    setUser(null);
  }

  /* ─── Loading splash while verifying token ─── */
  if (checking) {
    return (
      <div style={{
        width: "100vw", height: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0a0b10", gap: 16,
        fontFamily: "'Inter', sans-serif",
      }}>
        <div style={{
          width: 48, height: 48,
          background: "linear-gradient(135deg, #7c5cff, #a855f7)",
          borderRadius: 14,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 30px rgba(124,92,255,0.45)",
          marginBottom: 8,
          fontSize: 22,
        }}>
          ⌨️
        </div>
        <div style={{ color: "#e8eaf0", fontWeight: 700, fontSize: 18 }}>CodeMind AI</div>
        <div style={{
          width: 32, height: 32,
          border: "3px solid #252838",
          borderTopColor: "#7c5cff",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── Not logged in → show Auth ─── */
  if (!user) {
    return <AuthPage onAuthSuccess={handleAuthSuccess} />;
  }

  /* ─── Logged in → show main App ─── */
  return <App user={user} onLogout={handleLogout} />;
}
