// src/routes/user.routes.js
const router = require('express').Router();
const { getUserById, updateUser, toggleFollow, searchUsers, getConnects, getUserPosts, updateSettings } = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

router.use(protect); // All user routes require auth

router.get('/search', searchUsers);
router.get('/connects', getConnects);
/**
 * @swagger
 * /api/users/neural-links-count:
 *   get:
 *     summary: Get mutual following count (Neural Links)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully fetched count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     count: { type: number }
 */
router.get('/neural-links-count', require('../controllers/user.controller').getNeuralLinksCount);
/**
 * @swagger
 * /api/users/resonance-match:
 *   get:
 *     summary: Get best matching user based on emotion vibe
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Successfully fetched match
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     match: 
 *                       type: object
 *                       nullable: true
 */
router.get('/resonance-match', require('../controllers/user.controller').getResonanceMatch);
router.post('/follow/:id', toggleFollow);
/**
 * @swagger
 * /api/users/settings:
 *   patch:
 *     summary: Update neural notification and privacy settings
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPrivate: { type: boolean }
 *               notifications: { type: boolean }
 *               aiInsights: { type: boolean }
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.patch('/settings', updateSettings);
router.put('/update', upload.single('avatar'), updateUser);
/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: Terminate user account permanently
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Account successfully deleted
 */
router.delete('/me', require('../controllers/user.controller').deleteUserAccount);
router.get('/:id', getUserById);
router.get('/:id/posts', getUserPosts);


module.exports = router;
