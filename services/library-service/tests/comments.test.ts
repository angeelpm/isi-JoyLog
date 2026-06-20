import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app';

let mongoServer: MongoMemoryServer;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const generateToken = (userId: string, username = 'testuser') =>
    jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

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
            reviewLogs: [{ text: reviewText, rating: 7 }]
        });
    return res.body.entry;
}

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

describe('POST /comments - create a comment', () => {
    it('should create a comment and return 201', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const commenterId = new mongoose.Types.ObjectId().toString();

        const entry = await addGameWithReview(ownerId, 1, 'Great game');
        const reviewLogId = await getFirstReviewLogId(ownerId, entry._id);

        const token = generateToken(commenterId, 'commenter');
        const res = await request(app)
            .post('/comments')
            .set('Authorization', `Bearer ${token}`)
            .send({ gameEntryId: entry._id, reviewLogId, text: 'Totally agree!' });

        expect(res.status).toBe(201);
        expect(res.body.comment.text).toBe('Totally agree!');
        expect(res.body.comment.commenterId).toBe(commenterId);
    });

    it('should return 401 without auth token', async () => {
        const res = await request(app)
            .post('/comments')
            .send({ gameEntryId: 'x', reviewLogId: 'y', text: 'hi' });

        expect(res.status).toBe(401);
    });

    it('should return 400 when text is missing', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(userId);

        const res = await request(app)
            .post('/comments')
            .set('Authorization', `Bearer ${token}`)
            .send({ gameEntryId: 'x', reviewLogId: 'y' });

        expect(res.status).toBe(400);
    });

    it('should return 400 when gameEntryId is missing', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(userId);

        const res = await request(app)
            .post('/comments')
            .set('Authorization', `Bearer ${token}`)
            .send({ reviewLogId: 'y', text: 'hi' });

        expect(res.status).toBe(400);
    });

    it('should return 400 when reviewLogId is missing', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(userId);

        const res = await request(app)
            .post('/comments')
            .set('Authorization', `Bearer ${token}`)
            .send({ gameEntryId: 'x', text: 'hi' });

        expect(res.status).toBe(400);
    });
});

describe('GET /comments/:reviewLogId - list comments (public)', () => {
    it('should return comments sorted by createdAt asc', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const userAId = new mongoose.Types.ObjectId().toString();
        const userBId = new mongoose.Types.ObjectId().toString();

        const entry = await addGameWithReview(ownerId, 2, 'Nice game');
        const reviewLogId = await getFirstReviewLogId(ownerId, entry._id);

        const tokenA = generateToken(userAId, 'userA');
        const tokenB = generateToken(userBId, 'userB');

        await request(app)
            .post('/comments')
            .set('Authorization', `Bearer ${tokenA}`)
            .send({ gameEntryId: entry._id, reviewLogId, text: 'First comment' });

        await request(app)
            .post('/comments')
            .set('Authorization', `Bearer ${tokenB}`)
            .send({ gameEntryId: entry._id, reviewLogId, text: 'Second comment' });

        const res = await request(app).get(`/comments/${reviewLogId}`);

        expect(res.status).toBe(200);
        expect(res.body.comments).toHaveLength(2);
        expect(res.body.comments[0].text).toBe('First comment');
        expect(res.body.comments[1].text).toBe('Second comment');
    });

    it('should return empty array when there are no comments', async () => {
        const fakeReviewLogId = new mongoose.Types.ObjectId().toString();
        const res = await request(app).get(`/comments/${fakeReviewLogId}`);

        expect(res.status).toBe(200);
        expect(res.body.comments).toHaveLength(0);
    });
});

