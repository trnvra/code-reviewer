const express = require('express');
const authController = require('../controllers/auth.controller');
const router = express.Router();

// POST /auth/register
router.post('/register', authController.register);

// POST /auth/login
router.post('/login', authController.login);

// POST /auth/reset-password
router.post('/reset-password', authController.resetPassword);

// POST /auth/demo-login
router.post('/demo-login', authController.demoLogin);

// GET /auth/me  (verify token & get current user)
router.get('/me', authController.verifyToken);

module.exports = router;
