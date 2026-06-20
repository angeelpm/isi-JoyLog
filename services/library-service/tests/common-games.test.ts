import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app';

let mongoServer: MongoMemoryServer;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const generateToken = (userId: string, username = 'testuser') =>
    jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

async function addGame(userId: string, rawgGameId: number) {
    const token = generateToken(userId, `user_${userId.slice(-4)}`);
    await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token}`)
        .send({ rawgGameId, title: `Game ${rawgGameId}`, coverImage: `cover_${rawgGameId}.jpg`, status: 'playing' });
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

describe('GET /common/:otherUserId', () => {
    it('should return games in common between two users', async () => {
        const userAId = new mongoose.Types.ObjectId().toString();
        const userBId = new mongoose.Types.ObjectId().toString();

        await addGame(userAId, 100);
        await addGame(userAId, 200);
        await addGame(userBId, 200);
        await addGame(userBId, 300);

        const token = generateToken(userAId, 'userA');
        const res = await request(app)
            .get(`/common/${userBId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.commonGames).toHaveLength(1);
        expect(res.body.commonGames[0].rawgGameId).toBe(200);
        expect(res.body.commonGames[0].title).toBe('Game 200');
    });

    it('should return empty array when users share no games', async () => {
        const userAId = new mongoose.Types.ObjectId().toString();
        const userBId = new mongoose.Types.ObjectId().toString();

        await addGame(userAId, 100);
        await addGame(userBId, 999);

        const token = generateToken(userAId, 'userA');
        const res = await request(app)
            .get(`/common/${userBId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.commonGames).toHaveLength(0);
    });

    it('should return 400 when comparing with yourself', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(userId);

        const res = await request(app)
            .get(`/common/${userId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe('Cannot compare with yourself');
    });

    it('should return 401 without auth token', async () => {
        const otherId = new mongoose.Types.ObjectId().toString();
        const res = await request(app).get(`/common/${otherId}`);
        expect(res.status).toBe(401);
    });
});
