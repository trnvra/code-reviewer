import { useState, useEffect, useRef, useCallback } from "react";

import Editor from "react-simple-code-editor";

import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/themes/prism-tomorrow.css";

import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

import axios from "axios";
import "./App.css";

const CodeEditor = Editor.default || Editor;
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/ai";

/* ============================================================
   LANGUAGE DETECTION
   ============================================================ */

function detectLanguage(code) {
  const text = code.trim();
  if (!text) return { name: "Plain Text", prism: "plain", short: "TXT" };

  // Bash/Shell
  if (/^#!\/bin\/(bash|sh|zsh)/.test(text) || /\bsudo\s+apt-get\b/.test(text) || /\bexport\s+\w+=/.test(text) || /\bmkdir\s+-p\b/.test(text)) {
    return { name: "Bash", prism: "bash", short: "BASH" };
  }
  // HTML
  if (/<!DOCTYPE\s+html/i.test(text) || /<html[\s>]/i.test(text) || /<body[\s>]/i.test(text) || /<div[\s>]/i.test(text) || /<script[\s>]/i.test(text)) {
    return { name: "HTML", prism: "markup", short: "HTML" };
  }
  // PHP
  if (/<\?php/i.test(text) || /\bnamespace\s+.*\\.*/i.test(text) || /\becho\s+["'].*["'];/i.test(text) || /\b\$this->\b/.test(text)) {
    return { name: "PHP", prism: "php", short: "PHP" };
  }
  // CSS
  if (/[.#]?[a-zA-Z][\w-]*\s*\{[\s\S]*:[\s\S]*;[\s\S]*\}/.test(text) && !/class\s+\w+/.test(text)) {
    return { name: "CSS", prism: "css", short: "CSS" };
  }
  // SQL
  if (/\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|CREATE\s+TABLE|DROP\s+TABLE|ALTER\s+TABLE)\b/i.test(text)) {
    return { name: "SQL", prism: "sql", short: "SQL" };
  }
  // C++
  if (/#include\s*<iostream>/.test(text) ||
    /using\s+namespace\s+std\s*;/.test(text) ||
    /\bcout\s*<</.test(text) ||
    /\bstd::cout\b/.test(text) ||
    /\bvector\s*</.test(text) ||
    /\bstd::vector\b/.test(text) ||
    /\bpublic\s*:/i.test(text) ||
    /\bprivate\s*:/i.test(text) ||
    /\bprotected\s*:/i.test(text) ||
    /\bstring\s*&\s*\w+/i.test(text) ||
    /\bclass\s+Solution\b/i.test(text)) {
    return { name: "C++", prism: "cpp", short: "CPP" };
  }
  // Rust
  if (/\bfn\s+main\b/.test(text) || /\blet\s+mut\s+/.test(text) || /\buse\s+std::/.test(text) || /impl\s+\w+\s+for\s+\w+/.test(text)) {
    return { name: "Rust", prism: "rust", short: "RS" };
  }
  // Go
  if (/\bpackage\s+main\b/.test(text) || /\bfunc\s+main\b/.test(text) || /\bimport\s+["']fmt["']/.test(text)) {
    return { name: "Go", prism: "go", short: "GO" };
  }
  // C#
  if (/\busing\s+System\b/.test(text) || /\bConsole\.WriteLine\s*\(/.test(text) || /\bnamespace\s+\w+/.test(text)) {
    return { name: "C#", prism: "csharp", short: "C#" };
  }
  // C
  if (/#include\s*<\w+\.h>/.test(text) || /\bprintf\s*\(/.test(text)) {
    return { name: "C", prism: "c", short: "C" };
  }
  // Java
  if (/public\s+class\s+\w+/.test(text) || /public\s+static\s+void\s+main/.test(text) || /System\.out\.println\s*\(/.test(text)) {
    return { name: "Java", prism: "java", short: "JAVA" };
  }
  // Python
  if (/\bdef\s+\w+\s*\(/.test(text) || /\bimport\s+\w+/.test(text) || /\bprint\s*\(/.test(text) || (/:[\t ]*\n[\t ]{4,}/.test(text) && !/\b(public|private|protected)\s*:/i.test(text))) {
    return { name: "Python", prism: "python", short: "PY" };
  }
  // Ruby
  if (/\bdef\s+\w+[\s\S]*?\bend\b/.test(text) || /\bputs\s+["']/.test(text) || /\battr_accessor\b/.test(text)) {
    return { name: "Ruby", prism: "ruby", short: "RB" };
  }
  // Swift
  if (/\bimport\s+Foundation\b/.test(text) || /\bimport\s+UIKit\b/.test(text) || /\bfunc\s+\w+\(.*\)\s*->/.test(text)) {
    return { name: "Swift", prism: "swift", short: "SWIFT" };
  }
  // Kotlin
  if (/\bfun\s+main\b/.test(text) || /\bval\s+\w+\s*[:=]/.test(text) || /\bimport\s+kotlin\./.test(text)) {
    return { name: "Kotlin", prism: "kotlin", short: "KT" };
  }
  // TypeScript
  if (/\btype\s+\w+\s*=/.test(text) || /\binterface\s+\w+/.test(text) || /:\s*(string|number|boolean|any|void)\b/.test(text)) {
    return { name: "TypeScript", prism: "typescript", short: "TS" };
  }
  // JavaScript
  if (/\b(const|let|var)\s+\w+/.test(text) || /\bfunction\s+\w+\s*\(/.test(text) || /=>/.test(text) || /\bconsole\.log\s*\(/.test(text)) {
    return { name: "JavaScript", prism: "javascript", short: "JS" };
  }
  return { name: "Plain Text", prism: "plain", short: "TXT" };
}



/* Extract largest code block from markdown */
function extractCodeBlock(markdown) {
  const matches = [...(markdown || "").matchAll(/```[\w]*\n?([\s\S]*?)```/g)];
  if (!matches.length) return null;
  return matches.reduce((a, b) => a[1].length > b[1].length ? a : b)[1].trimEnd();
}

/* Simple line-diff (LCS-based) */
function computeLineDiff(original, fixed) {
  const a = original.split("\n");
  const b = fixed.split("\n");
  if (a.length + b.length > 400) return null; // skip diff for very large files
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const ops = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) { ops.push({ t: "ctx", s: a[i - 1] }); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) { ops.push({ t: "add", s: b[j - 1] }); j--; }
    else { ops.push({ t: "del", s: a[i - 1] }); i--; }
  }
  return ops.reverse();
}

/* Extract severity counts from review markdown */
function extractSeverities(text) {
  const t = (text || "").toLowerCase();
  return {
    critical: (t.match(/severity:\s*critical/g) || []).length,
    high: (t.match(/severity:\s*high/g) || []).length,
    medium: (t.match(/severity:\s*medium/g) || []).length,
    low: (t.match(/severity:\s*low/g) || []).length,
  };
}

/* ============================================================
   SCORE EXTRACTION
   ============================================================ */

function extractScores(reviewText) {
  const cleanText = reviewText.replace(/\*/g, "");
  const getScore = (name) => {
    const regex = new RegExp(name + "\\s*:\\s*(\\d+(?:\\.\\d+)?)\\s*/\\s*10", "i");
    const match = cleanText.match(regex);
    return match ? Number(match[1]) : null;
  };
  return {
    codeQuality: getScore("Code Quality"),
    performance: getScore("Performance"),
    security: getScore("Security"),
    readability: getScore("Readability"),
    maintainability: getScore("Maintainability"),
    overall: getScore("Overall Score"),
  };
}

function computeHealthScore(scores) {
  const vals = [scores.codeQuality, scores.performance, scores.security, scores.readability, scores.maintainability].filter(v => v !== null);
  if (!vals.length) return scores.overall ? Math.round(scores.overall * 10) : 75;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10);
}

/* ============================================================
   SVG ICONS (inline, no extra dep)
   ============================================================ */

const Icons = {
  Logo: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="10" rx="2" />
      <path d="M5 7l-2 2 2 2M11 7l2 2-2 2M8 6l-1 4" />
    </svg>
  ),
  Fix: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2l1.5 1.5L10 5 8.5 3.5zM3 9l6-6 1.5 1.5-6 6zM2 12l1-3 2 2z" />
    </svg>
  ),
  Explain: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7v5M8 5v.5" strokeLinecap="round" />
    </svg>
  ),
  Review: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0z" />
      <path d="M8 5v3l2 2" strokeLinecap="round" />
    </svg>
  ),
  Editor: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 4h12M2 8h8M2 12h5" strokeLinecap="round" />
    </svg>
  ),
  History: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2.5 1.5" strokeLinecap="round" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.5 3.5l1.5 1.5M11 11l1.5 1.5M3.5 12.5L5 11M11 5l1.5-1.5" strokeLinecap="round" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5L2.5 4v4c0 3 2.5 5.5 5.5 6 3-0.5 5.5-3 5.5-6V4z" />
    </svg>
  ),
  Zap: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 1L4 9h4l-1 6 6-8H9z" strokeLinejoin="round" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2L1 14h14z" strokeLinejoin="round" />
      <path d="M8 6v4M8 11.5v.5" strokeLinecap="round" />
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v4M8 10.5v.5" strokeLinecap="round" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 8l3.5 3.5L13 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  ChevronDown: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="5" y="5" width="8" height="9" rx="1.5" />
      <path d="M3 11V3a1 1 0 0 1 1-1h8" />
    </svg>
  ),
  Code: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 5l-3 3 3 3M11 5l3 3-3 3M9 3l-2 10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Chat: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 9a1 1 0 0 1-1 1H5l-3 3V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1z" />
    </svg>
  ),
  MoreHorizontal: () => (
    <svg viewBox="0 0 16 16" fill="currentColor">
      <circle cx="3" cy="8" r="1.2" /><circle cx="8" cy="8" r="1.2" /><circle cx="13" cy="8" r="1.2" />
    </svg>
  ),
  Send: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2L2 7l5 2 2 5zM7 9l7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6.5" cy="6.5" r="4.5" />
      <path d="M10 10l3.5 3.5" strokeLinecap="round" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 2v8M5 7l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-1" strokeLinecap="round" />
    </svg>
  ),
  Refresh: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13.5 6A6 6 0 1 0 10 13" strokeLinecap="round" />
      <path d="M14 3v3h-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Magic: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 14L8 8M8 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM13 9l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Robot: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="5" width="10" height="8" rx="2" />
      <circle cx="6" cy="9" r="1" fill="currentColor" stroke="none" />
      <circle cx="10" cy="9" r="1" fill="currentColor" stroke="none" />
      <path d="M6 12h4M8 5V3M6 3h4" strokeLinecap="round" />
    </svg>
  ),
  Logout: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" strokeLinecap="round" />
      <path d="M11 11l3-3-3-3M14 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/* ============================================================
   HEALTH GAUGE COMPONENT
   ============================================================ */

