const express = require('express');
const authController = require('../controllers/auth.controller');
const router = express.Router();

// POST /auth/register
router.post('/register', authController.register);

// POST /auth/login
router.post('/login', authController.login);

// GET /auth/me  (verify token & get current user)
router.get('/me', authController.verifyToken);

module.exports = router;
