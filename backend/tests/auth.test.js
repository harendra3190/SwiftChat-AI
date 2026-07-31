// tests/auth.test.js — Auth module integration tests
const request = require('supertest');
const app = require('../src/app');

jest.setTimeout(45000);

describe('Auth API', () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@swiftchat.dev`,
    password: 'Test@12345',
  };
  let accessToken;

  it('POST /api/auth/register — should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    accessToken = res.body.data.accessToken;
  });

  it('POST /api/auth/register — should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login — should login successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    accessToken = res.body.data.accessToken;
  });

  it('POST /api/auth/login — should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: 'wrongpass' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('GET /api/auth/me — should return user profile', async () => {
    if (!accessToken) return;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('GET /api/health — should return healthy status', async () => {
    const res = await request(app).get('/api/health').expect(200);
    expect(res.body.success).toBe(true);
  });
});
