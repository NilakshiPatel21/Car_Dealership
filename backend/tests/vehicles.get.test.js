const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/User');
const Vehicle = require('../src/models/Vehicle');
const { JWT_SECRET } = require('../src/config/jwt');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    binary: { version: '4.4.15' },
  });

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

describe('GET /api/vehicles', () => {
  let token;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Staff User',
      email: 'staff@example.com',
      password: 'password123',
      role: 'customer',
    });

    token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      JWT_SECRET
    );
  });

  it('returns all available vehicles', async () => {
    await Vehicle.create([
      {
        make: 'Toyota',
        model: 'Fortuner',
        category: 'SUV',
        price: 4200000,
        quantity: 5,
      },
      {
        make: 'Honda',
        model: 'City',
        category: 'Sedan',
        price: 1500000,
        quantity: 8,
      },
    ]);

    const res = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);

    expect(res.body[0]).toHaveProperty('make');
    expect(res.body[0]).toHaveProperty('model');
    expect(res.body[0]).toHaveProperty('category');
    expect(res.body[0]).toHaveProperty('price');
    expect(res.body[0]).toHaveProperty('quantity');
  });

  it('returns an empty array when no vehicles exist', async () => {
    const res = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('rejects request without a JWT token', async () => {
    const res = await request(app).get('/api/vehicles');

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Not authorized, no token provided');
  });
});