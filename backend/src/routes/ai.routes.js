// src/routes/ai.routes.js
const router = require('express').Router();
const { generateCaption, emotionSearch, chat, moderateContent, detectEmotion } = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');

router.use(protect);

router.post('/caption', [body('prompt').optional().isString()], validate, generateCaption);
router.post('/search', [body('query').notEmpty().withMessage('Query required')], validate, emotionSearch);
router.post('/chat', [body('message').notEmpty().withMessage('Message required')], validate, chat);
router.post('/moderate', moderateContent);
router.post('/emotion', [body('text').notEmpty()], validate, detectEmotion);

module.exports = router;
