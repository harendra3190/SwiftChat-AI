// src/routes/post.routes.js
const router = require('express').Router();
const { createPost, getFeed, getPostById, deletePost, getTrending } = require('../controllers/post.controller');
const { protect } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');

router.use(protect);

router.get('/feed', getFeed);
router.get('/trending', getTrending);
router.get('/:id', getPostById);
router.post('/', upload.single('media'), createPost);
router.delete('/:id', deletePost);

module.exports = router;