function HealthGauge({ score }) {
  const r = 34;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="health-gauge">
      <svg viewBox="0 0 80 80">
        <circle className="gauge-track" cx="40" cy="40" r={r} />
        <circle
          className="gauge-fill animate"
          cx="40" cy="40" r={r}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="health-score-label">
        <span className="health-score-number">{score}</span>
        <span className="health-score-denom">/100</span>
      </div>
    </div>
  );
}

/* ============================================================
   SIDEBAR COMPONENT
   ============================================================ */

function Sidebar({ user, onLogout, history, onLoadHistory, onDeleteHistory, onNewChat }) {
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon"><Icons.Logo /></div>
        <div className="logo-text">
          <span>CodeMind</span>
          <span>AI</span>
        </div>
      </div>

      <button className="sidebar-new-chat-btn" onClick={onNewChat} title="Start a new review session">
        <Icons.Chat />
        <span>New Chat</span>
      </button>

      {history && history.length > 0 && (
        <>
          <div className="sidebar-section-label" style={{ marginTop: 16 }}>Recents</div>
          <div className="sidebar-recents-list">
            {history.map((h, i) => (
              <div key={h.id || i} className="sidebar-recent-item">
                <span className="recent-item-link" onClick={() => onLoadHistory(h)}>
                  <Icons.Code />
                  <span className="recent-item-title" title={h.title}>{h.title}</span>
                </span>
                <button
                  className="recent-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteHistory(h.id);
                  }}
                  title="Delete from history"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="sidebar-spacer" />
      <div className="sidebar-divider" />

      {/* Logout button */}
      <div
        className="sidebar-item"
        style={{ margin: "0 8px 4px", color: "var(--accent-red)", cursor: "pointer" }}
        onClick={onLogout}
        title="Sign out"
      >
        <Icons.Logout />
        Sign Out
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <span className="user-name">{user?.name || "User"}</span>
          <span className="user-tier">{user?.plan || "Pro"} Plan</span>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
   TOP NAV
   ============================================================ */

function TopNav({ activePage, setActivePage, user, onNewChat, onLogout }) {
  const tabs = [
    { id: "editor", label: "Editor", icon: Icons.Editor },
    { id: "review", label: "Review", icon: Icons.Review },
    { id: "history", label: "History", icon: Icons.History },
  ];
  const initials = user?.name
    ? user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";
  return (
    <header className="top-nav">
      <div className="top-nav-brand">
        <div className="logo-icon"><Icons.Logo /></div>
        <span className="logo-brand-text">CodeMind <span className="logo-brand-accent">AI</span></span>
      </div>
      <div className="nav-tabs">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`nav-tab ${activePage === id ? "active" : ""}`}
            onClick={() => setActivePage(id)}
          >
            <Icon /> {label}
          </button>
        ))}
      </div>
      <div className="top-nav-spacer" />
      <div className="top-nav-actions">
        <button className="top-new-chat-btn" onClick={onNewChat} title="Start a new review session">
          <Icons.Chat />
          <span>New Chat</span>
        </button>
        <div className="top-nav-user-wrap">
          <div className="top-nav-avatar" title={`${user?.name || "User"} (${user?.plan || "Pro"} Plan)`}>{initials}</div>
          <button className="top-logout-btn" onClick={onLogout} title="Sign Out">
            <Icons.Logout />
          </button>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   EDITOR PAGE
   ============================================================ */

const DEMO_FILES = {
  "main.js": `// ✍️ Write your code here...
`,
};

function EditorPage({ onReview, onExplain, onFix, loading, explainLoading, fixLoading, review, explanation, fixedCode, scores, error, explainError, sidebarTrigger, onCodeUpdate, code, setCode }) {
  const [activeFile, setActiveFile] = useState("main.js");
  const [fileCodes, setFileCodes] = useState(DEMO_FILES);

  useEffect(() => {
    setFileCodes(prev => ({ ...prev, [activeFile]: code }));
  }, [code, activeFile]);

  const [selectedCode, setSelectedCode] = useState("");
  const [activeOutput, setActiveOutput] = useState(null);
  const [fixOriginalCode, setFixOriginalCode] = useState("");

  const [leftWidth, setLeftWidth] = useState(50);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftWidth;
    const containerWidth = containerRef.current.getBoundingClientRect().width;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      let newWidth = startWidth + deltaPercent;

      if (newWidth < 20) newWidth = 20;
      if (newWidth > 80) newWidth = 80;

      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Dynamic selection listener
  useEffect(() => {
    const handleGlobalSelection = () => {
      const ta = document.querySelector(".editor-body textarea");
      if (ta) {
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        if (start !== undefined && end !== undefined && start !== end) {
          setSelectedCode(ta.value.substring(start, end));
        } else {
          if (document.activeElement === ta) {
            setSelectedCode("");
          }
        }
      }
    };

    document.addEventListener("selectionchange", handleGlobalSelection);
    return () => {
      document.removeEventListener("selectionchange", handleGlobalSelection);
    };
  }, [code]);

  // Resolve language & scope automatically
  const language = detectLanguage(code);
  const isSelectionActive = selectedCode.trim().length > 0;
  const codeToUse = isSelectionActive ? selectedCode : code;
  const scopeLabel = isSelectionActive ? "Selection" : "Full File";

  // Always keep parent state in sync with current target & detected language
  useEffect(() => {
    onCodeUpdate?.(codeToUse, language);
  }, [codeToUse, language, onCodeUpdate]);

  // Sync activeOutput when sidebar triggers an action
  useEffect(() => {
    if (sidebarTrigger) {
      setActiveOutput(sidebarTrigger.tab);
      if (sidebarTrigger.tab === "fix") {
        setFixOriginalCode(codeToUse);
      }
    }
  }, [sidebarTrigger, codeToUse]);

  function highlightCode(codeText) {
    const grammar = Prism.languages[language.prism];
    if (!grammar) return codeText;
    return Prism.highlight(codeText, grammar, language.prism);
  }

  function handleFileTab(name) {
    setFileCodes(prev => ({ ...prev, [activeFile]: code }));
    setActiveFile(name);
    setCode(fileCodes[name] || "");
    setSelectedCode("");
  }

  function handleCodeChange(newCode) {
    setCode(newCode);
    setSelectedCode("");
  }

  function handleSelectionChange(e) {
    const ta = e.target;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      if (start !== undefined && end !== undefined && start !== end) {
        setSelectedCode(ta.value.substring(start, end));
      } else {
        setSelectedCode("");
      }
    }
  }

  function handleApplyFix(fixedCodeText) {
    setCode(fixedCodeText);
    setFileCodes(prev => ({ ...prev, [activeFile]: fixedCodeText }));
    onCodeUpdate?.(fixedCodeText, detectLanguage(fixedCodeText));
  }

  return (
    <div className="editor-page" ref={containerRef}>
      <div className="editor-left" style={{ width: `${leftWidth}%`, flex: "none" }}>
        <div className="editor-file-tabs">
          {Object.keys(fileCodes).map(name => (
            <div
              key={name}
              className={`file-tab ${activeFile === name ? "active" : ""}`}
              onClick={() => handleFileTab(name)}
            >
              {name}
            </div>
          ))}
        </div>
        <div className="editor-scope-bar">
          <span className="scope-tag scope-lang">
            <span className="dot active-dot"></span> Language: <strong>{language.name}</strong>
          </span>
          <span className="scope-tag scope-type">
            Scope: <strong>{scopeLabel}</strong>
            {isSelectionActive && (
              <span className="selection-info"> ({selectedCode.trim().length} chars)</span>
            )}
          </span>
        </div>
        <div className="editor-body">
          <CodeEditor
            value={code}
            onValueChange={handleCodeChange}
            onSelect={handleSelectionChange}
            onMouseUp={handleSelectionChange}
            onKeyUp={handleSelectionChange}
            highlight={highlightCode}
            padding={16}
            style={{
              fontFamily: '"Fira Code","Fira Mono",monospace',
              fontSize: 13.5,
              minHeight: "100%",
              backgroundColor: "#13151e",
              color: "#d4d8f0",
            }}
          />
        </div>

        {/* Dedicated fixed Bottom Action Dock (No overlap!) */}
        <div className="editor-bottom-bar">
          <div className="bottom-bar-actions">
            <button
              className="bottom-btn bottom-btn-fix"
              onClick={() => {
                setActiveOutput("fix");
                setFixOriginalCode(codeToUse);
                onFix(codeToUse, language);
              }}
              disabled={fixLoading || loading || explainLoading}
            >
              <Icons.Fix />
              {fixLoading ? "Fixing…" : "Fix Code"}
            </button>
            <button
              className="bottom-btn bottom-btn-explain"
              onClick={() => {
                setActiveOutput("explain");
                onExplain(codeToUse, language);
              }}
              disabled={explainLoading || loading || fixLoading}
            >
              <Icons.Explain />
              {explainLoading ? "Explaining…" : "Explain"}
            </button>
            <button
              className="bottom-btn bottom-btn-review"
              onClick={() => {
                setActiveOutput("review");
                onReview(codeToUse, language);
              }}
              disabled={loading || explainLoading || fixLoading}
            >
              <Icons.Review />
              {loading ? "Reviewing…" : "Review"}
            </button>
          </div>
        </div>
      </div>

      <div className="split-resizer" onMouseDown={handleMouseDown} title="Drag to resize panels" />

      <div className="editor-right" style={{ width: `${100 - leftWidth}%`, flex: "none" }}>
        <div className="output-tabs">
          {[
            { id: "fix", label: "Fix Code", icon: <Icons.Fix /> },
            { id: "explain", label: "Explain", icon: <Icons.Explain /> },
            { id: "review", label: "Review", icon: <Icons.Review /> },
          ].map(tab => (
            <button
              key={tab.id}
              className={`output-tab ${activeOutput === tab.id ? "active" : ""}`}
              onClick={() => setActiveOutput(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="output-panel-body">
          {((activeOutput === "review" && loading) ||
            (activeOutput === "fix" && fixLoading) ||
            (activeOutput === "explain" && explainLoading)) ? (
            <div className="output-loading">
              <div className="spinner" />
              <p>{loading ? "Analyzing code…" : fixLoading ? "Fixing code…" : "Explaining logic…"}</p>
            </div>
          ) : activeOutput === null ? (
            <div className="output-empty">
              <div className="output-empty-icon">🤖</div>
              <div className="output-empty-title">AI Output</div>
              <div className="output-empty-desc">Click a button below to see AI-powered results here.</div>
            </div>
          ) : activeOutput === "review" ? (
            !review && !error ? (
              <div className="output-empty">
                <div className="output-empty-icon">🔍</div>
                <div className="output-empty-desc">Click <strong>Review</strong> to analyze your code.</div>
              </div>
            ) : error ? (
              <div className="error-box"><Icons.AlertCircle /> {error}</div>
            ) : (() => {
              const sev = extractSeverities(review);
              const total = sev.critical + sev.high + sev.medium + sev.low;
              return (
                <div className="output-review-content">
                  {/* Severity badges */}
                  {total > 0 && (
                    <div className="sev-badges">
                      {sev.critical > 0 && <span className="sev-badge sev-critical">🔴 Critical <b>{sev.critical}</b></span>}
                      {sev.high > 0 && <span className="sev-badge sev-high">🟠 High <b>{sev.high}</b></span>}
                      {sev.medium > 0 && <span className="sev-badge sev-medium">🟡 Medium <b>{sev.medium}</b></span>}
                      {sev.low > 0 && <span className="sev-badge sev-low">🟢 Low <b>{sev.low}</b></span>}
                    </div>
                  )}
                  {scores && (
                    <div className="output-scores">
                      {[
                        { label: "Quality", val: scores.codeQuality },
                        { label: "Performance", val: scores.performance },
                        { label: "Security", val: scores.security },
                        { label: "Readability", val: scores.readability },
                        { label: "Maintain.", val: scores.maintainability },
                      ].filter(s => s.val !== null).map(s => (
                        <div key={s.label} className="output-score-row">
                          <span className="output-score-label">{s.label}</span>
                          <div className="output-score-bar-wrap">
                            <div className="output-score-bar" style={{ width: `${s.val * 10}%`, background: s.val >= 8 ? "var(--accent-green)" : s.val >= 6 ? "var(--accent-amber)" : "var(--accent-red)" }} />
                          </div>
                          <span className="output-score-val">{s.val}/10</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="markdown-content">
                    <Markdown rehypePlugins={[rehypeHighlight]}>
                      {review.replace(/## 📊 Score[\s\S]*?(?=## 🎯 Final Recommendation|$)/, "")}
                    </Markdown>
                  </div>
                </div>
              );
            })()
          ) : activeOutput === "fix" ? (
            !fixedCode && !explainError ? (
              <div className="output-empty">
                <div className="output-empty-icon">🔧</div>
                <div className="output-empty-desc">Click <strong>Fix Code</strong> to auto-fix your code.</div>
              </div>
            ) : explainError ? (
              <div className="error-box"><Icons.AlertCircle /> {explainError}</div>
            ) : (() => {
              const extractedFix = extractCodeBlock(fixedCode);
              const diff = fixOriginalCode && extractedFix ? computeLineDiff(fixOriginalCode, extractedFix) : null;
              const hasChanges = diff && diff.some(d => d.t !== "ctx");
              return (
                <div className="output-fix-content">
                  <div className="output-fix-header">
                    <span><Icons.Fix /> {hasChanges ? "Diff View" : "Fixed Code"}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {extractedFix && (
                        <button className="apply-fix-btn" onClick={() => handleApplyFix(extractedFix)} title="Apply fix to editor">
                          ✓ Apply Fix
                        </button>
                      )}
                      <button className="copy-btn" onClick={() => navigator.clipboard.writeText(extractedFix || fixedCode)} title="Copy">
                        <Icons.Copy />
                      </button>
                    </div>
                  </div>
                  {/* GitHub-style diff */}
                  {diff && hasChanges ? (
                    <div className="diff-view">
                      {diff.map((line, i) => (
                        <div key={i} className={`diff-line diff-${line.t}`}>
                          <span className="diff-sign">{line.t === "add" ? "+" : line.t === "del" ? "-" : " "}</span>
                          <span className="diff-text">{line.s}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="markdown-content">
                      <Markdown rehypePlugins={[rehypeHighlight]}>{fixedCode}</Markdown>
                    </div>
                  )}
                </div>
              );
            })()
          ) : activeOutput === "explain" ? (
            !explanation && !explainError ? (
              <div className="output-empty">
                <div className="output-empty-icon">🧠</div>
                <div className="output-empty-desc">Click <strong>Explain</strong> to get a breakdown of your code.</div>
              </div>
            ) : explainError ? (
              <div className="error-box"><Icons.AlertCircle /> {explainError}</div>
            ) : (
              <div className="markdown-content">
                <Markdown rehypePlugins={[rehypeHighlight]}>{explanation}</Markdown>
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   REVIEW PAGE
   ============================================================ */

function IssueCard({ icon, iconClass, title, badge, badgeClass, desc, detail, snippet }) {
  const [open, setOpen] = useState(false);
  const severityClass = {
    "CRITICAL": "severity-critical",
    "WARNING": "severity-warning",
    "OPTIMIZATION": "severity-opt",
    "INFO": "severity-info",
  }[badge] || "severity-info";

  return (
    <div className={`issue-card ${severityClass}`}>
      <div className="issue-card-header" onClick={() => setOpen(o => !o)}>
        <div className={`issue-card-icon ${iconClass}`}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="issue-card-title">{title}</span>
            <span className={`issue-badge ${badgeClass}`}>{badge}</span>
          </div>
          <div className="issue-card-desc">{desc}</div>
        </div>
        <span className={`issue-chevron ${open ? "open" : ""}`}><Icons.ChevronDown /></span>
      </div>
      <div className={`issue-card-body ${open ? "expanded" : ""}`}>
        {detail && <p className="issue-detail-text">{detail}</p>}
        {snippet && <div className="issue-code-snippet">{snippet}</div>}
        <span className="issue-fix-badge"><Icons.Check /> Fixable automatically</span>
      </div>
    </div>
  );
}

function ReviewPage({ review, loading, error, scores, onDismiss }) {
  const health = scores ? computeHealthScore(scores) : null;

  const getSecurityLabel = (s) => {
    if (!s) return { label: "—", cls: "" };
    if (s < 5) return { label: "1 High Risk", cls: "chip-red" };
    if (s < 8) return { label: "2 Warnings", cls: "chip-amber" };
    return { label: "All Clear", cls: "chip-green" };
  };
  const getPerfLabel = (s) => {
    if (!s) return { label: "—", cls: "" };
    if (s < 6) return { label: "2 Warnings", cls: "chip-amber" };
    if (s < 8) return { label: "1 Warning", cls: "chip-amber" };
    return { label: "Optimized", cls: "chip-green" };
  };

  const sec = getSecurityLabel(scores?.security);
  const perf = getPerfLabel(scores?.performance);

  function handleExport() {
    if (!review) return;
    const blob = new Blob([review], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "code-review.md"; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="review-page" style={{ justifyContent: "center" }}>
        <div className="page-loading">
          <div className="spinner" />
          <p>AI is analyzing your code…</p>
        </div>
      </div>
    );
  }

  if (!review && !error) {
    return (
      <div className="review-page" style={{ justifyContent: "center" }}>
        <div className="page-empty">
          <div className="page-empty-icon">🤖</div>
          <h3>No Review Yet</h3>
          <p>Go to the <strong>Editor</strong> tab, paste your code, and click <strong>Review</strong> to get AI-driven insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="review-page">
      <div className="review-page-header">
        <div className="review-page-title">Review Analysis</div>
        <div className="review-page-subtitle">
          AI-driven insights for <span>your_code</span>
        </div>
      </div>

      <div className="review-page-topbar">
        <div />
        <div style={{ display: "flex", gap: 8 }}>
          <button className="dismiss-btn-top" onClick={onDismiss} title="Clear Analysis">
            Dismiss Analysis
          </button>
          <button className="export-btn" onClick={handleExport}>
            <Icons.Download /> Export Report
          </button>
        </div>
      </div>

      <div className="review-page-body">
        {error && (
          <div className="error-box">
            <Icons.AlertCircle /> {error}
          </div>
        )}

        {health !== null && (
          <div className="health-card">
            <HealthGauge score={health} />
            <div className="health-info">
              <div className="health-title">Health Score</div>
              <div className="health-subtitle">
                <Icons.AlertTriangle />
                {scores ? `${[scores.codeQuality, scores.performance, scores.security, scores.readability, scores.maintainability].filter(v => v !== null && v < 7).length} issues found requiring attention` : "Analysis complete"}
              </div>
            </div>
            <div className="health-chips">
              <div className="health-chip">
                <span className="health-chip-label">Security</span>
                <span className={`health-chip-value ${sec.cls}`}>{sec.label}</span>
              </div>
              <div className="health-chip">
                <span className="health-chip-label">Performance</span>
                <span className={`health-chip-value ${perf.cls}`}>{perf.label}</span>
              </div>
              {scores?.overall && (
                <div className="health-chip">
                  <span className="health-chip-label">Overall</span>
                  <span className="health-chip-value" style={{ color: "var(--accent-purple)" }}>{scores.overall}/10</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Issue Cards from scores */}
        {scores && (
          <div style={{ marginBottom: 12 }}>
            {scores.security !== null && scores.security < 7 && (
              <IssueCard
                icon={<Icons.Shield />}
                iconClass="icon-red"
                title="Security Vulnerability"
                badge="CRITICAL"
                badgeClass="badge-critical"
                desc={`Security score: ${scores.security}/10 — potential vulnerability detected`}
                detail="The AI detected security issues in your code. Review sensitive data handling, authentication flows, and input validation."
                snippet="// Review highlighted lines for security issues"
              />
            )}
            {scores.performance !== null && scores.performance < 8 && (
              <IssueCard
                icon={<Icons.Zap />}
                iconClass="icon-green"
                title="Performance Concern"
                badge="OPTIMIZATION"
                badgeClass="badge-opt"
                desc={`Performance score: ${scores.performance}/10 — optimization opportunity found`}
                detail="The AI detected inefficient patterns. Consider optimizing loops, data structures, or algorithmic complexity."
                snippet="// Consider O(n log n) or better approach here"
              />
            )}
            {scores.maintainability !== null && scores.maintainability < 7 && (
              <IssueCard
                icon={<Icons.AlertCircle />}
                iconClass="icon-amber"
                title="Maintainability Issue"
                badge="WARNING"
                badgeClass="badge-warning"
                desc={`Maintainability score: ${scores.maintainability}/10 — code structure needs improvement`}
                detail="Consider refactoring for better separation of concerns, cleaner naming, and reduced coupling."
              />
            )}
            {scores.readability !== null && scores.readability < 7 && (
              <IssueCard
                icon={<Icons.Editor />}
                iconClass="icon-purple"
                title="Readability"
                badge="INFO"
                badgeClass="badge-info"
                desc={`Readability score: ${scores.readability}/10 — documentation or naming improvements suggested`}
              />
            )}
          </div>
        )}

        {/* Full markdown review */}
        {review && (
          <div className="health-card" style={{ flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
              Full AI Analysis
            </div>
            <div className="markdown-content">
              <Markdown rehypePlugins={[rehypeHighlight]}>
                {review.replace(/## 📊 Score[\s\S]*?(?=## 🎯 Final Recommendation|$)/, "")}
              </Markdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   EXPLAIN PAGE
   ============================================================ */

const EXPLAIN_STEPS_TEMPLATE = [
  {
    num: 1,
    title: "Code Structure Analysis",
    text: "The AI first maps out the overall structure, identifying functions, classes, loops, and key logic blocks before diving into specifics.",
    done: true,
  },
  {
    num: 2,
    title: "Logic Flow Tracing",
    text: "Each branch and conditional is traced step by step to understand the full data flow and execution path.",
    done: true,
  },
  {
    num: 3,
    title: "Pattern Recognition",
    text: "Common design patterns, anti-patterns, and algorithmic structures are identified and labeled.",
    done: false,
  },
  {
    num: 4,
    title: "Summary Generation",
    text: "A beginner-friendly summary is composed, translating technical operations into simple, understandable language.",
    done: false,
  },
];

function ExplainPage({ explanation, loading, error, code, language }) {
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "I've broken down the code logic. What specific part would you like to explore further?",
      suggestions: ["What happens at the boundary condition?", "How do I test this code?"],
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  async function sendMessage(text) {
    const msg = (text || chatInput).trim();
    if (!msg) return;
    setChatInput("");
    setMessages(m => [...m, { from: "user", text: msg }]);
    setChatLoading(true);
    try {
      const context = explanation ? `\n\nContext (code explanation already provided):\n${explanation.slice(0, 500)}` : "";
      const prompt = `You are CodeMind AI. Answer this question about the code briefly (2-4 sentences max):\n\nQuestion: ${msg}${context}\n\nCode:\n\`\`\`${language?.name || ""}\n${code?.slice(0, 800) || ""}\n\`\`\``;
      const response = await axios.post(`${API_BASE}/explain-code`, { code: prompt, language: "Plain Text" });
      const reply = response.data.explanation || "I couldn't generate a response right now.";
      setMessages(m => [...m, { from: "ai", text: reply }]);
    } catch {
      setMessages(m => [...m, { from: "ai", text: "Sorry, I couldn't connect to the AI right now. Please try again." }]);
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="explain-page">
        <div className="page-loading" style={{ flex: 1 }}>
          <div className="spinner" />
          <p>AI is explaining your code…</p>
        </div>
      </div>
    );
  }

  if (!explanation && !error) {
    return (
      <div className="explain-page">
        <div className="page-empty" style={{ flex: 1 }}>
          <div className="page-empty-icon">🧠</div>
          <h3>No Explanation Yet</h3>
          <p>Go to the <strong>Editor</strong> tab and click <strong>Explain</strong> to get a step-by-step breakdown of your code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="explain-page">
      <div className="explain-page-header">
        <div className="explain-page-tag"><Icons.Explain /> Logic Breakdown</div>
        <div className="explain-page-title">Code Analysis</div>
        <div className="explain-page-desc">
          {error
            ? "There was an error generating the explanation. See details below."
            : "I've analyzed the code. Here is a simplified breakdown of the logic and structure."}
        </div>
      </div>

      <div className="explain-page-body">
        {/* Left: code + steps */}
        <div className="explain-left">
          {error && (
            <div className="error-box" style={{ marginBottom: 16 }}>
              <Icons.AlertCircle /> {error}
            </div>
          )}

          {code && (
            <div className="explain-code-block">
              <div className="code-block-header">
                <div className="code-block-filename">
                  <Icons.Code /> your_code.{language?.short?.toLowerCase() || "txt"}
                </div>
                <button className="copy-btn" onClick={() => navigator.clipboard.writeText(code)} title="Copy code">
                  <Icons.Copy />
                </button>
              </div>
              <div className="explain-code-content">
                {code.slice(0, 1200)}{code.length > 1200 ? "\n…" : ""}
              </div>
            </div>
          )}

          {explanation && (
            <div className="health-card" style={{ flexDirection: "column", alignItems: "flex-start", marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                AI Explanation
              </div>
              <div className="markdown-content">
                <Markdown rehypePlugins={[rehypeHighlight]}>{explanation}</Markdown>
              </div>
            </div>
          )}

          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
            Analysis Steps
          </div>
          <div className="step-flow">
            {EXPLAIN_STEPS_TEMPLATE.map((step) => (
              <div key={step.num} className="step-item">
                <div className="step-dot"><div className="step-dot-inner" /></div>
                <div className="step-body">
                  <div className="step-label"><span className="step-number">Step {step.num}</span></div>
                  <div className="step-title">
                    {step.title}
                    {step.done && explanation && <span className="step-check"><Icons.Check /></span>}
                  </div>
                  <div className="step-text">{step.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: chat */}
        <div className="explain-right">
          <div className="chat-header">
            <div className="chat-header-title"><Icons.Chat /> Ask CodeMind</div>
            <button className="chat-more-btn"><Icons.MoreHorizontal /></button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i}>
                {msg.from === "ai" && (
                  <div className="chat-bubble ai">
                    <div className="bubble-avatar">🤖</div>
                    {msg.text}
                    {msg.suggestions && (
                      <div className="chat-suggestions">
                        {msg.suggestions.map((s, j) => (
                          <button key={j} className="chat-suggestion" onClick={() => sendMessage(s)}>
                            "{s}"
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {msg.from === "user" && (
                  <div className="chat-bubble user">{msg.text}</div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="chat-bubble ai">
                <div className="bubble-avatar">🤖</div>
                <div className="chat-dots">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              className="chat-input"
              placeholder="Ask about this code…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            />
            <button className="chat-send-btn" onClick={() => sendMessage()}>
              <Icons.Send />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   HISTORY PAGE
   ============================================================ */

const LANG_META = {
  JavaScript: { short: "JS", cls: "lang-js" },
  Python: { short: "PY", cls: "lang-py" },
  TypeScript: { short: "TS", cls: "lang-ts" },
  Java: { short: "JAVA", cls: "lang-java" },
  "C#": { short: "C#", cls: "lang-cs" },
  "C++": { short: "CPP", cls: "lang-cpp" },
  C: { short: "C", cls: "lang-default" },
  HTML: { short: "HTML", cls: "lang-default" },
  CSS: { short: "CSS", cls: "lang-default" },
};

function HistoryPage({ history, onLoadHistory, onDeleteHistory }) {
  const [filter, setFilter] = useState("All Reviews");
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  // Use only real user history (no dummy cards)
  const allHistory = history.map((h, i) => ({
    id: h.id,
    title: h.title || `${h.language} Review`,
    language: h.language,
    date: new Date(h.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    badges: [{ label: h.type.toUpperCase(), cls: "badge-info" }],
    code: h.code,
    diff: [
      { type: "ctx", line: h.codeSnippet || "  // Reviewed code" },
    ],
    rawEntry: h
  }));

  const FILTER_OPTIONS = ["All Reviews", ...new Set(history.map(h => h.language))];

  const filtered = allHistory.filter(item => {
    const matchFilter = filter === "All Reviews" || item.language === filter;
    const matchSearch = !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.language.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="history-page">
      <div className="history-page-header">
        <div className="history-title-block">
          <div className="history-page-title">Review History</div>
          <div className="history-page-subtitle">Access your real-time review sessions. Click any card to restore the editor state.</div>
        </div>
        <div className="history-search">
          <Icons.Search />
          <input
            ref={searchRef}
            placeholder="Search reviews..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {FILTER_OPTIONS.length > 1 && (
        <div className="history-filter-row">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt}
              className={`filter-chip ${filter === opt ? "active" : ""}`}
              onClick={() => setFilter(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      <div className="history-body">
        {filtered.length === 0 ? (
          <div className="page-empty" style={{ height: "60%", justifyContent: "center" }}>
            <div className="page-empty-icon">📭</div>
            <h3>No Reviews Found</h3>
            <p>Run your first code analysis in the Editor tab to build history.</p>
          </div>
        ) : (
          <div className="history-grid">
            {filtered.map((item) => {
              const lm = LANG_META[item.language] || { short: item.language?.slice(0, 3).toUpperCase() || "?", cls: "lang-default" };
              return (
                <div key={item.id} className="history-card" onClick={() => onLoadHistory(item.rawEntry)} style={{ cursor: "pointer" }}>
                  <div className="history-card-header">
                    <div className={`history-card-lang ${lm.cls}`}>{lm.short}</div>
                    <div className="history-card-meta">
                      <div className="history-card-title">{item.title}</div>
                      <div className="history-card-date">{item.date}</div>
                    </div>
                    <button
                      className="history-card-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteHistory(item.id);
                      }}
                      title="Delete review"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="history-card-code">
                    {item.diff.map((line, j) => (
                      <div key={j} className={line.type === "add" ? "diff-add" : line.type === "del" ? "diff-del" : "diff-ctx"}>
                        {line.line}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ROOT APP
   ============================================================ */

export default function App({ user, onLogout }) {
  const [activePage, setActivePage] = useState("editor");
  const editorStateRef = useRef({ code: "", lang: { name: "Plain Text", prism: "plain", short: "TXT" } });
  const [sidebarTrigger, setSidebarTrigger] = useState(null);

  // Shared AI state
  const [review, setReview] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [error, setError] = useState("");
  const [explainError, setExplainError] = useState("");
  const [fixedCode, setFixedCode] = useState("");
  const [fixError, setFixError] = useState("");
  const [scores, setScores] = useState(null);

  // Code ref for explain page
  const [lastCode, setLastCode] = useState("");
  const [lastLang, setLastLang] = useState(null);

  // Code editor lifted state
  const [editorCode, setEditorCode] = useState(DEMO_FILES["main.js"]);

  // History (localStorage)
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("codemind_history") || "[]"); }
    catch { return []; }
  });

  function saveToHistory(type, language, code, data) {
    const title = `${language?.name || "Unknown"} ${type === "review" ? "Review" : type === "explain" ? "Explanation" : "Fix"}`;
    const entry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      language: language?.name || "Unknown",
      codeSnippet: code.slice(0, 80),
      code,
      data,
      timestamp: Date.now()
    };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, 50);
      localStorage.setItem("codemind_history", JSON.stringify(next));
      return next;
    });
  }

  async function handleReview(code, language) {
    if (!code.trim()) return;
    setLoading(true);
    setError(""); setReview(""); setScores(null);
    setLastCode(code); setLastLang(language);
    try {
      const res = await axios.post(`${API_BASE}/get-review`, { code, language: language.name });
      const rv = res.data.review || "";
      setReview(rv);
      const computedScores = extractScores(rv);
      setScores(computedScores);
      saveToHistory("review", language, code, { review: rv, scores: computedScores, activeOutput: "review" });
    } catch (e) {
      setError(e.response?.data?.message || "Something went wrong while reviewing the code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleExplain(code, language) {
    if (!code.trim()) return;
    setExplainLoading(true);
    setExplainError(""); setExplanation("");
    setLastCode(code); setLastLang(language);
    try {
      const res = await axios.post(`${API_BASE}/explain-code`, { code, language: language.name });
      const expl = res.data.explanation || "";
      setExplanation(expl);
      saveToHistory("explain", language, code, { explanation: expl, activeOutput: "explain" });
    } catch (e) {
      setExplainError(e.response?.data?.message || "Something went wrong while explaining the code.");
    } finally {
      setExplainLoading(false);
    }
  }

  async function handleFix(code, language) {
    if (!code.trim()) return;
    setFixLoading(true);
    setFixError(""); setFixedCode("");
    setLastCode(code); setLastLang(language);
    try {
      const res = await axios.post(`${API_BASE}/fix-code`, { code, language: language.name });
      const fx = res.data.fixedCode || "";
      setFixedCode(fx);
      saveToHistory("fix", language, code, { fixedCode: fx, activeOutput: "fix" });
    } catch (e) {
      setFixError(e.response?.data?.message || "Something went wrong while fixing the code.");
    } finally {
      setFixLoading(false);
    }
  }

  // History action callbacks
  function handleLoadHistory(entry) {
    setActivePage("editor");
    setEditorCode(entry.code || "");
    setReview(entry.data?.review || "");
    setScores(entry.data?.scores || null);
    setExplanation(entry.data?.explanation || "");
    setFixedCode(entry.data?.fixedCode || "");
    setSidebarTrigger({ tab: entry.data?.activeOutput || "review", ts: Date.now() });
  }

  function handleDeleteHistory(id) {
    setHistory(prev => {
      const next = prev.filter(h => h.id !== id);
      localStorage.setItem("codemind_history", JSON.stringify(next));
      return next;
    });
  }

  function handleNewChat() {
    setActivePage("editor");
    setEditorCode(DEMO_FILES["main.js"]);
    setReview("");
    setScores(null);
    setExplanation("");
    setFixedCode("");
    setSidebarTrigger({ tab: null, ts: Date.now() });
  }

  // Sidebar ops trigger real AI actions on the editor page
  function handleSetPage(id) {
    if (id === "op-fix" || id === "op-explain" || id === "op-review") {
      setActivePage("editor");
      const { code, lang } = editorStateRef.current;
      const tab = id === "op-fix" ? "fix" : id === "op-explain" ? "explain" : "review";
      setSidebarTrigger({ tab, ts: Date.now() });
      if (id === "op-fix") handleFix(code, lang);
      else if (id === "op-explain") handleExplain(code, lang);
      else handleReview(code, lang);
    } else {
      setActivePage(id);
    }
  }

  // Normalize activePage for rendering
  const renderPage = activePage;

  return (
    <div className="app-shell">
      <div className="main-area">
        <TopNav
          activePage={renderPage}
          setActivePage={handleSetPage}
          user={user}
          onNewChat={handleNewChat}
          onLogout={onLogout}
        />

        <div className="page-container">
          {renderPage === "editor" && (
            <EditorPage
              onReview={handleReview}
              onExplain={handleExplain}
              onFix={handleFix}
              loading={loading}
              explainLoading={explainLoading}
              fixLoading={fixLoading}
              review={review}
              explanation={explanation}
              fixedCode={fixedCode}
              scores={scores}
              error={error}
              explainError={fixError || explainError}
              sidebarTrigger={sidebarTrigger}
              onCodeUpdate={(code, lang) => { editorStateRef.current = { code, lang }; }}
              code={editorCode}
              setCode={setEditorCode}
            />
          )}
          {renderPage === "review" && (
            <ReviewPage
              review={review}
              loading={loading}
              error={error}
              scores={scores}
              onDismiss={() => { setReview(""); setScores(null); setError(""); }}
              onApplyFixes={() => setActivePage("editor")}
            />
          )}
          {(renderPage === "explain") && (
            <ExplainPage
              explanation={explanation}
              loading={explainLoading || fixLoading}
              error={explainError}
              code={lastCode}
              language={lastLang}
            />
          )}
          {renderPage === "history" && (
            <HistoryPage
              history={history}
              onLoadHistory={handleLoadHistory}
              onDeleteHistory={handleDeleteHistory}
            />
          )}
        </div>
      </div>
    </div>
  );
}