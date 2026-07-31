const { sendSuccess } = require('../utils/response');
const interactionService = require('../services/interaction.service');
const { StatusCodes } = require('http-status-codes');
const Post = require('../models/Post.model');

const toggleLike = async (req, res) => {
  const { postId } = req.body;
  const result = await interactionService.toggleLike(req.user.id, postId);
  sendSuccess(res, result, result.liked ? 'Post liked' : 'Post unliked');
};

const addComment = async (req, res) => {
  const { postId, content } = req.body;
  const result = await interactionService.addComment(req.user.id, postId, content);
  sendSuccess(res, result, 'Comment added', StatusCodes.CREATED);
};

const getComments = async (req, res) => {
  const result = await interactionService.getComments(req.params.postId);
  sendSuccess(res, result);
};

const getTrendingEmotions = async (req, res) => {
  const result = await interactionService.getTrendingEmotions();
  sendSuccess(res, result);
};

const getMessages = async (req, res) => {
  const result = await interactionService.getMessages(req.user.id);
  sendSuccess(res, result);
};

const sendMessage = async (req, res) => {
  const { receiverId, content } = req.body;
  const result = await interactionService.sendMessage(req.user.id, receiverId, content);
  sendSuccess(res, result, 'Message sent');
};

const getInsights = async (req, res) => {
  const result = await interactionService.getInsights(req.user.id);
  sendSuccess(res, result);
};

const reportPost = async (req, res) => {
  const { postId, reason, details } = req.body;
  const result = await interactionService.reportPost(req.user.id, postId, reason, details);
  sendSuccess(res, result, 'Signal reported. Our team will review it.', StatusCodes.CREATED);
};

const purgeConversation = async (req, res) => {
  const { contactId } = req.params;
  const result = await interactionService.purgeConversation(req.user.id, contactId);
  sendSuccess(res, result, 'Transmission purged successfully');
};

module.exports = { toggleLike, addComment, getComments, getTrendingEmotions, getMessages, sendMessage, getInsights, reportPost, purgeConversation };
