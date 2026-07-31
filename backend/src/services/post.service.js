// backend/src/services/post.service.js
const { StatusCodes } = require('http-status-codes');
const Post = require('../models/Post.model');
const Follow = require('../models/Follow.model');
const Like = require('../models/Like.model');
const Comment = require('../models/Comment.model');
const { redisClient } = require('../config/redis');
const { AppError } = require('../middleware/errorHandler');

const FEED_CACHE_TTL = 60; // 60 seconds

const createPost = async (userId, data, file) => {
  const emotion = data.emotion || data.tone || null;
  const { caption, moodScore, location } = data;
  const mediaUrl = file ? `/uploads/${file.filename}` : null;
  const mediaType = file ? (file.mimetype.startsWith('video') ? 'video' : 'image') : null;

  const newPost = await Post.create({
    user: userId, caption, emotion, moodScore: moodScore ? parseFloat(moodScore) : null,
    location, mediaUrl, mediaType,
  });

  const postPopulated = await Post.findById(newPost._id).populate('user', 'username displayName avatarUrl');
  
  const post = {
    ...postPopulated.toObject(),
    id: postPopulated._id,
    _count: { likes: 0, comments: 0 }
  };

  try { await redisClient.del(`feed:${userId}`); } catch (_) {}

  return { post };
};

const getFeed = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  if (page === 1) {
    try {
      const cached = await redisClient.get(`feed:${userId}`);
      if (cached) {
        const data = JSON.parse(cached);
        return { posts: data.posts, pagination: data.pagination, cached: true };
      }
    } catch (_) {}
  }

  const follows = await Follow.find({ follower: userId }).select('following');
  const followedIds = follows.map(f => f.following);
  
  const User = require('../models/User.model');
  const privateUsers = await User.find({ isPrivate: true }).select('_id');
  const excludedUserIds = privateUsers
    .map(u => u._id)
    .filter(pid => 
      pid.toString() !== userId.toString() && 
      !followedIds.some(fid => fid.toString() === pid.toString())
    );

  // Unified Aggregation: (Own + Following + Global Sentient Stream)
  const query = {
    $and: [
      { user: { $nin: excludedUserIds } },
      {
        $or: [
          { user: userId },
          { user: { $in: followedIds } },
          { isPublic: true, isFlagged: false }
        ]
      }
    ]
  };

  const [posts, total] = await Promise.all([
    Post.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username displayName avatarUrl emotionVibe'),
    Post.countDocuments(query)
  ]);

  const formattedPosts = await Promise.all(posts.map(async (p) => {
    const isLiked = await Like.exists({ user: userId, post: p._id });
    const likesCount = await Like.countDocuments({ post: p._id });
    const commentsCount = await Comment.countDocuments({ post: p._id });
    return {
      ...p.toObject(),
      id: p._id,
      isLiked: !!isLiked,
      _count: { likes: likesCount, comments: commentsCount }
    };
  }));

  const pagination = { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total };

  if (page === 1) {
    try { await redisClient.setex(`feed:${userId}`, FEED_CACHE_TTL, JSON.stringify({ posts: formattedPosts, pagination })); } catch (_) {}
  }

  return { posts: formattedPosts, pagination, cached: false };
};

const getPostById = async (postId) => {
  const post = await Post.findById(postId).populate('user', 'username displayName avatarUrl');
  if (!post) throw new AppError('Post not found', StatusCodes.NOT_FOUND);

  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate('user', 'username displayName avatarUrl');

  const likesCount = await Like.countDocuments({ post: postId });
  const commentsCount = await Comment.countDocuments({ post: postId });

  const formattedPost = {
    ...post.toObject(),
    id: post._id,
    comments: comments.map(c => ({ ...c.toObject(), id: c._id })),
    _count: { likes: likesCount, comments: commentsCount }
  };

  return { post: formattedPost };
};

const deletePost = async (postId, user) => {
  const post = await Post.findById(postId);
  if (!post) throw new AppError('Post not found', StatusCodes.NOT_FOUND);
  if (post.user.toString() !== user.id && user.role !== 'admin') {
    throw new AppError('Unauthorized', StatusCodes.FORBIDDEN);
  }
  await Post.findByIdAndDelete(postId);
  try { await redisClient.del(`feed:${user.id}`); } catch (_) {}
  return {};
};

const getTrending = async () => {
  const posts = await Post.find({
    isPublic: true, isFlagged: false,
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  })
  .limit(10)
  .populate('user', 'username displayName avatarUrl');

  const withCounts = await Promise.all(posts.map(async p => {
    const likesCount = await Like.countDocuments({ post: p._id });
    const commentsCount = await Comment.countDocuments({ post: p._id });
    return { ...p.toObject(), id: p._id, _count: { likes: likesCount, comments: commentsCount } };
  }));
  
  withCounts.sort((a, b) => b._count.likes - a._count.likes);

  return { posts: withCounts };
};

const getUserPosts = async (targetUserId, requestingUserId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    Post.find({ user: targetUserId, isPublic: true, isFlagged: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'username displayName avatarUrl emotionVibe'),
    Post.countDocuments({ user: targetUserId, isPublic: true })
  ]);

  const formattedPosts = await Promise.all(posts.map(async (p) => {
    const isLiked = await Like.exists({ user: requestingUserId, post: p._id });
    const likesCount = await Like.countDocuments({ post: p._id });
    const commentsCount = await Comment.countDocuments({ post: p._id });
    return {
      ...p.toObject(),
      id: p._id,
      isLiked: !!isLiked,
      _count: { likes: likesCount, comments: commentsCount }
    };
  }));

  const pagination = { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page * limit < total };

  return { posts: formattedPosts, pagination };
};

module.exports = { createPost, getFeed, getPostById, deletePost, getTrending, getUserPosts };
