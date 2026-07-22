const request = require('supertest');
const mongoose = require('mongoose');
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
 
describe('POST /api/auth/register', () => {
  it('registers a new user and returns 201 with a token and nested user object', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
    });
 
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com',
      role: 'customer',
    });
    expect(res.body.user.password).toBeUndefined();
 
    const userInDb = await User.findOne({ email: 'john@example.com' });
    expect(userInDb).toBeTruthy();
    expect(userInDb.name).toBe('John Doe');
  });
 
  it('ignores a client-supplied role and always defaults to customer', async () => {
    // Regression test for the privilege-escalation bug: registration must
    // never let the caller choose their own role.
    const res = await request(app).post('/api/auth/register').send({
      name: 'Sneaky User',
      email: 'sneaky@example.com',
      password: 'password123',
      role: 'admin',
    });
 
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('customer');
 
    const userInDb = await User.findOne({ email: 'sneaky@example.com' });
    expect(userInDb.role).toBe('customer');
  });
 
  it('rejects registration when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'missing-fields@example.com',
    });
 
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Name, email and password are required');
  });
 
  it('rejects registration when the email is already in use', async () => {
    await User.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
    });
 
    const res = await request(app).post('/api/auth/register').send({
      name: 'Jane Clone',
      email: 'jane@example.com',
      password: 'password123',
    });
 
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('An account with this email already exists');
  });
});