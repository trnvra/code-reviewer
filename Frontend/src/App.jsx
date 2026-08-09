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

    return (
        <main className="app">

            <section className="editor-section">

                <div className="editor-header">
                    <h2>Code</h2>
                    <span>JavaScript</span>
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


                {loading && (
                    <div className="loading">
                        <div className="loader"></div>
                        <p>AI is analyzing your code...</p>
                    </div>
                )}


                {error && (
                    <div className="error-box">
                        ❌ {error}
                    </div>
                )}


                {!loading && !error && review && (
                    <div className="review-content">

                        <Markdown
                            rehypePlugins={[rehypeHighlight]}
                        >
                            {review}
                        </Markdown>

                    </div>
                )}


                {!loading && !error && !review && (
                    <div className="empty-review">

                        <div className="empty-icon">
                            🤖
                        </div>

                        <h3>Ready to review your code</h3>

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