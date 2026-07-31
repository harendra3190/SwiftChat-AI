// src/routes/auth.routes.js
const router = require('express').Router();
const passport = require('passport');
const { body } = require('express-validator');
const { register, login, getMe, refreshToken, logout, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validate.middleware');

const registerRules = [
  body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username: 3-30 chars'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password: min 8 chars'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

router.post('/register', authRateLimiter, registerRules, validate, register);
router.post('/login', authRateLimiter, loginRules, validate, login);
router.get('/me', protect, getMe);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logout);
/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Reset email sent
 *       404:
 *         description: Email not registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: false }
 *                 registered: { type: boolean, example: false }
 *                 message: { type: string }
 */
router.post('/forgot-password', authRateLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
], validate, forgotPassword);

router.post('/reset-password', authRateLimiter, [
  body('token').notEmpty().withMessage('Reset token required'),
  body('password').isLength({ min: 8 }).withMessage('Password: min 8 chars'),
], validate, resetPassword);

if (process.env.NODE_ENV !== 'production') {
  /**
   * @swagger
   * /api/auth/test-email:
   *   post:
   *     summary: Test email delivery (Development only)
   *     tags: [Auth]
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               to:
   *                 type: string
   *                 format: email
   *     responses:
   *       200:
   *         description: Test email sent successfully
   *       500:
   *         description: Internal server error
   */
  router.post('/test-email', async (req, res) => {
    const { sendEmail, buildResetPasswordEmail } = require('../utils/email.service');
    try {
      await sendEmail({
        to: req.body.to || process.env.EMAIL_USER,
        subject: '✅ SwiftChat Email Test',
        html: buildResetPasswordEmail('http://localhost/reset-password?token=TEST_TOKEN_123'),
      });
      res.json({ success: true, message: 'Test email sent!' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
}

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const { generateAccessToken, generateRefreshToken } = require('../utils/jwt');
    const accessToken = generateAccessToken(req.user.id, req.user.role);
    const refreshToken = generateRefreshToken(req.user.id);
    res.redirect(`${process.env.CLIENT_ORIGIN}?accessToken=${accessToken}&refreshToken=${refreshToken}`);
  }
);

module.exports = router;
