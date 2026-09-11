import { useState } from "react";
import axios from "axios";
import "./Auth.css";

/* ─── API Helper with dual proxy / direct fallback (Mobile + Desktop friendly) ─── */
async function postAuth(endpoint, payload) {
  const base1 = import.meta.env.VITE_AUTH_URL || "/auth";
  try {
    return await axios.post(`${base1}${endpoint}`, payload, { timeout: 6000 });
  } catch (err) {
    // If proxy failed or returned network error, fallback to direct port 3000 on current host
    if ((err.code === "ERR_NETWORK" || !err.response || err.response?.status === 404) && !import.meta.env.VITE_AUTH_URL) {
      const hostname = (typeof window !== "undefined" && window.location.hostname) ? window.location.hostname : "localhost";
      const protocol = (typeof window !== "undefined" && window.location.protocol) ? window.location.protocol : "http:";
      return await axios.post(`${protocol}//${hostname}:3000/auth${endpoint}`, payload, { timeout: 6000 });
    }
    throw err;
  }
}

/* ─── Inline SVG icons ─── */
const I = {
  Logo: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="10" rx="2" />
      <path d="M5 7l-2 2 2 2M11 7l2 2-2 2M8 6l-1 4" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5" r="3" />
      <path d="M1.5 14c0-3 3-5 6.5-5s6.5 2 6.5 5" strokeLinecap="round" />
    </svg>
  ),
  Mail: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="10" rx="2" />
      <path d="M1 4l7 5 7-5" />
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  ),
  EyeOff: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2l12 12M6.5 6.5A2 2 0 0 0 9.5 9.5M4 4.5C2.5 5.7 1 8 1 8s2.5 5 7 5c1.3 0 2.5-.4 3.5-1M7 3.1C7.3 3 7.7 3 8 3c4.5 0 7 5 7 5s-.6 1.1-1.7 2.2" strokeLinecap="round" />
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 5v4M8 10.5v.5" strokeLinecap="round" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Code: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 5l-3 3 3 3M11 5l3 3-3 3M9 3l-2 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 1L4 9h4l-1 6 6-8H9z" strokeLinejoin="round" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5L2.5 4v4c0 3 2.5 5.5 5.5 6 3-0.5 5.5-3 5.5-6V4z" />
    </svg>
  ),
};

/* ─── Password Strength ─── */
function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", cls: "" };
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return { score: 1, label: "Weak",   cls: "weak" };
  if (score === 2) return { score: 2, label: "Fair",   cls: "fair" };
  if (score === 3) return { score: 3, label: "Good",   cls: "good" };
  return             { score: 4, label: "Strong", cls: "strong" };
}

/* ============================================================
   AUTH PAGE COMPONENT
   ============================================================ */

