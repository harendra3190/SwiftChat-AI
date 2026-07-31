// src/controllers/post.controller.js
const { sendSuccess, sendPaginated } = require('../utils/response');
const postService = require('../services/post.service');
const { StatusCodes } = require('http-status-codes');

const createPost = async (req, res) => {
  const result = await postService.createPost(req.user.id, req.body, req.file);
  sendSuccess(res, result, 'Post created successfully', StatusCodes.CREATED);
};

const getFeed = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const result = await postService.getFeed(req.user.id, page, limit);
  if (result.cached) {
    return sendPaginated(res, result.posts, result.pagination, 'Feed (cached)');
  }
  sendPaginated(res, result.posts, result.pagination, 'Feed fetched');
};

const getPostById = async (req, res) => {
  const result = await postService.getPostById(req.params.id);
  sendSuccess(res, result);
};

const deletePost = async (req, res) => {
  await postService.deletePost(req.params.id, req.user);
  sendSuccess(res, {}, 'Post deleted');
};

const getTrending = async (req, res) => {
  const result = await postService.getTrending();
  sendSuccess(res, result);
};

module.exports = { createPost, getFeed, getPostById, deletePost, getTrending };
