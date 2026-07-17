const aiService = require("../services/ai.service")

module.exports.getReview = async (req, res) => {

    const code = req.body.code;

    if(!code) {
        return res.statusCode(400).send("code is required");
    }

    const response = await aiService(code);

    res.send(response);

}


