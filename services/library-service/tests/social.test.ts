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

describe('Community Reviews — public access', () => {
  const rawgGameId = 9999;

  it('should return reviews without auth token', async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const token = generateToken(ownerId, 'reviewer');

    await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rawgGameId,
        title: 'Test Game',
        coverImage: '',
        status: 'playing',
        reviewLogs: [{ text: 'Great game!', rating: 9 }]
      });

    const res = await request(app).get(`/reviews/${rawgGameId}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.reviews)).toBe(true);
    expect(res.body.reviews.length).toBeGreaterThan(0);
    expect(res.body.reviews[0].text).toBe('Great game!');
    expect(res.body.reviews[0].isCurrentUser).toBe(false);
  });

  it('should include reviewLogId, likeCount and isLikedByMe in each review', async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const token = generateToken(ownerId, 'reviewer2');

    await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send({
        rawgGameId,
        title: 'Test Game',
        coverImage: '',
        status: 'playing',
        reviewLogs: [{ text: 'Good game', rating: 7 }]
      });

    const res = await request(app).get(`/reviews/${rawgGameId}`);

    expect(res.status).toBe(200);
    const review = res.body.reviews[0];
    expect(review.reviewLogId).toBeDefined();
    expect(typeof review.likeCount).toBe('number');
    expect(typeof review.isLikedByMe).toBe('boolean');
  });

  it('should include the authenticated user\'s own reviews, flagged with isCurrentUser', async () => {
    const authorId = new mongoose.Types.ObjectId().toString();
    const otherUserId = new mongoose.Types.ObjectId().toString();
    const authorToken = generateToken(authorId, 'author');
    const otherToken = generateToken(otherUserId, 'other');

    // Author creates entry with review
    await request(app)
      .post('/')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        rawgGameId,
        title: 'Test Game',
        coverImage: '',
        status: 'playing',
        reviewLogs: [{ text: 'My review', rating: 8 }]
      });

    // Other user creates entry with review
    await request(app)
      .post('/')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({
        rawgGameId,
        title: 'Test Game',
        coverImage: '',
        status: 'playing',
        reviewLogs: [{ text: 'Other review', rating: 6 }]
      });

    // Author queries — sees both their own review and the other user's
    const res = await request(app)
      .get(`/reviews/${rawgGameId}`)
      .set('Authorization', `Bearer ${authorToken}`);

    expect(res.status).toBe(200);

    const ownReview = res.body.reviews.find((r: any) => r.text === 'My review');
    const otherReview = res.body.reviews.find((r: any) => r.text === 'Other review');

    expect(ownReview).toBeDefined();
    expect(ownReview.isCurrentUser).toBe(true);
    expect(otherReview).toBeDefined();
    expect(otherReview.isCurrentUser).toBe(false);
  });

  it('should return empty reviews array when no entries exist', async () => {
    const res = await request(app).get('/reviews/0');

    expect(res.status).toBe(200);
    expect(res.body.reviews).toEqual([]);
  });
});

describe('GET /stats/public/:userId - public stats', () => {
  it('should return stats without auth token', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = generateToken(userId);

    await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawgGameId: 1, title: 'Game A', coverImage: '', status: 'playing', hoursPlayed: 10 });

    await request(app)
      .post('/')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawgGameId: 2, title: 'Game B', coverImage: '', status: 'completed', hoursPlayed: 20 });

    const res = await request(app).get(`/stats/public/${userId}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.total).toBe(2);
    expect(res.body.stats.playing).toBe(1);
    expect(res.body.stats.completed).toBe(1);
    expect(res.body.stats.totalHoursPlayed).toBe(30);
  });

  it('should return zeroed stats for a userId with no entries', async () => {
    const emptyUserId = new mongoose.Types.ObjectId().toString();

    const res = await request(app).get(`/stats/public/${emptyUserId}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.total).toBe(0);
    expect(res.body.stats.totalHoursPlayed).toBe(0);
  });
});
