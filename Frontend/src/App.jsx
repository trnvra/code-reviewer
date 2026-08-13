import { useState } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism-tomorrow.css";

import Markdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

import axios from "axios";
import "./App.css";

const CodeEditor = Editor.default || Editor;

function App() {
    const [code, setCode] = useState(`function sum() {
  return a + b
}`);

    const [review, setReview] = useState("");
    const [mode, setMode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Score ko AI response se nikalne ke liye
    function extractScores(text) {

        const getScore = (name) => {

            const regex = new RegExp(
                name + "\\s*:\\s*\\*?\\*?\\s*(\\d+(?:\\.\\d+)?)\\s*/\\s*10",
                "i"
            );

            const match = text.match(regex);

            return match ? Number(match[1]) : null;
        };

        return {
            codeQuality: getScore("Code Quality"),
            performance: getScore("Performance"),
            security: getScore("Security"),
            readability: getScore("Readability"),
            maintainability: getScore("Maintainability"),
            overall: getScore("Overall Score")
        };
    }


    async function reviewCode() {

        if (!code.trim()) {
            setError("Please enter some code first.");
            return;
        }

        setLoading(true);
        setError("");
        setReview("");
        setMode("");

        try {

            const response = await axios.post(
                "https://code-reviewer-s0ya.onrender.com/ai/get-review",
                { code }
            );

            console.log("FULL RESPONSE:", response.data);

            setReview(response.data.review);
            setMode(response.data.mode);

        } catch (error) {

            console.error("Review Error:", error);

            setError(
                error.response?.data?.message ||
                "Something went wrong while reviewing the code."
            );

        } finally {

            setLoading(false);

        }
    }


    const scores = review ? extractScores(review) : null;


    return (
        <main className="app">

            {/* LEFT - CODE EDITOR */}

            <section className="editor-section">

                <div className="editor-header">

                    <div>
                        <h2>Code</h2>
                        <span>JavaScript</span>
                    </div>

                </div>


                <div className="editor-container">

                    <CodeEditor
                        value={code}
                        onValueChange={code => setCode(code)}
                        highlight={code =>
                            Prism.highlight(
                                code,
                                Prism.languages.javascript,
                                "javascript"
                            )
                        }
                        padding={15}
                        style={{
                            fontFamily:
                                '"Fira Code", "Fira Mono", monospace',
                            fontSize: 16,
                            minHeight: "500px",
                            width: "100%",
                            backgroundColor: "#2d2d2d"
                        }}
                    />


                    <button
                        className="review-button"
                        onClick={reviewCode}
                        disabled={loading}
                    >
                        {loading ? "Reviewing..." : "Review"}
                    </button>

                </div>

            </section>


            {/* RIGHT - AI REVIEW */}

            <section className="review-section">

                <div className="review-header">

                    <h2>AI Code Review</h2>

                    {mode === "ai" && (
                        <span className="ai-badge">
                            🟢 AI Review
                        </span>
                    )}

                    {mode === "demo" && (
                        <span className="demo-badge">
                            🟡 Demo / Fallback
                        </span>
                    )}

                </div>


                {/* LOADING */}

                {loading && (
                    <div className="loading">

                        <div className="loader"></div>

                        <p>
                            AI is analyzing your code...
                        </p>

                    </div>
                )}


                {/* ERROR */}

                {error && (
                    <div className="error-box">
                        ❌ {error}
                    </div>
                )}


                {/* SCORE */}

                {!loading && !error && review && scores && (

                    <div className="score-section">

                        <div className="overall-score">

                            <span className="score-label">
                                Overall Score
                            </span>

                            <span className="overall-number">
                                {scores.overall ?? "—"}
                                <small>/10</small>
                            </span>

                        </div>


                        <div className="score-grid">

                            <div className="score-card">
                                <span>Code Quality</span>
                                <strong>
                                    {scores.codeQuality ?? "—"}/10
                                </strong>
                            </div>


                            <div className="score-card">
                                <span>Performance</span>
                                <strong>
                                    {scores.performance ?? "—"}/10
                                </strong>
                            </div>


                            <div className="score-card">
                                <span>Security</span>
                                <strong>
                                    {scores.security ?? "—"}/10
                                </strong>
                            </div>


                            <div className="score-card">
                                <span>Readability</span>
                                <strong>
                                    {scores.readability ?? "—"}/10
                                </strong>
                            </div>


                            <div className="score-card">
                                <span>Maintainability</span>
                                <strong>
                                    {scores.maintainability ?? "—"}/10
                                </strong>
                            </div>

                        </div>

                    </div>

                )}


                {/* REVIEW */}

                {!loading && !error && review && (

                    <div className="review-content">

                        <Markdown
                            rehypePlugins={[rehypeHighlight]}
                        >
                            {review.replace(
                                /## 📊 Score[\s\S]*?(?=## 🎯 Final Recommendation|$)/,
                                ""
                            )}
                        </Markdown>

                    </div>

                )}


                {/* EMPTY */}

                {!loading && !error && !review && (

                    <div className="empty-review">

                        <div className="empty-icon">
                            🤖
                        </div>

                        <h3>
                            Ready to review your code
                        </h3>

                        <p>
                            Write or paste your code on the left and
                            click <b>Review</b>.
                        </p>

                    </div>

                )}

            </section>

        </main>
    );
}

export default App;