export default function AuthPage({ onAuthSuccess }) {
  const [tab, setTab] = useState("login"); // "login" | "signup" | "reset"

  /* Form fields */
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");

  /* UI state */
  const [showPw,        setShowPw]        = useState(false);
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [success,       setSuccess]       = useState("");
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  const strength = getPasswordStrength(password);

  function resetForm() {
    setError("");
    setSuccess("");
    setShowPw(false);
    setShowConfirm(false);
  }

  function switchTab(t) {
    setTab(t);
    resetForm();
  }

  /* ─── PRESET AUTOFILL ─── */
  function handleQuickFill() {
    setEmail("tarunv281@gmail.com");
    setPassword("password123");
    setError("");
  }

  /* ─── INSTANT DEMO LOGIN (Zero friction) ─── */
  async function handleDemoLogin(targetEmail = "tarunv281@gmail.com") {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await postAuth("/demo-login", { email: targetEmail });
      if (res.data.success) {
        localStorage.setItem("codemind_token", res.data.token);
        localStorage.setItem("codemind_user", JSON.stringify(res.data.user));
        setSuccess(`Signed in as ${res.data.user.name}! Redirecting…`);
        setTimeout(() => {
          onAuthSuccess(res.data.user);
        }, 200);
        return;
      }
    } catch {
      // Backend not running or offline: seamless local session
      const fallbackUser = {
        id: "demo-user-offline",
        name: targetEmail.includes("tarun") ? "Tarun Verma" : "Demo Developer",
        email: targetEmail,
        plan: "Pro",
        createdAt: new Date().toISOString()
      };
      localStorage.setItem("codemind_token", "demo-offline-token-" + Date.now());
      localStorage.setItem("codemind_user", JSON.stringify(fallbackUser));
      setSuccess(`Signed in in Demo Mode! Redirecting…`);
      setTimeout(() => {
        onAuthSuccess(fallbackUser);
      }, 200);
    } finally {
      setLoading(false);
    }
  }

  /* ─── SUBMIT HANDLER ─── */
  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    /* Client-side validation */
    if (!email.trim()) {
      return setError("Please enter your email address.");
    }

    if (tab === "signup") {
      if (!name.trim()) return setError("Please enter your full name.");
      if (password !== confirm) return setError("Passwords do not match.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
    }

    if (tab === "reset") {
      if (password.length < 6) return setError("New password must be at least 6 characters.");
      if (confirm && password !== confirm) return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      let endpoint = "/login";
      let payload = { email: email.trim(), password };

      if (tab === "signup") {
        endpoint = "/register";
        payload = { name: name.trim(), email: email.trim(), password };
      } else if (tab === "reset") {
        endpoint = "/reset-password";
        payload = { email: email.trim(), newPassword: password };
      }

      const res = await postAuth(endpoint, payload);

      if (res.data.success) {
        localStorage.setItem("codemind_token", res.data.token);
        localStorage.setItem("codemind_user", JSON.stringify(res.data.user));

        let msg = "Login successful! Redirecting…";
        if (tab === "signup") msg = "Account created successfully! Redirecting…";
        if (tab === "reset") msg = "Password reset! Signed in successfully…";

        setSuccess(msg);
        setTimeout(() => {
          onAuthSuccess(res.data.user);
        }, 250);
      }
    } catch (err) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.code === "ERR_NETWORK" || !err.response) {
        setIsOfflineMode(true);
        setError("Unable to connect to backend server. You can still continue in Demo Mode.");
      } else {
        setError("Authentication error. Please try again or use 1-Click Demo Login.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-root">

      {/* ─── LEFT: Branding ─── */}
      <div className="auth-left">

        <div className="auth-brand">
          <div className="auth-brand-icon"><I.Code /></div>
          <div>
            <div className="auth-brand-name">CodeMind AI</div>
            <div className="auth-brand-tag">AI-Powered Code Review</div>
          </div>
        </div>

        <div className="auth-hero">
          <h1 className="auth-hero-title">
            Review, Fix &<br />
            <span>Understand</span> code<br />
            with AI
          </h1>
          <p className="auth-hero-desc">
            CodeMind AI gives you instant, actionable code reviews powered by Gemini AI. Detect bugs, security flaws, and performance issues in seconds.
          </p>

          <div className="auth-features">
            <div className="auth-feature">
              <div className="auth-feature-icon feat-purple"><I.Code /></div>
              <div>
                <div className="auth-feature-title">Instant Code Review</div>
                <div className="auth-feature-desc">Get detailed analysis with a health score, issue cards, and fix suggestions.</div>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon feat-green"><I.Zap /></div>
              <div>
                <div className="auth-feature-title">Auto Fix & Explain</div>
                <div className="auth-feature-desc">One-click fixes and step-by-step logic breakdowns for any language.</div>
              </div>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon feat-amber"><I.Shield /></div>
              <div>
                <div className="auth-feature-title">Security Analysis</div>
                <div className="auth-feature-desc">Detect vulnerabilities, hardcoded secrets, and injection risks automatically.</div>
              </div>
            </div>
          </div>

          <div className="auth-testimonial">
            <div className="auth-testimonial-quote">
              "CodeMind AI caught a critical JWT vulnerability in our auth service that we'd missed for months. It's like having a senior engineer on call 24/7."
            </div>
            <div className="auth-testimonial-author">
              <div className="auth-testimonial-avatar">R</div>
              <div>
                <div className="auth-testimonial-name">Rahul Sharma</div>
                <div className="auth-testimonial-role">Senior Engineer, Razorpay</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RIGHT: Form ─── */}
      <div className="auth-right">
        <div className="auth-card">

          {/* ─── QUICK ACCESS / INSTANT LOGIN CARD ─── */}
          <div className="auth-quick-card">
            <div className="auth-quick-header">
              <div className="auth-quick-badge">Instant 1-Click Access</div>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>No password required</span>
            </div>
            <div className="auth-quick-actions">
              <button
                type="button"
                className="auth-quick-btn"
                onClick={() => handleDemoLogin("tarunv281@gmail.com")}
                disabled={loading}
              >
                👑 Tarun Verma
              </button>
              <button
                type="button"
                className="auth-quick-btn secondary"
                onClick={() => handleDemoLogin("demo@codemind.com")}
                disabled={loading}
              >
                ⚡ Guest / Demo
              </button>
            </div>
            <div className="auth-preset-hint">
              <span>💡 Test Credentials: <code className="auth-preset-code">password123</code></span>
              <button type="button" className="auth-preset-btn" onClick={handleQuickFill}>
                Auto-Fill Inputs
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab ${tab === "login"  ? "active" : ""}`}
              onClick={() => switchTab("login")}
            >
              Sign In
            </button>
            <button
              className={`auth-tab ${tab === "signup" ? "active" : ""}`}
              onClick={() => switchTab("signup")}
            >
              Create Account
            </button>
            {tab === "reset" && (
              <button className="auth-tab active" onClick={() => switchTab("reset")}>
                Reset Password
              </button>
            )}
          </div>

          {/* Welcome text */}
          <div className="auth-welcome">
            {tab === "login" && (
              <>
                <div className="auth-welcome-title">Welcome back 👋</div>
                <div className="auth-welcome-sub">Sign in to continue to CodeMind AI.</div>
              </>
            )}
            {tab === "signup" && (
              <>
                <div className="auth-welcome-title">Create your account 🚀</div>
                <div className="auth-welcome-sub">Get started with free AI code reviews today.</div>
              </>
            )}
            {tab === "reset" && (
              <>
                <div className="auth-welcome-title">Reset your password 🔑</div>
                <div className="auth-welcome-sub">Enter your email and choose a new password.</div>
              </>
            )}
          </div>

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>

            {/* Name (signup only) */}
            {tab === "signup" && (
              <div className="auth-field">
                <label className="auth-label">Full Name</label>
                <div className="auth-input-wrap">
                  <input
                    id="auth-name"
                    className="auth-input"
                    type="text"
                    placeholder="Tarun Verma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoComplete="name"
                    autoFocus
                  />
                  <div className="auth-input-icon"><I.User /></div>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <input
                  id="auth-email"
                  className="auth-input"
                  type="email"
                  placeholder="tarunv281@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus={tab === "login"}
                />
                <div className="auth-input-icon"><I.Mail /></div>
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="auth-label">
                  {tab === "reset" ? "New Password" : "Password"}
                </label>
                {tab === "login" && (
                  <div className="auth-forgot">
                    <button type="button" onClick={() => switchTab("reset")}>
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
              <div className="auth-input-wrap">
                <input
                  id="auth-password"
                  className="auth-input"
                  type={showPw ? "text" : "password"}
                  placeholder={tab === "login" ? "••••••••" : "Min. 6 characters"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                />
                <div className="auth-input-icon"><I.Lock /></div>
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(s => !s)}>
                  {showPw ? <I.EyeOff /> : <I.Eye />}
                </button>
              </div>

              {/* Password strength (signup or reset) */}
              {(tab === "signup" || tab === "reset") && password && (
                <div className="pw-strength">
                  <div className="pw-strength-bars">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`pw-bar ${strength.score >= i ? `active-${strength.cls}` : ""}`}
                      />
                    ))}
                  </div>
                  <span className={`pw-strength-label pw-label-${strength.cls}`}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password (signup or reset) */}
            {(tab === "signup" || tab === "reset") && (
              <div className="auth-field">
                <label className="auth-label">Confirm Password</label>
                <div className="auth-input-wrap">
                  <input
                    id="auth-confirm"
                    className={`auth-input ${confirm && confirm !== password ? "error-input" : ""}`}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <div className="auth-input-icon"><I.Lock /></div>
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowConfirm(s => !s)}>
                    {showConfirm ? <I.EyeOff /> : <I.Eye />}
                  </button>
                </div>
              </div>
            )}

            {/* Error Message with Smart Recovery Actions */}
            {error && (
              <div className="auth-error">
                <I.AlertCircle />
                <div style={{ flex: 1 }}>
                  <span>{error}</span>
                  
                  {/* If incorrect password: offer Reset or 1-Click login */}
                  {tab === "login" && (error.toLowerCase().includes("password") || error.toLowerCase().includes("incorrect")) && (
                    <div style={{ marginTop: 4 }}>
                      <button
                        type="button"
                        className="auth-error-link"
                        onClick={() => switchTab("reset")}
                      >
                        Reset password now →
                      </button>
                      <button
                        type="button"
                        className="auth-action-btn"
                        onClick={() => handleDemoLogin(email || "tarunv281@gmail.com")}
                      >
                        ⚡ 1-Click Sign In
                      </button>
                    </div>
                  )}

                  {/* If account not found: offer Create Account */}
                  {tab === "login" && (error.toLowerCase().includes("not found") || error.toLowerCase().includes("register")) && (
                    <div style={{ marginTop: 4 }}>
                      <button
                        type="button"
                        className="auth-error-link"
                        onClick={() => switchTab("signup")}
                      >
                        Create an account with this email →
                      </button>
                    </div>
                  )}

                  {/* If already registered: offer Login or Reset */}
                  {tab === "signup" && (error.toLowerCase().includes("already") || error.toLowerCase().includes("exist")) && (
                    <div style={{ marginTop: 4 }}>
                      <button
                        type="button"
                        className="auth-error-link"
                        onClick={() => switchTab("login")}
                      >
                        Sign In instead →
                      </button>
                      <button
                        type="button"
                        className="auth-action-btn"
                        onClick={() => switchTab("reset")}
                      >
                        Reset Password
                      </button>
                    </div>
                  )}

                  {/* If network / backend connection issue */}
                  {isOfflineMode && (
                    <div>
                      <button
                        type="button"
                        className="auth-offline-btn"
                        onClick={() => handleDemoLogin(email || "tarunv281@gmail.com")}
                      >
                        🚀 Continue in Demo Mode
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="auth-success">
                <I.Check /> {success}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="auth-submit"
              className="auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <><div className="btn-spinner" /> Processing…</>
              ) : (
                <>
                  {tab === "login" && "Sign In"}
                  {tab === "signup" && "Create Account"}
                  {tab === "reset" && "Update Password & Sign In"}
                  <I.ArrowRight />
                </>
              )}
            </button>

            {/* Switch Prompts */}
            {tab === "login" && (
              <div className="auth-switch-prompt">
                Don't have an account?{" "}
                <button type="button" className="auth-switch-link" onClick={() => switchTab("signup")}>
                  Create Account
                </button>
              </div>
            )}

            {tab === "signup" && (
              <div className="auth-switch-prompt">
                Already have an account?{" "}
                <button type="button" className="auth-switch-link" onClick={() => switchTab("login")}>
                  Sign In
                </button>
              </div>
            )}

            {tab === "reset" && (
              <div className="auth-switch-prompt">
                Remembered your password?{" "}
                <button type="button" className="auth-switch-link" onClick={() => switchTab("login")}>
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Terms (signup) */}
            {tab === "signup" && (
              <p className="auth-terms">
                By creating an account, you agree to our{" "}
                <a href="#">Terms of Service</a> and{" "}
                <a href="#">Privacy Policy</a>.
              </p>
            )}

          </form>
        </div>
      </div>

    </div>
  );
}
