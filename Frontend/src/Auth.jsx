import { useState } from "react";
import axios from "axios";
import "./Auth.css";

const AUTH_BASE = import.meta.env.VITE_AUTH_URL || "http://localhost:3000/auth";

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
  const [tab, setTab] = useState("login"); // "login" | "signup"

  /* Form fields */
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");

  /* UI state */
  const [showPw,      setShowPw]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  const strength = getPasswordStrength(password);

  function resetForm() {
    setName(""); setEmail(""); setPassword(""); setConfirm("");
    setError(""); setSuccess(""); setShowPw(false); setShowConfirm(false);
  }

  function switchTab(t) {
    setTab(t);
    resetForm();
  }

  /* ─── SUBMIT ─── */
  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setSuccess("");

    /* Client-side validation */
    if (tab === "signup") {
      if (!name.trim()) return setError("Please enter your full name.");
      if (password !== confirm) return setError("Passwords do not match.");
      if (password.length < 6) return setError("Password must be at least 6 characters.");
    }

    setLoading(true);
    try {
      const endpoint = tab === "login" ? "/login" : "/register";
      const payload  = tab === "login"
        ? { email, password }
        : { name: name.trim(), email, password };

      const res = await axios.post(`${AUTH_BASE}${endpoint}`, payload);

      if (res.data.success) {
        // Store token & user
        localStorage.setItem("codemind_token", res.data.token);
        localStorage.setItem("codemind_user",  JSON.stringify(res.data.user));

        setSuccess(tab === "login" ? "Welcome back! Redirecting…" : "Account created! Redirecting…");
        setTimeout(() => onAuthSuccess(res.data.user), 900);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
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
          </div>

          {/* Welcome text */}
          <div className="auth-welcome">
            {tab === "login" ? (
              <>
                <div className="auth-welcome-title">Welcome back 👋</div>
                <div className="auth-welcome-sub">Sign in to continue to CodeMind AI.</div>
              </>
            ) : (
              <>
                <div className="auth-welcome-title">Create your account</div>
                <div className="auth-welcome-sub">Start reviewing code smarter with AI.</div>
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
                  <I.User />
                  <input
                    id="auth-name"
                    className="auth-input"
                    type="text"
                    placeholder="Rahul Sharma"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                  <span className="auth-input-icon" style={{ pointerEvents: "none" }}></span>
                </div>
              </div>
            )}

            {/* Email */}
            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><I.Mail /></span>
                <input
                  id="auth-email"
                  className="auth-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="auth-field">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon"><I.Lock /></span>
                <input
                  id="auth-password"
                  className="auth-input"
                  type={showPw ? "text" : "password"}
                  placeholder={tab === "signup" ? "Min. 6 characters" : "Enter your password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={tab === "login" ? "current-password" : "new-password"}
                />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(s => !s)}>
                  {showPw ? <I.EyeOff /> : <I.Eye />}
                </button>
              </div>

              {/* Password strength (signup) */}
              {tab === "signup" && password && (
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

            {/* Confirm Password (signup only) */}
            {tab === "signup" && (
              <div className="auth-field">
                <label className="auth-label">Confirm Password</label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon"><I.Lock /></span>
                  <input
                    id="auth-confirm"
                    className={`auth-input ${confirm && confirm !== password ? "error-input" : ""}`}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowConfirm(s => !s)}>
                    {showConfirm ? <I.EyeOff /> : <I.Eye />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot password (login only) */}
            {tab === "login" && (
              <div className="auth-forgot">
                <button type="button">Forgot password?</button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="auth-error">
                <I.AlertCircle />
                <span>
                  {error}
                  {tab === "signup" &&
                    (error.toLowerCase().includes("already") ||
                      error.toLowerCase().includes("exist") ||
                      error.toLowerCase().includes("registered")) && (
                      <>
                        {" "}
                        <button
                          type="button"
                          className="auth-error-link"
                          onClick={() => switchTab("login")}
                        >
                          Sign In instead →
                        </button>
                      </>
                    )}
                </span>
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
                <><div className="btn-spinner" /> {tab === "login" ? "Signing in…" : "Creating account…"}</>
              ) : (
                <>{tab === "login" ? "Sign In" : "Create Account"} <I.ArrowRight /></>
              )}
            </button>

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
