import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app';

let mongoServer: MongoMemoryServer;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const generateToken = (userId: string, username = 'testuser') =>
    jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

async function addGame(userId: string, rawgGameId: number, opts: {
    status?: string;
    reviewText?: string;
    completedAt?: Date;
} = {}) {
    const token = generateToken(userId, `user_${userId.slice(-4)}`);
    const body: any = {
        rawgGameId,
        title: `Game ${rawgGameId}`,
        coverImage: `cover_${rawgGameId}.jpg`,
        status: opts.status || 'playing',
    };
    if (opts.reviewText) {
        body.reviewLogs = [{ text: opts.reviewText, rating: 8 }];
    }
    const res = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token}`)
        .send(body);
    return res.body.entry;
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

describe('GET /feed', () => {
    it('should return empty result when userIds is absent', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(userId);

        const res = await request(app)
            .get('/feed')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([]);
        expect(res.body.hasMore).toBe(false);
    });

    it('should return empty result when userIds is empty string', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(userId);

        const res = await request(app)
            .get('/feed?userIds=')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([]);
    });

    it('should return 401 without auth token', async () => {
        const res = await request(app).get('/feed?userIds=abc');
        expect(res.status).toBe(401);
    });

    it('should return combined review events from multiple users sorted by date desc', async () => {
        const userAId = new mongoose.Types.ObjectId().toString();
        const userBId = new mongoose.Types.ObjectId().toString();
        const viewerId = new mongoose.Types.ObjectId().toString();

        await addGame(userAId, 100, { reviewText: 'UserA review of game 100' });
        await addGame(userBId, 200, { reviewText: 'UserB review of game 200' });

        const token = generateToken(viewerId, 'viewer');
        const res = await request(app)
            .get(`/feed?userIds=${userAId},${userBId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.items.length).toBe(2);
        expect(res.body.items.every((i: any) => i.type === 'review')).toBe(true);
        // sorted by date desc — createdAt of items[0] >= items[1]
        const t0 = new Date(res.body.items[0].createdAt).getTime();
        const t1 = new Date(res.body.items[1].createdAt).getTime();
        expect(t0).toBeGreaterThanOrEqual(t1);
    });

    it('should not include events from users NOT in userIds', async () => {
        const includedId = new mongoose.Types.ObjectId().toString();
        const excludedId = new mongoose.Types.ObjectId().toString();
        const viewerId = new mongoose.Types.ObjectId().toString();

        await addGame(includedId, 300, { reviewText: 'Included review' });
        await addGame(excludedId, 400, { reviewText: 'Should not appear' });

        const token = generateToken(viewerId, 'viewer');
        const res = await request(app)
            .get(`/feed?userIds=${includedId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].title).toBe('Game 300');
    });

    it('should include likeCount, isLikedByMe, commentCount for review items', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const viewerId = new mongoose.Types.ObjectId().toString();

        const entry = await addGame(ownerId, 500, { reviewText: 'A review' });
        // get reviewLogId
        const ownerToken = generateToken(ownerId, 'owner');
        const entryRes = await request(app).get('/').set('Authorization', `Bearer ${ownerToken}`);
        const reviewLogId = entryRes.body.entries[0]?.reviewLogs?.[0]?._id;

        // Like the review
        const viewerToken = generateToken(viewerId, 'viewer');
        await request(app)
            .post('/likes')
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({ gameEntryId: entry._id, reviewLogId });

        const res = await request(app)
            .get(`/feed?userIds=${ownerId}`)
            .set('Authorization', `Bearer ${viewerToken}`);

        expect(res.status).toBe(200);
        const item = res.body.items[0];
        expect(item.likeCount).toBe(1);
        expect(item.isLikedByMe).toBe(true);
        expect(item.commentCount).toBe(0);
    });

    it('should paginate correctly and return hasMore', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const viewerId = new mongoose.Types.ObjectId().toString();

        // Create 25 game entries with reviews
        for (let i = 1; i <= 25; i++) {
            await addGame(userId, i, { reviewText: `Review ${i}` });
        }

        const token = generateToken(viewerId, 'viewer');

        const page1 = await request(app)
            .get(`/feed?userIds=${userId}&page=1`)
            .set('Authorization', `Bearer ${token}`);

        expect(page1.status).toBe(200);
        expect(page1.body.items).toHaveLength(20);
        expect(page1.body.hasMore).toBe(true);
        expect(page1.body.page).toBe(1);

        const page2 = await request(app)
            .get(`/feed?userIds=${userId}&page=2`)
            .set('Authorization', `Bearer ${token}`);

        expect(page2.status).toBe(200);
        expect(page2.body.items).toHaveLength(5);
        expect(page2.body.hasMore).toBe(false);
        expect(page2.body.page).toBe(2);
    });
});
