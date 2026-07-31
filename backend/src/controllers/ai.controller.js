// src/controllers/ai.controller.js
const { sendSuccess } = require('../utils/response');
const aiService = require('../services/ai.service');
const { AppError } = require('../middleware/errorHandler');
const { StatusCodes } = require('http-status-codes');

const generateCaption = async (req, res) => {
  const { prompt, tone = 'witty', imageUrl, image } = req.body;
  const result = await aiService.generateCaption(prompt, tone, imageUrl, image);
  sendSuccess(res, result, 'Captions generated');
};

const emotionSearch = async (req, res) => {
  const { query, limit = 10 } = req.body;
  if (!query) throw new AppError('Search query required', StatusCodes.BAD_REQUEST);

  const result = await aiService.emotionSearch(query, limit);
  sendSuccess(res, result, 'Emotion search results');
};

const chat = async (req, res) => {
  const { message, sessionId, context } = req.body;
  if (!message) throw new AppError('Message required', StatusCodes.BAD_REQUEST);

  const result = await aiService.chat(req.user.id, message, sessionId, context);
  sendSuccess(res, result, 'Chat response');
};

const moderateContent = async (req, res) => {
  const { text, imageUrl } = req.body;
  const result = await aiService.moderateContent(text, imageUrl);
  sendSuccess(res, result, 'Moderation complete');
};

const detectEmotion = async (req, res) => {
  const { text } = req.body;
  if (!text) throw new AppError('Text required', StatusCodes.BAD_REQUEST);

  const result = await aiService.detectEmotion(text);
  sendSuccess(res, result, 'Emotion detected');
};

module.exports = { generateCaption, emotionSearch, chat, moderateContent, detectEmotion };
