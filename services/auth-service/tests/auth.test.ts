import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

describe('Auth Service Integration Tests', () => {
  describe('POST /register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
    });

    it('should fail to register user with duplicate email', async () => {
      await request(app)
        .post('/register')
        .send({
          username: 'testuser1',
          email: 'test@example.com',
          password: 'password123'
        });

      const response = await request(app)
        .post('/register')
        .send({
          username: 'testuser2',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('User with that email or username already exists');
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/register')
        .send({
          username: 'loginuser',
          email: 'login@example.com',
          password: 'loginpassword'
        });
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          usernameOrEmail: 'loginuser',
          password: 'loginpassword'
        });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    it('should fail login with incorrect password', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          usernameOrEmail: 'loginuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });
  });
});
