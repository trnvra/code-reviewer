const express = require('express');
const aiController = require("../controllers/ai.controller");
const router = express.Router();

router.post("/get-review", aiController.getReview)

router.post("/explain-code", aiController.explainCode);

router.post("/fix-code", aiController.fixCode);

router.post("/test-cases", aiController.generateTestCases);

module.exports = router;