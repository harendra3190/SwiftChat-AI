// src/controllers/user.controller.js
const { getUserProfile, updateUserProfile, toggleFollow: toggleFollowService, searchUsersService, getConnectsList } = require('../services/user.service');
const postService = require('../services/post.service');
const { sendSuccess, sendPaginated } = require('../utils/response');

// GET /api/users/:id
const getUserById = async (req, res) => {
  const safeUser = await getUserProfile(req.params.id);
  sendSuccess(res, { user: safeUser });
};

// PUT /api/users/update
const updateUser = async (req, res) => {
  const safeUser = await updateUserProfile(req.user.id, req.body, req.file);
  sendSuccess(res, { user: safeUser }, 'Profile updated');
};

// POST /api/users/follow/:id
const toggleFollow = async (req, res) => {
  const result = await toggleFollowService(req.user.id, req.params.id);
  sendSuccess(res, { following: result.following }, result.message);
};

// PATCH /api/users/settings
const updateSettings = async (req, res) => {
  const { updateUserSettingsService } = require('../services/user.service');
  const user = await updateUserSettingsService(req.user.id, req.body);
  sendSuccess(res, { settings: user.settings, isPrivate: user.isPrivate }, 'Settings synchronized');
};

// GET /api/users/search
const searchUsers = async (req, res) => {
  const users = await searchUsersService(req.query.q);
  sendSuccess(res, { users });
};

// GET /api/users/:id/connects — AI-matched users
const getConnects = async (req, res) => {
  const users = await getConnectsList(req.user.id);
  sendSuccess(res, { users });
};

// GET /api/users/:id/posts
const getUserPosts = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const result = await postService.getUserPosts(req.params.id, req.user.id, page, limit);
  sendPaginated(res, result.posts, result.pagination, 'User posts fetched');
};

// DELETE /api/users/me
const deleteUserAccount = async (req, res) => {
  const { deleteUserAccountService } = require('../services/user.service');
  await deleteUserAccountService(req.user.id);
  sendSuccess(res, null, 'Account permanently terminated');
};

const getNeuralLinksCount = async (req, res) => {
  const { getNeuralLinksCountService } = require('../services/user.service');
  const count = await getNeuralLinksCountService(req.user.id);
  sendSuccess(res, { count });
};

const getResonanceMatch = async (req, res) => {
  const { getResonanceMatchService } = require('../services/user.service');
  const match = await getResonanceMatchService(req.user.id);
  sendSuccess(res, { match });
};

module.exports = { getUserById, updateUser, toggleFollow, searchUsers, getConnects, getUserPosts, updateSettings, deleteUserAccount, getNeuralLinksCount, getResonanceMatch };
