// backend/src/services/ai.service.js
const axios = require('axios');
const { redisClient } = require('../config/redis');
const ChatLog = require('../models/ChatLog.model');
const Post = require('../models/Post.model');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

const AI_TIMEOUT = 30000; // 30s

const aiRequest = async (url, data, retries = 2) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.post(url, data, {
        timeout: AI_TIMEOUT,
        headers: { 'X-API-Key': process.env.AI_SERVICE_KEY || 'internal_key' },
      });
      return res.data;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
};

const generateCaption = async (prompt, tone, imageUrl, image) => {
  const cacheKey = `caption:${tone}:${prompt?.slice(0, 50)}:${image ? 'v' : 't'}`;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (_) {}

  try {
    const result = await aiRequest(`${process.env.AI_CAPTION_SERVICE_URL}/generate`, { prompt, tone, imageUrl, image });
    try { await redisClient.setex(cacheKey, 300, JSON.stringify(result)); } catch (_) {}
    return result;
  } catch (err) {
    logger.warn('Caption service unavailable, using mock');
    return { captions: [
      { text: `✨ ${prompt || 'Capturing the moment'} — where reality meets the extraordinary.`, mood: 'VIBRANT' },
      { text: `Just another glitch in the beautiful simulation we call life. Ready for the upgrade? 🚀`, mood: 'DEEP' },
      { text: `Lost in the frequency of a midnight dream. Where code meets soul. 🌌 #FutureVibes`, mood: 'ETHEREAL' },
    ]};
  }
};

const emotionSearch = async (query, limit) => {
  try {
    const result = await aiRequest(`${process.env.AI_SEARCH_SERVICE_URL}/search`, { query, limit });
    return result;
  } catch (err) {
    logger.warn('Emotion search service unavailable, using basic search');
    const queryRegex = new RegExp(query, 'i');
    const posts = await Post.find({
      $or: [{ caption: queryRegex }, { emotion: queryRegex }],
      isPublic: true
    }).limit(limit).populate('user', 'username displayName avatarUrl');

    const mappedPosts = posts.map(p => ({ ...p.toObject(), id: p._id, _count: { likes: 0, comments: 0 } }));
    return { posts: mappedPosts, query };
  }
};

const User = require('../models/User.model');

const chat = async (userId, message, sessionId, context) => {
  sessionId = sessionId || uuidv4();
  let chatLog = await ChatLog.findOne({ userId, sessionId });
  if (!chatLog) {
    chatLog = new ChatLog({ userId, sessionId, messages: [] });
  }

  // Identity Grounding: Fetch Bio + Last 5 Captions
  const [user, posts] = await Promise.all([
    User.findById(userId).select('bio displayName username'),
    Post.find({ user: userId }).sort({ createdAt: -1 }).limit(5).select('caption')
  ]);
  
  const captions = posts.map(p => p.caption).filter(Boolean);
  const identity_grounding = {
    bio: user?.bio || "No bio yet on this frequency.",
    recent_captions: captions,
    displayName: user?.displayName,
    username: user?.username
  };

  chatLog.messages.push({ role: 'user', content: message });

  try {
    const result = await aiRequest(`${process.env.AI_CHAT_SERVICE_URL}/chat`, {
      message,
      history: chatLog.messages.slice(-10),
      userId,
      context: { ...context, identity_grounding },
    });

    chatLog.messages.push({ role: 'assistant', content: result.response });
    await chatLog.save();
    return { response: result.response, sessionId };
  } catch (err) {
    logger.warn('Chat service unavailable, using mock');
    const mockResponse = "I'm your AI assistant! I can help you craft captions, discover content by emotion, or navigate the platform. What would you like to explore? ✨";
    chatLog.messages.push({ role: 'assistant', content: mockResponse });
    await chatLog.save();
    return { response: mockResponse, sessionId };
  }
};

const moderateContent = async (text, imageUrl) => {
  try {
    const result = await aiRequest(`${process.env.AI_MODERATION_SERVICE_URL}/moderate`, { text, imageUrl });
    return result;
  } catch (err) {
    logger.warn('Moderation service unavailable, skipping');
    return { isSafe: true, score: 0, message: 'Moderation offline — auto-approved' };
  }
};

const detectEmotion = async (text) => {
  try {
    const result = await aiRequest(`${process.env.AI_EMOTION_SERVICE_URL}/analyze`, { text });
    return result;
  } catch (err) {
    logger.warn('Emotion service unavailable');
    return { emotion: 'Neutral', score: 0.5, vibe: 'Electric' };
  }
};

module.exports = { generateCaption, emotionSearch, chat, moderateContent, detectEmotion };
