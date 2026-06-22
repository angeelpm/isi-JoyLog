import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app';

let mongoServer: MongoMemoryServer;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const generateToken = (userId: string, username = 'testuser') =>
  jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
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

describe('GET /by-rawg/:rawgGameId', () => {
  const rawgGameId = 4242;

  it('returns the current user\'s existing entry for that game', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = generateToken(userId);

    await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawgGameId, title: 'Test Game', coverImage: '', status: 'completed', rating: 8, hoursPlayed: 40 });

    const res = await request(app)
      .get(`/by-rawg/${rawgGameId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.entry).not.toBeNull();
    expect(res.body.entry.status).toBe('completed');
    expect(res.body.entry.rating).toBe(8);
    expect(res.body.entry.hoursPlayed).toBe(40);
  });

  it('returns entry: null when the user has no entry for that game', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = generateToken(userId);

    const res = await request(app)
      .get(`/by-rawg/${rawgGameId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.entry).toBeNull();
  });

  it('does not return another user\'s entry for the same game', async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const ownerToken = generateToken(ownerId, 'owner');
    await request(app)
      .post('/')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ rawgGameId, title: 'Test Game', coverImage: '', status: 'playing' });

    const otherUserId = new mongoose.Types.ObjectId().toString();
    const otherToken = generateToken(otherUserId, 'other');

    const res = await request(app)
      .get(`/by-rawg/${rawgGameId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.entry).toBeNull();
  });

  it('requires authentication', async () => {
    const res = await request(app).get(`/by-rawg/${rawgGameId}`);
    expect(res.status).toBe(401);
  });
});