describe('DELETE /comments/:commentId - delete a comment', () => {
    it('should delete own comment and return 200', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const commenterId = new mongoose.Types.ObjectId().toString();

        const entry = await addGameWithReview(ownerId, 3, 'Fun game');
        const reviewLogId = await getFirstReviewLogId(ownerId, entry._id);

        const token = generateToken(commenterId, 'commenter');
        const createRes = await request(app)
            .post('/comments')
            .set('Authorization', `Bearer ${token}`)
            .send({ gameEntryId: entry._id, reviewLogId, text: 'Will delete this' });

        const commentId = createRes.body.comment._id;

        const deleteRes = await request(app)
            .delete(`/comments/${commentId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.message).toBe('Comment deleted');

        const listRes = await request(app).get(`/comments/${reviewLogId}`);
        expect(listRes.body.comments).toHaveLength(0);
    });

    it('should return 403 when deleting another user\'s comment', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const commenterId = new mongoose.Types.ObjectId().toString();
        const otherUserId = new mongoose.Types.ObjectId().toString();

        const entry = await addGameWithReview(ownerId, 4, 'Cool game');
        const reviewLogId = await getFirstReviewLogId(ownerId, entry._id);

        const commenterToken = generateToken(commenterId, 'commenter');
        const createRes = await request(app)
            .post('/comments')
            .set('Authorization', `Bearer ${commenterToken}`)
            .send({ gameEntryId: entry._id, reviewLogId, text: 'Mine comment' });

        const commentId = createRes.body.comment._id;

        const otherToken = generateToken(otherUserId, 'intruder');
        const deleteRes = await request(app)
            .delete(`/comments/${commentId}`)
            .set('Authorization', `Bearer ${otherToken}`);

        expect(deleteRes.status).toBe(403);
    });

    it('should return 404 for a non-existent comment', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(userId);
        const fakeId = new mongoose.Types.ObjectId().toString();

        const res = await request(app)
            .delete(`/comments/${fakeId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(404);
    });

    it('should return 401 without auth token', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const res = await request(app).delete(`/comments/${fakeId}`);
        expect(res.status).toBe(401);
    });
});

describe('commentCount in getGameReviews', () => {
    const rawgGameId = 9000;

    it('should return commentCount 0 when no comments exist', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const viewerId = new mongoose.Types.ObjectId().toString();

        await addGameWithReview(ownerId, rawgGameId, 'My review');

        const token = generateToken(viewerId, 'viewer');
        const res = await request(app)
            .get(`/reviews/${rawgGameId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        const review = res.body.reviews[0];
        expect(review.commentCount).toBe(0);
    });

    it('should return correct commentCount with one comment', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const commenterId = new mongoose.Types.ObjectId().toString();

        const entry = await addGameWithReview(ownerId, rawgGameId, 'My review');
        const reviewLogId = await getFirstReviewLogId(ownerId, entry._id);

        const commenterToken = generateToken(commenterId, 'commenter');
        await request(app)
            .post('/comments')
            .set('Authorization', `Bearer ${commenterToken}`)
            .send({ gameEntryId: entry._id, reviewLogId, text: 'Nice!' });

        const viewerToken = generateToken(new mongoose.Types.ObjectId().toString(), 'viewer');
        const res = await request(app)
            .get(`/reviews/${rawgGameId}`)
            .set('Authorization', `Bearer ${viewerToken}`);

        const review = res.body.reviews.find((r: any) => r.reviewLogId === reviewLogId);
        expect(review.commentCount).toBe(1);
    });

    it('should return correct commentCount with multiple comments', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();

        const entry = await addGameWithReview(ownerId, rawgGameId, 'My review');
        const reviewLogId = await getFirstReviewLogId(ownerId, entry._id);

        for (let i = 0; i < 3; i++) {
            const uid = new mongoose.Types.ObjectId().toString();
            const token = generateToken(uid, `user${i}`);
            await request(app)
                .post('/comments')
                .set('Authorization', `Bearer ${token}`)
                .send({ gameEntryId: entry._id, reviewLogId, text: `Comment ${i}` });
        }

        const viewerToken = generateToken(new mongoose.Types.ObjectId().toString(), 'viewer');
        const res = await request(app)
            .get(`/reviews/${rawgGameId}`)
            .set('Authorization', `Bearer ${viewerToken}`);

        const review = res.body.reviews.find((r: any) => r.reviewLogId === reviewLogId);
        expect(review.commentCount).toBe(3);
    });
});
