import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app';

let mongoServer: MongoMemoryServer;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const generateToken = (userId: string, username = 'testuser') =>
  jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

// Helper: add a game with a reviewLog and return the entry
async function addGameWithReview(userId: string, rawgGameId: number, reviewText: string) {
  const token = generateToken(userId, `user_${userId.slice(-4)}`);
  const res = await request(app)
    .post('/')
    .set('Authorization', `Bearer ${token}`)
    .send({
      rawgGameId,
      title: `Game ${rawgGameId}`,
      coverImage: '',
      status: 'playing',
      reviewLogs: [{ text: reviewText, rating: 8 }]
    });
  return res.body.entry;
}

// Helper: fetch the entry and return the first reviewLog _id
async function getFirstReviewLogId(userId: string, gameEntryId: string) {
  const token = generateToken(userId, `user_${userId.slice(-4)}`);
  const res = await request(app)
    .get('/')
    .set('Authorization', `Bearer ${token}`);
  const entry = res.body.entries.find((e: any) => e._id === gameEntryId);
  return entry?.reviewLogs?.[0]?._id as string;
}

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

describe('POST /likes - like a review log', () => {
  it('should like a reviewLog successfully', async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const likerId = new mongoose.Types.ObjectId().toString();

    const entry = await addGameWithReview(ownerId, 100, 'Awesome game');
    const reviewLogId = await getFirstReviewLogId(ownerId, entry._id);
    expect(reviewLogId).toBeDefined();

    const likerToken = generateToken(likerId, 'liker');
    const res = await request(app)
      .post('/likes')
      .set('Authorization', `Bearer ${likerToken}`)
      .send({ gameEntryId: entry._id, reviewLogId });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Liked successfully');
  });

  it('should return 400 when gameEntryId is missing', async () => {
    const likerId = new mongoose.Types.ObjectId().toString();
    const token = generateToken(likerId);

    const res = await request(app)
      .post('/likes')
      .set('Authorization', `Bearer ${token}`)
      .send({ reviewLogId: 'someid' });

    expect(res.status).toBe(400);
  });

  it('should return 400 when reviewLogId is missing', async () => {
    const likerId = new mongoose.Types.ObjectId().toString();
    const token = generateToken(likerId);

    const res = await request(app)
      .post('/likes')
      .set('Authorization', `Bearer ${token}`)
      .send({ gameEntryId: 'someid' });

    expect(res.status).toBe(400);
  });

  it('should return 409 on duplicate like', async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const likerId = new mongoose.Types.ObjectId().toString();

    const entry = await addGameWithReview(ownerId, 101, 'Good game');
    const reviewLogId = await getFirstReviewLogId(ownerId, entry._id);

    const likerToken = generateToken(likerId, 'liker2');
    await request(app)
      .post('/likes')
      .set('Authorization', `Bearer ${likerToken}`)
      .send({ gameEntryId: entry._id, reviewLogId });

    const res = await request(app)
      .post('/likes')
      .set('Authorization', `Bearer ${likerToken}`)
      .send({ gameEntryId: entry._id, reviewLogId });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Already liked');
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app)
      .post('/likes')
      .send({ gameEntryId: 'x', reviewLogId: 'y' });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /likes/:reviewLogId - unlike a review log', () => {
  it('should unlike successfully', async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const likerId = new mongoose.Types.ObjectId().toString();

    const entry = await addGameWithReview(ownerId, 200, 'Fun game');
    const reviewLogId = await getFirstReviewLogId(ownerId, entry._id);

    const likerToken = generateToken(likerId, 'unliker');
    await request(app)
      .post('/likes')
      .set('Authorization', `Bearer ${likerToken}`)
      .send({ gameEntryId: entry._id, reviewLogId });

    const res = await request(app)
      .delete(`/likes/${reviewLogId}`)
      .set('Authorization', `Bearer ${likerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Unliked successfully');
  });

  it('should return 404 when like does not exist', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = generateToken(userId);
    const fakeReviewLogId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete(`/likes/${fakeReviewLogId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('should return 401 without auth token', async () => {
    const res = await request(app).delete('/likes/someid');
    expect(res.status).toBe(401);
  });
});

describe('Like count integration in community reviews', () => {
  const rawgGameId = 3000;

  it('should reflect likeCount and isLikedByMe in reviews response', async () => {
    const ownerId = new mongoose.Types.ObjectId().toString();
    const likerAId = new mongoose.Types.ObjectId().toString();
    const likerBId = new mongoose.Types.ObjectId().toString();

    const entry = await addGameWithReview(ownerId, rawgGameId, 'Liked review');
    const reviewLogId = await getFirstReviewLogId(ownerId, entry._id);

    // LikerA likes it
    const tokenA = generateToken(likerAId, 'likerA');
    await request(app)
      .post('/likes')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ gameEntryId: entry._id, reviewLogId });

    // LikerA queries reviews — isLikedByMe should be true, likeCount: 1
    const resA = await request(app)
      .get(`/reviews/${rawgGameId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(resA.status).toBe(200);
    const reviewA = resA.body.reviews.find((r: any) => r.reviewLogId === reviewLogId);
    expect(reviewA).toBeDefined();
    expect(reviewA.likeCount).toBe(1);
    expect(reviewA.isLikedByMe).toBe(true);

    // LikerB queries reviews — isLikedByMe should be false, likeCount: 1
    const tokenB = generateToken(likerBId, 'likerB');
    const resB = await request(app)
      .get(`/reviews/${rawgGameId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    const reviewB = resB.body.reviews.find((r: any) => r.reviewLogId === reviewLogId);
    expect(reviewB.likeCount).toBe(1);
    expect(reviewB.isLikedByMe).toBe(false);

    // Unauthenticated query — isLikedByMe false
    const resAnon = await request(app).get(`/reviews/${rawgGameId}`);
    const reviewAnon = resAnon.body.reviews.find((r: any) => r.reviewLogId === reviewLogId);
    expect(reviewAnon.likeCount).toBe(1);
    expect(reviewAnon.isLikedByMe).toBe(false);
  });
});
