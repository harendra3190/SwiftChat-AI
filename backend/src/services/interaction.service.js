// backend/src/services/interaction.service.js
const { StatusCodes } = require('http-status-codes');
const Post = require('../models/Post.model');
const Like = require('../models/Like.model');
const Comment = require('../models/Comment.model');
const DirectMessage = require('../models/DirectMessage.model');
const User = require('../models/User.model');
const Report = require('../models/Report.model');
const { AppError } = require('../middleware/errorHandler');

const toggleLike = async (userId, postId) => {
  const post = await Post.findById(postId);
  if (!post) throw new AppError('Post not found', StatusCodes.NOT_FOUND);

  const existing = await Like.findOne({ user: userId, post: postId });

  if (existing) {
    await Like.findByIdAndDelete(existing._id);
    const count = await Like.countDocuments({ post: postId });
    return { liked: false, likeCount: count };
  }

  await Like.create({ user: userId, post: postId });
  const count = await Like.countDocuments({ post: postId });
  return { liked: true, likeCount: count };
};

const addComment = async (userId, postId, content) => {
  const post = await Post.findById(postId);
  if (!post) throw new AppError('Post not found', StatusCodes.NOT_FOUND);

  const comment = await Comment.create({ user: userId, post: postId, content });
  const populatedComment = await Comment.findById(comment._id).populate('user', 'username displayName avatarUrl');

  const count = await Comment.countDocuments({ post: postId });
  return { comment: { ...populatedComment.toObject(), id: populatedComment._id }, commentCount: count };
};

const getComments = async (postId) => {
  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('user', 'username displayName avatarUrl');
    
  return { comments: comments.map(c => ({ ...c.toObject(), id: c._id })) };
};

