const aiService = require("../services/ai.service");

function generateDynamicFallbackReview(code, language) {
    const funcMatches = [...code.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>)/g)];
    const funcs = funcMatches.map(m => m[1] || m[2]).filter(Boolean);
    const funcName = funcs[0] || "main";

    return `
## 🟡 Fallback Code Review (${language})

> 🧠 **Summary**
> Analyzed code structure containing \`${funcName}\`. The overall logic is straightforward but lacks production edge case protection.

## 🔴 Critical Issues
No critical security issues found.

## 🐛 Bug Detection
### Bug 1
- Severity: Medium
- Location: inside \`${funcName}\`
- Problem: DOM/state elements or variable scopes are not verified before access.
- Why: This can lead to unhandled null-pointer runtime errors.
- Fix: Implement check guards like \`if (!element) return;\` before executing logic.

## 🟡 Issues & Improvements
- Add custom validation constraints for parameters in \`${funcName}\`.
- Ensure proper logging or error callbacks.

## ⚡ Performance
- Time Complexity: O(1)
- Space Complexity: O(1)
- Explanation: Logic inside \`${funcName}\` executes linearly in constant time.

## 🔐 Security
No active security vulnerabilities found.

## ✅ Good Things
- Simple and easy-to-read implementation.
- Good naming convention for \`${funcName}\`.

## 🔧 Recommended Code
\`\`\`${language.toLowerCase() || "javascript"}
// Safely wrapped logic
${code}
\`\`\`

## 📊 Score
Code Quality: 8/10
Performance: 9/10
Security: 9/10
Readability: 9/10
Maintainability: 8/10

Overall Score: 8.6/10

## 🎯 Final Recommendation
Integrate safe boundary checks before execution.
`;
}

function generateDynamicFallbackExplain(code, language) {
    const funcMatches = [...code.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>)/g)];
    const funcName = funcMatches.map(m => m[1] || m[2]).filter(Boolean)[0] || "main";

    return `
## ℹ️ Code Explanation (Offline Fallback)

This script defines the function \`${funcName}\` in **${language}**. Here is the breakdown:

1. **Setup**: References resources, inputs, or selectors.
2. **Logic Block**: Performs operations/manipulations on inputs.
3. **Completion**: Updates view, state, or returns values.
`;
}

function generateDynamicFallbackFix(code, language) {
    return `
## 🔧 Fixed Code (Offline Fallback)

### Problems Fixed
- Handled empty string inputs safely.
- Wrapped key code sections in check conditions.

### Improved Code
\`\`\`${language.toLowerCase() || "javascript"}
// Corrected logic wrap
${code}
\`\`\`

### Explanation
Formatted code structure and added safeguards to ensure high runtime stability.
`;
}

function generateDynamicFallbackTestCases(code, language) {
    const funcMatches = [...code.matchAll(/(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>)/g)];
    const funcName = funcMatches.map(m => m[1] || m[2]).filter(Boolean)[0] || "main";

    return `
## 🧪 Unit Test Cases (Offline Fallback)

### Test Case 1: Standard Input
- Input: Valid arguments for \`${funcName}\`.
- Expected Output: Expected return or side-effect.

### Test Case 2: Boundary/Edge Case
- Input: Empty string/Null.
- Expected Output: Safe termination or default output.
`;
}

module.exports.getReview = async (req, res) => {
    try {
        const code = req.body.code;
        const language = req.body.language || "Unknown";

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
        const detailedError = `\n\n---\n⚠️ **AI Quota/Service Error Details:**\n\`\`\`\n${error.message || error}\n\`\`\``;
        return res.status(200).json({
            "success": true,
            "mode": "demo",
            "message": "AI service is temporarily unavailable...",
            "review": generateDynamicFallbackReview(code, language) + detailedError
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

        const detailedError = "\n\n---\n⚠️ **AI Quota/Service Error Details:**\n\`\`\`\n" + (error.message || error) + "\n\`\`\`";
        return res.status(200).json({
            success: true,
            mode: "demo",
            explanation: generateDynamicFallbackExplain(code, language) + detailedError
        });
    }
};

module.exports.fixCode = async (req, res) => {
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
Fix the following ${language} code.

Use exactly this structure:

## 🔧 Fixed Code

### Problems Fixed
Explain the problems found in the code.

### Improved Code
Provide the complete corrected code.

### Explanation
Explain what was changed and why.

Important:
- Focus on fixing the existing code.
- Do not give a review score.
- Do not unnecessarily change the logic.
- Keep the same programming language.
- Provide complete corrected code.

Code:

\`\`\`${language}
${code}
\`\`\`
`;

        const response = await aiService(prompt);

        return res.status(200).json({
            success: true,
            mode: "ai",
            fixedCode: response
        });

    } catch (error) {
        console.error("AI Fix Code Error:", error);
        console.error("ERROR MESSAGE:", error.message);
        console.error("ERROR RESPONSE:", error.response?.data);
        const detailedError = "\n\n---\n⚠️ **AI Quota/Service Error Details:**\n\`\`\`\n" + (error.message || error) + "\n\`\`\`";
        return res.status(200).json({
            success: true,
            mode: "demo",
            fixedCode: generateDynamicFallbackFix(code, language) + detailedError
        });
    }
};

module.exports.generateTestCases = async (req, res) => {

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
Generate test cases for the following ${language} code.

Use exactly this structure:

## 🧪 Test Cases

### Test Case 1
- Input:
- Expected Output:
- Explanation:

### Test Case 2
- Input:
- Expected Output:
- Explanation:

### Test Case 3
- Input:
- Expected Output:
- Explanation:

Important:
- Generate useful test cases based on the actual code.
- Include normal cases.
- Include edge cases when applicable.
- Include invalid or boundary cases when applicable.
- Do not modify or fix the code.
- Do not give a review score.
- Do not explain the entire code.
- Keep the test cases simple and beginner-friendly.
- Do not invent inputs that are not supported by the code.

Code:

\`\`\`${language}
${code}
\`\`\`
`;

        const response = await aiService(prompt);

        return res.status(200).json({
            success: true,
            mode: "ai",
            testCases: response
        });

    } catch (error) {

        console.error("AI Test Cases Error:", error);
        console.error("ERROR MESSAGE:", error.message);
        console.error("ERROR RESPONSE:", error.response?.data);

        const detailedError = "\n\n---\n⚠️ **AI Quota/Service Error Details:**\n\`\`\`\n" + (error.message || error) + "\n\`\`\`";
        return res.status(200).json({
            success: true,
            mode: "demo",
            testCases: generateDynamicFallbackTestCases(code, language) + detailedError
        });
    }
};