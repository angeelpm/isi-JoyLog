import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app';

let mongoServer: MongoMemoryServer;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const testUserId = new mongoose.Types.ObjectId().toString();

const generateToken = (userId: string = testUserId) => {
  return jwt.sign({ id: userId, username: 'testuser' }, JWT_SECRET, { expiresIn: '1h' });
};

const testGame = {
  rawgGameId: 3498,
  title: 'Grand Theft Auto V',
  coverImage: 'https://media.rawg.io/media/games/456/456dea5e1c7e3cd07060c14e96612001.jpg',
  status: 'playing',
  rating: 9,
  platforms: ['PC', 'PlayStation 5'],
  genres: ['Action', 'Adventure']
};

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
    await collections[key].deleteMany({});
  }
});

describe('Library Service Integration Tests', () => {
  describe('POST / - Add game', () => {
    it('should add a game to user library', async () => {
      const token = generateToken();
      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token}`)
        .send(testGame);

      expect(response.status).toBe(201);
      expect(response.body.entry.title).toBe('Grand Theft Auto V');
      expect(response.body.entry.status).toBe('playing');
      expect(response.body.entry.userId).toBe(testUserId);
    });

    it('should reject duplicate game', async () => {
      const token = generateToken();
      await request(app).post('/').set('Authorization', `Bearer ${token}`).send(testGame);
      const response = await request(app).post('/').set('Authorization', `Bearer ${token}`).send(testGame);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Game already in your library');
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app).post('/').send(testGame);
      expect(response.status).toBe(401);
    });
  });

  describe('GET / - Get library', () => {
    it('should return user library', async () => {
      const token = generateToken();
      await request(app).post('/').set('Authorization', `Bearer ${token}`).send(testGame);
      await request(app).post('/').set('Authorization', `Bearer ${token}`).send({
        ...testGame, rawgGameId: 4200, title: 'Portal 2', status: 'completed'
      });

      const response = await request(app).get('/').set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter by status', async () => {
      const token = generateToken();
      await request(app).post('/').set('Authorization', `Bearer ${token}`).send(testGame);
      await request(app).post('/').set('Authorization', `Bearer ${token}`).send({
        ...testGame, rawgGameId: 4200, title: 'Portal 2', status: 'completed'
      });

      const response = await request(app).get('/?status=completed').set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.entries.length).toBe(1);
      expect(response.body.entries[0].title).toBe('Portal 2');
    });
  });

  describe('PUT /:id - Update game', () => {
    it('should update game status and rating', async () => {
      const token = generateToken();
      const addRes = await request(app).post('/').set('Authorization', `Bearer ${token}`).send(testGame);
      const gameId = addRes.body.entry._id;

      const response = await request(app)
        .put(`/${gameId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'completed', rating: 10 });

      expect(response.status).toBe(200);
      expect(response.body.entry.status).toBe('completed');
      expect(response.body.entry.rating).toBe(10);
      expect(response.body.entry.completedAt).toBeDefined();
    });
  });

  describe('DELETE /:id - Remove game', () => {
    it('should delete a game entry', async () => {
      const token = generateToken();
      const addRes = await request(app).post('/').set('Authorization', `Bearer ${token}`).send(testGame);
      const gameId = addRes.body.entry._id;

      const response = await request(app)
        .delete(`/${gameId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Game removed from library');

      // Verify it's gone
      const getRes = await request(app).get('/').set('Authorization', `Bearer ${token}`);
      expect(getRes.body.entries.length).toBe(0);
    });
  });

  describe('GET /stats - User stats', () => {
    it('should return correct stats', async () => {
      const token = generateToken();
      await request(app).post('/').set('Authorization', `Bearer ${token}`).send({
        ...testGame, hoursPlayed: 50
      });
      await request(app).post('/').set('Authorization', `Bearer ${token}`).send({
        ...testGame, rawgGameId: 4200, title: 'Portal 2', status: 'completed', hoursPlayed: 20, rating: 10
      });

      const response = await request(app).get('/stats').set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(200);
      expect(response.body.stats.total).toBe(2);
      expect(response.body.stats.playing).toBe(1);
      expect(response.body.stats.completed).toBe(1);
      expect(response.body.stats.totalHoursPlayed).toBe(70);
    });
  });
});
