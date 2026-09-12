import { useState, useEffect } from "react";
import axios from "axios";
import AuthPage from "./Auth.jsx";
import App from "./App.jsx";

export default function Root() {
  const [user, setUser]         = useState(null);   // null = unknown / not logged in
  const [checking, setChecking] = useState(true);  // checking stored token on mount

  /* On mount: verify stored token */
  useEffect(() => {
    async function checkToken() {
      const token = localStorage.getItem("codemind_token");
      if (!token) {
        setChecking(false);
        return;
      }

      // If it's an offline/demo token, load cached user immediately
      if (token.startsWith("demo-offline-token-")) {
        const stored = localStorage.getItem("codemind_user");
        if (stored) {
          try { setUser(JSON.parse(stored)); } catch { /* ignore */ }
        }
        setChecking(false);
        return;
      }

      try {
        // Try localhost:3000 directly (most reliable for local dev)
        const meUrls = [
          "http://localhost:3000/auth/me",
          "http://127.0.0.1:3000/auth/me",
        ];
        if (typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost") {
          meUrls.push(`http://${window.location.hostname}:3000/auth/me`);
        }

        let res;
        for (const url of meUrls) {
          try {
            res = await axios.get(url, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 3000
            });
            break; // success, stop trying
          } catch (err1) {
            if (err1.response && err1.response.status < 500) throw err1; // auth error, don't retry
            // network error, try next url
          }
        }

        if (res?.data?.success) {
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
