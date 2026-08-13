import { useState } from "react";

import Editor from "react-simple-code-editor";

import Prism from "prismjs";

import "prismjs/components/prism-javascript";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-python";
import "prismjs/components/prism-java";
import "prismjs/components/prism-c";
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


/* ============================= */
/* LANGUAGE DETECTION */
/* ============================= */

function detectLanguage(code) {

    const text = code.trim();

    if (!text) {
        return {
            name: "Plain Text",
            prism: "plain"
        };
    }


    /* HTML */

    if (
        /<!DOCTYPE\s+html/i.test(text) ||
        /<html[\s>]/i.test(text) ||
        /<body[\s>]/i.test(text) ||
        /<div[\s>]/i.test(text)
    ) {
        return {
            name: "HTML",
            prism: "markup"
        };
    }


    /* CSS */

    if (
        /[.#]?[a-zA-Z][\w-]*\s*\{[\s\S]*:[\s\S]*;[\s\S]*\}/.test(text)
    ) {
        return {
            name: "CSS",
            prism: "css"
        };
    }


    /* C++ */

    if (
        /#include\s*<iostream>/.test(text) ||
        /#include\s*<vector>/.test(text) ||
        /#include\s*<string>/.test(text) ||
        /using\s+namespace\s+std\s*;/.test(text) ||
        /\bstd::/.test(text) ||
        /\bcout\s*<</.test(text) ||
        /\bcin\s*>>/.test(text)
    ) {
        return {
            name: "C++",
            prism: "cpp"
        };
    }


    /* C */

    if (
        /#include\s*<stdio\.h>/.test(text) ||
        /\bprintf\s*\(/.test(text) ||
        /\bscanf\s*\(/.test(text)
    ) {
        return {
            name: "C",
            prism: "c"
        };
    }


    /* C# */

    if (
        /using\s+System\s*;/.test(text) ||
        /\bConsole\.WriteLine\s*\(/.test(text) ||
        /\bnamespace\s+\w+/.test(text)
    ) {
        return {
            name: "C#",
            prism: "csharp"
        };
    }


    /* Java */

    if (
        /public\s+class\s+\w+/.test(text) ||
        /public\s+static\s+void\s+main/.test(text) ||
        /System\.out\.println\s*\(/.test(text)
    ) {
        return {
            name: "Java",
            prism: "java"
        };
    }


    /* Python */

    if (
        /\bdef\s+\w+\s*\(/.test(text) ||
        /\bimport\s+\w+/.test(text) ||
        /\bfrom\s+\w+\s+import\b/.test(text) ||
        /\bprint\s*\(/.test(text) ||
        /:\s*\n\s{4,}/.test(text)
    ) {
        return {
            name: "Python",
            prism: "python"
        };
    }


    /* JavaScript */

    if (
        /\b(const|let|var)\s+\w+/.test(text) ||
        /\bfunction\s+\w+\s*\(/.test(text) ||
        /=>/.test(text) ||
        /\bconsole\.log\s*\(/.test(text) ||
        /\b(document|window)\./.test(text)
    ) {
        return {
            name: "JavaScript",
            prism: "javascript"
        };
    }


    /* Default */

    return {
        name: "Plain Text",
        prism: "plain"
    };
}


/* ============================= */
/* APP */
/* ============================= */

function App() {

    const [code, setCode] = useState(`function sum() {
  return a + b
}`);


    const [review, setReview] = useState("");

    const [mode, setMode] = useState("");

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState("");


    /* Full / Selected Code */

    const [reviewScope, setReviewScope] = useState("full");


    /* Selected code */

    const [selectedCode, setSelectedCode] = useState("");


    /* Detect language automatically */

    const language = detectLanguage(code);


    /* ============================= */
    /* SCORE EXTRACTION */
    /* ============================= */

    function extractScores(reviewText) {

        const cleanText = reviewText.replace(/\*/g, "");


        const getScore = (name) => {

            const regex = new RegExp(
                name +
                "\\s*:\\s*(\\d+(?:\\.\\d+)?)\\s*/\\s*10",
                "i"
            );


            const match = cleanText.match(regex);


            return match
                ? Number(match[1])
                : null;
        };


        return {

            codeQuality:
                getScore("Code Quality"),

            performance:
                getScore("Performance"),

            security:
                getScore("Security"),

            readability:
                getScore("Readability"),

            maintainability:
                getScore("Maintainability"),

            overall:
                getScore("Overall Score")

        };
    }


    /* ============================= */
    /* CODE SELECTION */
    /* ============================= */

    function handleCodeSelect(event) {

        const textarea = event.target;


        const start =
            textarea.selectionStart;


        const end =
            textarea.selectionEnd;


        const selectedText =
            code.substring(start, end);


        setSelectedCode(selectedText);
    }


    /* ============================= */
    /* REVIEW CODE */
    /* ============================= */

    async function reviewCode() {

        if (!code.trim()) {

            setError(
                "Please enter some code first."
            );

            return;
        }


        /* Selected Code validation */

        if (
            reviewScope === "selected" &&
            !selectedCode.trim()
        ) {

            setError(
                "Please select some code first for Selected Code Review."
            );

            return;
        }


        setLoading(true);

        setError("");

        setReview("");

        setMode("");


        try {

            const codeToReview =
                reviewScope === "selected"
                    ? selectedCode
                    : code;


            const response = await axios.post(

                "https://code-reviewer-s0ya.onrender.com/ai/get-review",

                {
                    code: codeToReview,
                    language: language.name
                }

            );


            console.log(
                "FULL RESPONSE:",
                response.data
            );


            setReview(
                response.data.review
            );


            setMode(
                response.data.mode
            );


        } catch (error) {

            console.error(
                "Review Error:",
                error
            );


            setError(

                error.response?.data?.message ||

                "Something went wrong while reviewing the code."

            );

        } finally {

            setLoading(false);
        }
    }


    const scores =
        review
            ? extractScores(review)
            : null;


    /* ============================= */
    /* PRISM HIGHLIGHT */
    /* ============================= */

    function highlightCode(codeText) {

        const grammar =
            Prism.languages[language.prism];


        if (!grammar) {
            return codeText;
        }


        return Prism.highlight(
            codeText,
            grammar,
            language.prism
        );
    }


    return (

        <main className="app">


            {/* ============================= */}
            {/* LEFT SIDE */}
            {/* ============================= */}

            <section className="editor-section">


                <div className="editor-header">

                    <div>

                        <h2>
                            Code
                        </h2>


                        <span>
                            {language.name}
                        </span>

                    </div>

                </div>


                {/* REVIEW SCOPE */}

                <div className="review-scope">

                    <span className="scope-title">
                        Review Scope
                    </span>


                    <label className="scope-option">

                        <input
                            type="radio"
                            name="reviewScope"
                            value="full"
                            checked={
                                reviewScope === "full"
                            }
                            onChange={() => {

                                setReviewScope(
                                    "full"
                                );

                                setError("");
                            }}
                        />


                        <span>
                            Full Code
                        </span>

                    </label>


                    <label className="scope-option">

                        <input
                            type="radio"
                            name="reviewScope"
                            value="selected"
                            checked={
                                reviewScope === "selected"
                            }
                            onChange={() => {

                                setReviewScope(
                                    "selected"
                                );

                                setError("");
                            }}
                        />


                        <span>
                            Selected Code
                        </span>

                    </label>

                </div>


                {/* EDITOR */}

                <div className="editor-container">


                    <CodeEditor

                        value={code}


                        onValueChange={(newCode) => {

                            setCode(newCode);

                            setSelectedCode("");

                            setReview("");

                        }}


                        onSelect={
                            handleCodeSelect
                        }


                        highlight={
                            highlightCode
                        }


                        padding={15}


                        style={{

                            fontFamily:
                                '"Fira Code", "Fira Mono", monospace',

                            fontSize: 16,

                            minHeight: "500px",

                            width: "100%",

                            backgroundColor:
                                "#2d2d2d"

                        }}

                    />


                    {/* REVIEW BUTTON */}

                    <button

                        className="review-button"

                        onClick={
                            reviewCode
                        }

                        disabled={
                            loading
                        }

                    >

                        {
                            loading
                                ? "Reviewing..."
                                : "Review"
                        }

                    </button>


                </div>


            </section>


            {/* ============================= */}
            {/* RIGHT SIDE */}
            {/* ============================= */}

            <section className="review-section">


                <div className="review-header">


                    <h2>
                        AI Code Review
                    </h2>


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

                {!loading &&
                    !error &&
                    review &&
                    scores && (

                        <div className="score-section">


                            <div className="overall-score">


                                <span className="score-label">

                                    Overall Score

                                </span>


                                <span className="overall-number">

                                    {
                                        scores.overall ??
                                        "—"
                                    }

                                    <small>
                                        /10
                                    </small>

                                </span>


                            </div>


                            <div className="score-grid">


                                <div className="score-card">

                                    <span>
                                        Code Quality
                                    </span>


                                    <strong>
                                        {
                                            scores.codeQuality ??
                                            "—"
                                        }/10
                                    </strong>

                                </div>


                                <div className="score-card">

                                    <span>
                                        Performance
                                    </span>


                                    <strong>
                                        {
                                            scores.performance ??
                                            "—"
                                        }/10
                                    </strong>

                                </div>


                                <div className="score-card">

                                    <span>
                                        Security
                                    </span>


                                    <strong>
                                        {
                                            scores.security ??
                                            "—"
                                        }/10
                                    </strong>

                                </div>


                                <div className="score-card">

                                    <span>
                                        Readability
                                    </span>


                                    <strong>
                                        {
                                            scores.readability ??
                                            "—"
                                        }/10
                                    </strong>

                                </div>


                                <div className="score-card">

                                    <span>
                                        Maintainability
                                    </span>


                                    <strong>
                                        {
                                            scores.maintainability ??
                                            "—"
                                        }/10
                                    </strong>

                                </div>


                            </div>


                        </div>

                    )}


                {/* REVIEW */}

                {!loading &&
                    !error &&
                    review && (

                        <div className="review-content">


                            <Markdown
                                rehypePlugins={[
                                    rehypeHighlight
                                ]}
                            >

                                {
                                    review.replace(
                                        /## 📊 Score[\s\S]*?(?=## 🎯 Final Recommendation|$)/,
                                        ""
                                    )
                                }

                            </Markdown>


                        </div>

                    )}


                {/* EMPTY */}

                {!loading &&
                    !error &&
                    !review && (

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