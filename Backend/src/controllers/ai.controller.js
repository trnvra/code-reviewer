const aiService = require("../services/ai.service");

const demoReview = `
## 🟡 Demo/Fallback Review

> AI service is temporarily unavailable.
> This is a demo review so that the application can continue working.

## 🧠 Summary

The submitted code appears to contain a simple function that calculates
the sum of two values.

## 🔴 Critical Issues

No critical security issues found.

## 🟡 Issues & Improvements

### 1. Function Parameters

Make sure the function receives the required values through parameters
instead of relying on variables from the global scope.

### 2. Input Validation

Consider validating the input when the function is used with external data.

## ⚡ Performance

Analyze the time and space complexity of the code.

Always use this format:

- Time Complexity: O(...)
- Space Complexity: O(...)
- Explanation: Explain why this complexity occurs in simple language.
- Optimization: Mention a better approach if one exists.

If the code has loops, nested loops, recursion, sorting, searching, or data structures, consider them carefully when calculating complexity.

Do not guess complexity. Base it on the actual code.

## 🔐 Security

Analyze the code for actual security vulnerabilities and unsafe practices.

Always use this format:

If security issues are found:

### Security Issue 1
- Severity: High / Medium / Low
- Location: Mention the exact line or code section
- Problem: Explain the security vulnerability
- Risk: Explain what could happen because of it
- Fix: Give the practical fix

If multiple security issues exist, continue with Security Issue 2, Security Issue 3, etc.

If no security issues are found, write:

No security vulnerabilities found.

Important:
- Only report real or strong potential security vulnerabilities.
- Do not treat normal coding style or performance issues as security problems.
- Consider issues such as injection, unsafe input handling, hardcoded secrets, authentication/authorization problems, insecure file handling, buffer overflows, memory safety, and exposed sensitive data when relevant.
- Do not invent vulnerabilities that are not supported by the code.

## ✅ Good Things

- Function name is simple and meaningful.
- The operation itself is efficient.
- The implementation is easy to understand.

## 🔧 Recommended Code

\`\`\`javascript
function sum(a, b) {
    return a + b;
}
\`\`\`

## 📊 Score

Code Quality: 8/10
Performance: 10/10
Security: 9/10
Readability: 9/10
Maintainability: 8/10

Overall Score: 8.8/10

## 🎯 Final Recommendation

Keep the implementation simple and make sure inputs are explicitly
passed to the function.
`;

module.exports.getReview = async (req, res) => {

    try {

        const code = req.body.code;

        if (!code) {
            return res.status(400).send("code is required");
        }

        const response = await aiService(code);

        return res.status(200).json({
            success: true,
            mode: "ai",
            review: response
        });

    } catch (error) {

        console.error("AI Review Error:", error);

        // AI service failed → Demo/Fallback Mode
        return res.status(200).json({
            "success": true,
            "mode": "demo",
            "message": "AI service is temporarily unavailable...",
            "review": "..."
        });
    }
};

module.exports.explainCode = async (req, res) => {

    try {

        const code = req.body.code;
        const language = req.body.language || "Unknown";

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "code is required"
            });
        }

        const prompt = `
Explain the following ${language} code in simple and beginner-friendly language.

Use exactly this structure:

## 🧠 Code Explanation

### What this code does
Explain the main purpose of the code in simple words.

### Step-by-step explanation
Explain how the code works step by step.

### Important variables
Explain the important variables and what they store.

### How the logic works
Explain the main logic of the program.

### Example / Dry Run
Give a small example or dry run when possible.

Important:
- Do not review or criticize the code.
- Do not give scores.
- Do not suggest optimizations unless necessary for understanding.
- Focus only on explaining the existing code.
- Keep the explanation beginner-friendly.

Code:

\`\`\`${language}
${code}
\`\`\`
`;

        const response = await aiService(prompt);

        return res.status(200).json({
            success: true,
            mode: "ai",
            explanation: response
        });

    } catch (error) {

        console.error("AI Explain Error:", error);

        return res.status(200).json({
            success: true,
            mode: "demo",
            explanation: "AI explanation is temporarily unavailable."
        });
    }
};