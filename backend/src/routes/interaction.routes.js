// src/routes/interaction.routes.js
const router = require('express').Router();
const { toggleLike, addComment, getComments, getTrendingEmotions, getMessages, sendMessage, getInsights, reportPost, purgeConversation } = require('../controllers/interaction.controller');
const { protect } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');

router.use(protect);

router.post('/like', [body('postId').notEmpty()], validate, toggleLike);
router.post('/comment', [body('postId').notEmpty(), body('content').trim().isLength({ min: 1, max: 500 })], validate, addComment);
router.get('/comments/:postId', getComments);
router.get('/trending-emotions', getTrendingEmotions);
router.get('/insights', getInsights);

// Messages routes
router.get('/messages', getMessages);
router.post('/messages', [body('receiverId').notEmpty(), body('content').notEmpty()], validate, sendMessage);
router.delete('/messages/:contactId', purgeConversation);

// Report route
router.post('/report', [body('postId').notEmpty(), body('reason').optional().isIn(['spam', 'harassment', 'misinformation', 'inappropriate', 'other'])], validate, reportPost);

module.exports = router;