const getTrendingEmotions = async () => {
  const emotions = await Post.aggregate([
    { $match: { emotion: { $ne: null }, createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
    { $group: { _id: "$emotion", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  const trending = emotions.map((e, i) => ({
    emotion: e._id,
    count: e.count,
    trend: i === 0 ? 'HOT' : i === 1 ? 'RISING' : 'STEADY',
  }));

  if (trending.length === 0) {
     return { trending: [{ emotion: "Electric", count: 1, trend: "HOT" }] };
  }

  return { trending };
};

const getMessages = async (userId) => {
  const messages = await DirectMessage.find({
    $or: [{ senderId: userId }, { receiverId: userId }]
  })
  .populate('senderId', 'username displayName avatarUrl')
  .populate('receiverId', 'username displayName avatarUrl')
  .sort({ createdAt: -1 });

  return { messages };
};

const sendMessage = async (senderId, receiverId, content) => {
  if (senderId.toString() === receiverId.toString()) throw new AppError('Cannot send message to self', 400);
  
  const receiver = await User.findById(receiverId);
  if (!receiver) throw new AppError('User not found', 404);

  const message = await DirectMessage.create({ senderId, receiverId, content });
  const populated = await DirectMessage.findById(message._id)
    .populate('senderId', 'username displayName avatarUrl')
    .populate('receiverId', 'username displayName avatarUrl');

  // Emit real-time socket event to the recipient's personal room
  try {
    const { getIo } = require('../config/socket');
    const io = getIo();
    io.to(`user:${receiverId}`).emit('message:new', { message: populated });
  } catch (_) {
    // Socket not critical — message saved in DB regardless
  }

  return { message: populated };
};

const purgeConversation = async (userId, contactId) => {
  const result = await DirectMessage.deleteMany({
    $or: [
      { senderId: userId, receiverId: contactId },
      { senderId: contactId, receiverId: userId },
    ]
  });
  return { deletedCount: result.deletedCount };
};

const reportPost = async (reporterId, postId, reason, details) => {
  const post = await Post.findById(postId);
  if (!post) throw new AppError('Post not found', StatusCodes.NOT_FOUND);
  if (post.user.toString() === reporterId.toString()) {
    throw new AppError('Cannot report your own post', StatusCodes.BAD_REQUEST);
  }

  // Use upsert to avoid duplicate reports — update details if already reported
  const report = await Report.findOneAndUpdate(
    { reporter: reporterId, post: postId },
    { reason: reason || 'other', details: details || '', status: 'pending' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { report: { id: report._id, reason: report.reason, status: report.status } };
};

const getInsights = async (userId) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. Flow State Calculation: (Posts in last 7 days / 5) * 100
  const postCount = await Post.countDocuments({
    user: userId,
    createdAt: { $gte: sevenDaysAgo }
  });
  const flowState = Math.min(100, Math.floor((postCount / 5) * 100));

  // 2. Neural Links: Count of unique conversation threads
  const uniqueContacts = await DirectMessage.aggregate([
    { $match: { $or: [{ senderId: userId }, { receiverId: userId }] } },
    { $project: { partner: { $cond: [{ $eq: ["$senderId", userId] }, "$receiverId", "$senderId"] } } },
    { $group: { _id: "$partner" } },
    { $count: "count" }
  ]);
  const neuralLinks = uniqueContacts.length > 0 ? uniqueContacts[0].count : 0;

  // 3. Resonance Match: Most frequent emotion
  const mostFrequentEmotion = await Post.aggregate([
    { $match: { user: userId, emotion: { $ne: null } } },
    { $group: { _id: "$emotion", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);
  const resonanceMatch = mostFrequentEmotion.length > 0 ? mostFrequentEmotion[0]._id : "Scanning...";

  // 4. Activity Data (for charts)
  const recentPosts = await Post.find({ user: userId }).sort({ createdAt: -1 }).limit(15);
  let creativeCount = 0; let logicCount = 0; let empathyCount = 0;
  let focusCount = 0; let energyCount = 0; let zenCount = 0;

  recentPosts.forEach(post => {
    const len = post.caption?.length || 0;
    if (len > 100) focusCount += 10;
    if (post.emotion) {
      const e = post.emotion.toLowerCase();
      if (['vibrant', 'electric', 'joy'].includes(e)) energyCount += 25;
      if (['deep', 'resonant', 'thoughtful'].includes(e)) logicCount += 25;
      if (['ethereal', 'crystal', 'zen', 'calm'].includes(e)) zenCount += 25;
      if (['empathy', 'connected', 'warm'].includes(e)) empathyCount += 25;
    }
    if (post.mediaUrl) creativeCount += 30;
  });

  const radarData = [
    { subject: 'Creativity', A: Math.min(150, 60 + creativeCount), fullMark: 150 },
    { subject: 'Logic', A: Math.min(150, 50 + logicCount), fullMark: 150 },
    { subject: 'Empathy', A: Math.min(150, 70 + empathyCount), fullMark: 150 },
    { subject: 'Focus', A: Math.min(150, 60 + focusCount), fullMark: 150 },
    { subject: 'Energy', A: Math.min(150, 50 + energyCount), fullMark: 150 },
    { subject: 'Zen', A: Math.min(150, 40 + zenCount), fullMark: 150 },
  ];

  // Areas (Last 7 days)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getUTCDay();
  const areaData = [];
  for(let i=6; i>=0; i--) {
     let dayIndex = (today - i + 7) % 7;
     areaData.push({
        name: days[dayIndex],
        'Cognitive Load': Math.floor(2000 + Math.random() * 2000),
        'Creative Output': Math.floor(1000 + (creativeCount * 5) + Math.random() * 1500)
     });
  }

  return { 
    flowState, 
    neuralLinks, 
    resonanceMatch, 
    radarData, 
    areaData,
    stats: {
      synapses: postCount + neuralLinks,
      pulse: Math.floor(60 + Math.random() * 20),
      uptime: '99.9%'
    }
  };
};

module.exports = { toggleLike, addComment, getComments, getTrendingEmotions, getMessages, sendMessage, purgeConversation, reportPost, getInsights };
