const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
 
let mongoServer;
 
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ binary: { version: '4.4.15' } });
  await mongoose.connect(mongoServer.getUri());
}, 300000);
 
afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});
 
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});
 
describe('POST /api/auth/login', () => {
  const plainPassword = 'password123';
 
  beforeEach(async () => {
    // Our model has no pre-save hashing hook (hashing lives in the
    // controller), so we hash manually here to set up a realistic user.
    const hashed = await bcrypt.hash(plainPassword, 10);
    await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashed,
      role: 'customer',
    });
  });
 
  it('logs in with correct credentials and returns a token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: plainPassword,
    });
 
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user.password).toBeUndefined();
  });
 
  it('rejects login when email or password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
    });
 
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email and password are required');
  });
 
  it('rejects login for a non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nonexistent@example.com',
      password: plainPassword,
    });
 
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
 
  it('rejects login with an incorrect password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
 
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
});