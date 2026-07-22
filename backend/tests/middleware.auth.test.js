const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const { JWT_SECRET } = require('../src/config/jwt');
 
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
 
describe('Authentication middleware (protect + adminOnly)', () => {
  let regularUser;
  let adminUser;
  let regularToken;
  let adminToken;
 
  beforeEach(async () => {
    regularUser = await User.create({
      name: 'Regular User',
      email: 'user@example.com',
      password: 'password123',
      role: 'customer',
    });
    // Our protect middleware signs/reads { id, role } directly off the
    // token payload, so tokens must include role to be checked by adminOnly.
    regularToken = jwt.sign({ id: regularUser._id, role: regularUser.role }, JWT_SECRET, {
      expiresIn: '1h',
    });
 
    adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    adminToken = jwt.sign({ id: adminUser._id, role: adminUser.role }, JWT_SECRET, {
      expiresIn: '1h',
    });
  });
 
  describe('protect', () => {
    it('allows access to a protected route with a valid token', async () => {
      const res = await request(app)
        .get('/api/test/protected')
        .set('Authorization', `Bearer ${regularToken}`);
 
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Success');
      expect(res.body.user.id).toBe(regularUser._id.toString());
    });
 
    it('blocks access when no token is provided', async () => {
      const res = await request(app).get('/api/test/protected');
 
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Not authorized, no token provided');
    });
 
    it('blocks access when the token is invalid or malformed', async () => {
      const res = await request(app)
        .get('/api/test/protected')
        .set('Authorization', 'Bearer invalid-token-string');
 
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Not authorized, invalid or expired token');
    });
 
    it(
      'documents a known tradeoff: a token for a deleted user still passes, ' +
        'since protect trusts the JWT payload and does not re-check the DB',
      async () => {
        await User.findByIdAndDelete(regularUser._id);
 
        const res = await request(app)
          .get('/api/test/protected')
          .set('Authorization', `Bearer ${regularToken}`);
 
        // This is expected, current behavior — not a bug. It's the
        // performance/staleness tradeoff noted in the README: revoking a
        // user doesn't invalidate their existing token before it expires.
        expect(res.status).toBe(200);
      }
    );
  });
 
  describe('adminOnly', () => {
    it('blocks a customer from accessing an admin-only route', async () => {
      const res = await request(app)
        .get('/api/test/admin')
        .set('Authorization', `Bearer ${regularToken}`);
 
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Admin access required');
    });
 
    it('allows an admin to access an admin-only route', async () => {
      const res = await request(app)
        .get('/api/test/admin')
        .set('Authorization', `Bearer ${adminToken}`);
 
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Admin Access Granted');
      expect(res.body.user.id).toBe(adminUser._id.toString());
    });
  });
});