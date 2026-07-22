
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
 
describe('POST /api/vehicles', () => {
  let token;
 
  beforeEach(async () => {
    const user = await User.create({
      name: 'Staff User',
      email: 'staff@example.com',
      password: 'password123',
      role: 'customer',
    });
    token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
  });
 
  it('creates a new vehicle when authenticated and returns 201', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        make: 'Toyota',
        model: 'Corolla',
        category: 'Sedan',
        price: 22000,
        quantity: 5,
      });
 
    expect(res.status).toBe(201);
    expect(res.body.vehicle).toMatchObject({
      make: 'Toyota',
      model: 'Corolla',
      category: 'Sedan',
      price: 22000,
      quantity: 5,
    });
    expect(res.body.vehicle).toHaveProperty('id');
 
    const inDb = await Vehicle.findOne({ model: 'Corolla' });
    expect(inDb).toBeTruthy();
  });
 
  it('rejects creation without authentication', async () => {
    const res = await request(app).post('/api/vehicles').send({
      make: 'Honda',
      model: 'Civic',
      category: 'Sedan',
      price: 20000,
      quantity: 3,
    });
 
    expect(res.status).toBe(401);
  });
 
  it('rejects creation when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({ make: 'Ford' });
 
    expect(res.status).toBe(400);
  });
 
  it('rejects a negative price or quantity', async () => {
    const res = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${token}`)
      .send({
        make: 'Ford',
        model: 'Focus',
        category: 'Hatchback',
        price: -100,
        quantity: -5,
      });
 
    expect(res.status).toBe(400);
  });
});
 





