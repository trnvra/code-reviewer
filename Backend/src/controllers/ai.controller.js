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

No major security vulnerabilities were identified in this example.

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