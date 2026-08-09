const aiService = require("../services/ai.service");

module.exports.getReview = async (req, res) => {
    try {
        const code = req.body.code;

        if (!code) {
            return res.status(400).send("code is required");
        }

        const response = await aiService(code);

        res.status(200).send(response);

    } catch (error) {
        console.error("AI Review Error:", error);

        if (error.status === 429) {
            return res.status(429).send(
                "AI service quota exceeded. Please try again later."
            );
        }

        res.status(500).send("Something went wrong while generating review.");
    }
};


