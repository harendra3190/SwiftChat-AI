jest.setTimeout(45000);
const { registerUser, loginUser, logoutUser } = require('../src/services/auth.service');
const User = require('../src/models/User.model');
const bcrypt = require('bcryptjs');
const { generateAccessToken, generateRefreshToken } = require('../src/utils/jwt');
const { redisClient } = require('../src/config/redis');

// Mock dependencies
jest.mock('../src/models/User.model');
jest.mock('bcryptjs');
jest.mock('../src/utils/jwt');
jest.mock('../src/config/redis', () => ({
  redisClient: {
    set: jest.fn(),
  },
}));

describe('auth.service.js tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerUser', () => {
    it('Should successfully register a new user', async () => {
      User.findOne.mockResolvedValue(null);
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.create.mockResolvedValue({
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'user',
        createdAt: new Date(),
      });
      generateAccessToken.mockReturnValue('mockAccessToken');
      generateRefreshToken.mockReturnValue('mockRefreshToken');

      const result = await registerUser({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(User.findOne).toHaveBeenCalledWith({ $or: [{ email: 'test@example.com' }, { username: 'testuser' }] });
      expect(User.create).toHaveBeenCalled();
      expect(result.accessToken).toBe('mockAccessToken');
      expect(result.refreshToken).toBe('mockRefreshToken');
      expect(result.user.username).toBe('testuser');
    });
  });

  describe('loginUser (JWT Token Generation)', () => {
    it('Should generate JWT tokens on successful login', async () => {
      User.findOne.mockResolvedValue({
        _id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashedPassword',
        role: 'user',
      });
      bcrypt.compare.mockResolvedValue(true);
      generateAccessToken.mockReturnValue('newMockAccessToken');
      generateRefreshToken.mockReturnValue('newMockRefreshToken');

      const result = await loginUser({ email: 'test@example.com', password: 'password123' });

      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(generateAccessToken).toHaveBeenCalledWith('user123', 'user');
      expect(result.accessToken).toBe('newMockAccessToken');
      expect(result.refreshToken).toBe('newMockRefreshToken');
    });
  });

  describe('logoutUser', () => {
    it('Should logout and add tokens to the Redis blacklist', async () => {
      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'decode').mockImplementation((token) => {
        return { exp: Math.floor(Date.now() / 1000) + 3600 }; // 1 hour expiration
      });

      await logoutUser({
        accessToken: 'access_mock',
        refreshToken: 'refresh_mock',
      });

      expect(jwt.decode).toHaveBeenCalledWith('access_mock');
      expect(jwt.decode).toHaveBeenCalledWith('refresh_mock');
      
      // Verify redisClient.set was called to blacklist both tokens
      expect(redisClient.set).toHaveBeenCalledTimes(2);
      expect(redisClient.set).toHaveBeenCalledWith(
        'bl_token:access_mock',
        'blacklisted',
        'EX',
        expect.any(Number)
      );
      expect(redisClient.set).toHaveBeenCalledWith(
        'bl_token:refresh_mock',
        'blacklisted',
        'EX',
        expect.any(Number)
      );
      
      jwt.decode.mockRestore();
    });
  });
});
