const { StatusCodes } = require('http-status-codes');
const User = require('../models/User.model');
const Post = require('../models/Post.model');
const Follow = require('../models/Follow.model');
const { AppError } = require('../middleware/errorHandler');

const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', StatusCodes.NOT_FOUND);

  const posts = await Post.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(12);

  return {
    id: user._id, 
    username: user.username, 
    email: user.email, 
    displayName: user.displayName, 
    bio: user.bio,
    avatarUrl: user.avatarUrl, 
    emotionVibe: user.emotionVibe, 
    createdAt: user.createdAt,
    isPrivate: user.isPrivate,
    _count: { 
      posts: await Post.countDocuments({ user: userId }), 
      followers: user.followers.length, 
      following: user.following.length 
    },
    posts: posts.map(p => ({
      id: p._id, mediaUrl: p.mediaUrl, mediaType: p.mediaType, caption: p.caption, emotion: p.emotion, createdAt: p.createdAt
    }))
  };
};

const updateUserProfile = async (userId, updateData, file) => {
  const { displayName, bio, emotionVibe, email } = updateData;
  const avatarUrl = file ? `/uploads/${file.filename}` : undefined;

  const data = { displayName, bio, emotionVibe };
  if (avatarUrl) data.avatarUrl = avatarUrl;
  if (email) data.email = email;

  // Use explicit $set for clarity and reliability
  const updatedUser = await User.findByIdAndUpdate(
    userId, 
    { $set: data }, 
    { new: true, runValidators: true }
  ).lean();

  if (!updatedUser) throw new AppError('User synchronization failed after update', StatusCodes.INTERNAL_SERVER_ERROR);

  return { 
    id: updatedUser._id, 
    username: updatedUser.username, 
    email: updatedUser.email, 
    displayName: updatedUser.displayName, 
    bio: updatedUser.bio, 
    avatarUrl: updatedUser.avatarUrl, 
    emotionVibe: updatedUser.emotionVibe 
  };
};


const toggleFollow = async (currentUserId, targetUserId) => {
  if (targetUserId === currentUserId) throw new AppError('Cannot follow yourself', StatusCodes.BAD_REQUEST);

  const target = await User.findById(targetUserId);
  if (!target) throw new AppError('User not found', StatusCodes.NOT_FOUND);

  const isFollowing = target.followers.some(id => id.toString() === currentUserId.toString());

  if (isFollowing) {
    // Unfollow
    await Promise.all([
      User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } }),
      User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } }),
      Follow.findOneAndDelete({ follower: currentUserId, following: targetUserId }) // Cleanup legacy collection
    ]);
    return { following: false, message: 'Synchronized: Unfollowed' };
  }

  // Follow
  await Promise.all([
    User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } }),
    User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } }),
    Follow.create({ follower: currentUserId, following: targetUserId }) // Sync legacy collection
  ]);
  return { following: true, message: 'Synchronized: Following' };
};

const updateUserSettingsService = async (userId, settingsData) => {
  const { isPrivate, notifications, aiInsights } = settingsData;
  const update = {};
  if (isPrivate !== undefined) {
    update['settings.isPrivate'] = isPrivate;
    update['isPrivate'] = isPrivate;
  }
  if (notifications !== undefined) update['settings.notifications'] = notifications;
  if (aiInsights !== undefined) update['settings.aiInsights'] = aiInsights;

  const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
  if (!user) throw new AppError('User not found', StatusCodes.NOT_FOUND);
  return user;
};

const searchUsersService = async (query) => {
  if (!query) return [];

  const queryRegex = new RegExp(query, 'i');
  const users = await User.find({
    $or: [{ username: queryRegex }, { displayName: queryRegex }]
  }).limit(20);

  return users.map(u => ({
    id: u._id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, emotionVibe: u.emotionVibe,
    _count: { followers: u.followers.length }
  }));
};

const getConnectsList = async (currentUserId) => {
  const user = await User.findById(currentUserId);
  const followingIds = user.following;
  
  const users = await User.find({
    _id: { $ne: currentUserId, $nin: followingIds }
  }).limit(5);

  return users.map(u => ({
    id: u._id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, emotionVibe: u.emotionVibe
  }));
};

const deleteUserAccountService = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', StatusCodes.NOT_FOUND);

  const mongoose = require('mongoose');

  await Promise.all([
    User.findByIdAndDelete(userId),
    Post.deleteMany({ user: userId }),
    mongoose.model('Like').deleteMany({ user: userId }),
    mongoose.model('Comment').deleteMany({ user: userId }),
    Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
    mongoose.model('DirectMessage').deleteMany({ $or: [{ sender: userId }, { receiver: userId }] }).catch(() => {}), // Use catch because it might not exist if named differently
    mongoose.model('ChatLog').deleteMany({ user: userId }).catch(() => {})
  ]);
};

const getNeuralLinksCountService = async (userId) => {
  const user = await User.findById(userId).select('following');
  if (!user || !user.following || user.following.length === 0) return 0;
  
  const count = await User.countDocuments({
    _id: { $in: user.following },
    following: userId
  });
  return count;
};

const getResonanceMatchService = async (userId) => {
  const currentUser = await User.findById(userId);
  if (!currentUser) throw new AppError('User not found', StatusCodes.NOT_FOUND);

  const emotionVibe = currentUser.emotionVibe || 'neutral';
  
  let match = await User.findOne({
    _id: { $ne: currentUser._id, $nin: currentUser.following },
    emotionVibe: emotionVibe
  }).select('displayName username avatarUrl emotionVibe');

  if (!match) {
    match = await User.findOne({
      _id: { $ne: currentUser._id, $nin: currentUser.following }
    }).sort({ updatedAt: -1 }).select('displayName username avatarUrl emotionVibe');
  }
  
  return match;
};

module.exports = { getUserProfile, updateUserProfile, toggleFollow, searchUsersService, getConnectsList, updateUserSettingsService, deleteUserAccountService, getNeuralLinksCountService, getResonanceMatchService };
