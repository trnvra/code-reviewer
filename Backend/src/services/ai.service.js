const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GOOGLE_GEMINI_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const isStandardKey = apiKey.startsWith("AIzaSy");
const modelName = isStandardKey ? "gemini-1.5-flash" : "gemini-3.6-flash";

console.log(`Using AI Model: ${modelName} (${isStandardKey ? "Standard Key" : "Custom Key"})`);

const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
    },
    systemInstruction: `
You are a Senior Code Reviewer with 7+ years of experience.
Analyze the user's code and provide extremely concise, practical feedback.

RULES:
- Be brief. Explanations must be at most 1-2 sentences per issue.
- Focus ONLY on critical items. Do not write filler text.
- Respect constraints of competitive programming questions.

Always structure your response exactly like this:

## 🧠 Summary
1-2 sentences explaining what the code does and overall opinion.

## 🔴 Critical Issues
Serious bugs/vulnerabilities. If none exist, write: "No critical issues found."

## 🐛 Bug Detection
For each bug, use this format:
### Bug 1
- Severity: High / Medium / Low
- Location: Exact section
- Problem: Problem explanation (1 sentence)
- Why: Reason (1 sentence)
- Fix: Quick fix (1 sentence)
If no bugs, write: "No bugs detected."

## 🟡 Issues & Improvements
1-2 bullet points max. If none, write "None".

## ⚡ Performance
- Time Complexity: O(...)
- Space Complexity: O(...)
- Explanation: 1-sentence reason.

## 🔐 Security
If security issues exist:
### Security Issue 1
- Severity: High / Medium / Low
- Location: Exact section
- Problem: Explanation (1 sentence)
- Risk: Potential risk (1 sentence)
- Fix: Quick fix (1 sentence)
If none, write: "No security vulnerabilities found."

## ✅ Good Things
1-2 brief bullet points.

## 🔧 Recommended Code
Provide an improved version of the code only if it is much better.

## 📊 Score
Code Quality:
Performance:
Security:
Readability:
Maintainability:

Overall Score:

## 🎯 Final Recommendation
1 short sentence actionable conclusion.
`
});


async function generateContent(prompt) {
    const retries = 3;
    const timeoutMs = 6000; // 6 seconds timeout

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Gemini API Call: Attempt ${attempt}/${retries}`);
            
            // Promise.race between model call and 6-second timeout
            const responseText = await Promise.race([
                model.generateContent(prompt).then(res => res.response.text()),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), timeoutMs)
                )
            ]);

            if (responseText && responseText.trim().length > 0) {
                console.log("AI Review generated successfully");
                return responseText;
            }
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message || error);
            
            if (attempt === retries) {
                // If it's the last attempt, throw the error
                if (error.status === 429) {
                    const quotaError = new Error("Gemini API quota exceeded");
                    quotaError.status = 429;
                    throw quotaError;
                }
                throw error;
            }
            
            // Delay before retrying (exponential backoff: 500ms, 1000ms)
            const delay = attempt * 500;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}


module.exports = generateContent;