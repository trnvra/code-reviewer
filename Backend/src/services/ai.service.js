const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GOOGLE_GEMINI_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const SYSTEM_INSTRUCTION = `
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
`;

async function generateContent(prompt) {
    const isStandardKey = apiKey.startsWith("AIzaSy");
    
    // Model Pool ordered by priority depending on API Key format (gemini-2.5-flash prioritized first)
    const modelPool = isStandardKey 
        ? ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-3.6-flash", "gemini-1.5-pro"]
        : ["gemini-2.5-flash", "gemini-3.6-flash", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"];

    const timeoutMs = 6000; // 6 seconds timeout
    let lastError = null;

    for (let i = 0; i < modelPool.length; i++) {
        const modelName = modelPool[i];
        try {
            console.log(`[AI Pool] Attempting query with model: ${modelName} (${i + 1}/${modelPool.length})`);
            
            const modelInstance = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 1024,
                },
                systemInstruction: SYSTEM_INSTRUCTION
            });

            // Promise.race between model call and 6-second timeout
            const responseText = await Promise.race([
                modelInstance.generateContent(prompt).then(res => res.response.text()),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout")), timeoutMs)
                )
            ]);

            if (responseText && responseText.trim().length > 0) {
                console.log(`[AI Pool] ✅ Success with model: ${modelName}`);
                return responseText;
            }
        } catch (error) {
            console.warn(`[AI Pool] ⚠️ Model ${modelName} failed:`, error.message || error);
            lastError = error;
            
            // Wait 200ms before falling back to the next model in the pool
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    // If we exhausted the pool, raise the final error
    if (lastError && lastError.status === 429) {
        const quotaError = new Error("Gemini API quota exceeded across all fallback models");
        quotaError.status = 429;
        throw quotaError;
    }
    
    throw lastError || new Error("All AI models in the fallback pool failed.");
}


module.exports = generateContent;