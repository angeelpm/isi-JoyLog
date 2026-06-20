import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import app from '../src/app';

let mongoServer: MongoMemoryServer;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const generateToken = (userId: string, username = 'testuser') =>
    jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '1h' });

async function createList(userId: string, title: string, isPublic = false) {
    const token = generateToken(userId, `user_${userId.slice(-4)}`);
    const res = await request(app)
        .post('/lists')
        .set('Authorization', `Bearer ${token}`)
        .send({ title, isPublic });
    return res.body.list;
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

describe('POST /lists - create a list', () => {
    it('should create a list and return 201', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(userId);

        const res = await request(app)
            .post('/lists')
            .set('Authorization', `Bearer ${token}`)
            .send({ title: 'My List', description: 'Desc', isPublic: true });

        expect(res.status).toBe(201);
        expect(res.body.list.title).toBe('My List');
        expect(res.body.list.ownerId).toBe(userId);
        expect(res.body.list.isPublic).toBe(true);
    });

    it('should appear in /lists/mine after creation', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        await createList(userId, 'Visible List');

        const token = generateToken(userId, `user_${userId.slice(-4)}`);
        const res = await request(app)
            .get('/lists/mine')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.lists).toHaveLength(1);
        expect(res.body.lists[0].title).toBe('Visible List');
    });

    it('should return 400 when title is missing', async () => {
        const userId = new mongoose.Types.ObjectId().toString();
        const token = generateToken(userId);

        const res = await request(app)
            .post('/lists')
            .set('Authorization', `Bearer ${token}`)
            .send({ description: 'No title' });

        expect(res.status).toBe(400);
    });

    it('should return 401 without auth', async () => {
        const res = await request(app).post('/lists').send({ title: 'x' });
        expect(res.status).toBe(401);
    });
});

describe('GET /lists/:listId - view a list', () => {
    it('should return a public list without auth', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'Public List', true);

        const res = await request(app).get(`/lists/${list._id}`);
        expect(res.status).toBe(200);
        expect(res.body.list.title).toBe('Public List');
    });

    it('should return 403 for a private list when not authenticated', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'Private List', false);

        const res = await request(app).get(`/lists/${list._id}`);
        expect(res.status).toBe(403);
    });

    it('should return 403 for a private list when authenticated but not owner/collaborator', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const strangerId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'Private List', false);

        const strangerToken = generateToken(strangerId, 'stranger');
        const res = await request(app)
            .get(`/lists/${list._id}`)
            .set('Authorization', `Bearer ${strangerToken}`);

        expect(res.status).toBe(403);
    });

    it('should return 200 for a private list when viewer is a collaborator', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const collabId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'Private List', false);

        // Add collaborator
        const ownerToken = generateToken(ownerId, `user_${ownerId.slice(-4)}`);
        await request(app)
            .post(`/lists/${list._id}/collaborators`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ userId: collabId });

        const collabToken = generateToken(collabId, 'collab');
        const res = await request(app)
            .get(`/lists/${list._id}`)
            .set('Authorization', `Bearer ${collabToken}`);

        expect(res.status).toBe(200);
    });

    it('should return 404 for a non-existent list', async () => {
        const res = await request(app).get(`/lists/${new mongoose.Types.ObjectId()}`);
        expect(res.status).toBe(404);
    });
});

describe('PUT /lists/:listId - edit a list', () => {
    it('should allow owner to edit the list', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'Old Title');

        const ownerToken = generateToken(ownerId, `user_${ownerId.slice(-4)}`);
        const res = await request(app)
            .put(`/lists/${list._id}`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ title: 'New Title', isPublic: true });

        expect(res.status).toBe(200);
        expect(res.body.list.title).toBe('New Title');
        expect(res.body.list.isPublic).toBe(true);
    });

    it('should return 403 when non-owner tries to edit', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const otherId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'Owner List');

        const otherToken = generateToken(otherId, 'other');
        const res = await request(app)
            .put(`/lists/${list._id}`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ title: 'Hacked' });

        expect(res.status).toBe(403);
    });
});

describe('POST /lists/:listId/games - add a game', () => {
    it('should allow owner to add a game and avoid duplicates', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'Game List');
        const ownerToken = generateToken(ownerId, `user_${ownerId.slice(-4)}`);

        await request(app)
            .post(`/lists/${list._id}/games`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ rawgGameId: '123', title: 'Zelda', coverImage: 'zelda.jpg' });

        // Add same game again — should not duplicate
        const res = await request(app)
            .post(`/lists/${list._id}/games`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ rawgGameId: '123', title: 'Zelda', coverImage: 'zelda.jpg' });

        expect(res.status).toBe(200);
        expect(res.body.list.rawgGameIds).toHaveLength(1);
        expect(res.body.list.rawgGameIds[0]).toBe('123');
    });

    it('should allow collaborator to add a game', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const collabId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'Collab List');

        const ownerToken = generateToken(ownerId, `user_${ownerId.slice(-4)}`);
        await request(app)
            .post(`/lists/${list._id}/collaborators`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ userId: collabId });

        const collabToken = generateToken(collabId, 'collab');
        const res = await request(app)
            .post(`/lists/${list._id}/games`)
            .set('Authorization', `Bearer ${collabToken}`)
            .send({ rawgGameId: '456', title: 'Metroid', coverImage: '' });

        expect(res.status).toBe(200);
        expect(res.body.list.rawgGameIds).toContain('456');
    });

    it('should return 403 for an external user (not owner or collaborator)', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const strangerId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'Private List');

        const strangerToken = generateToken(strangerId, 'stranger');
        const res = await request(app)
            .post(`/lists/${list._id}/games`)
            .set('Authorization', `Bearer ${strangerToken}`)
            .send({ rawgGameId: '789', title: 'Halo', coverImage: '' });

        expect(res.status).toBe(403);
    });
});

describe('DELETE /lists/:listId/games/:rawgGameId - remove a game', () => {
    it('should remove a game from the list', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'List');
        const ownerToken = generateToken(ownerId, `user_${ownerId.slice(-4)}`);

        await request(app)
            .post(`/lists/${list._id}/games`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ rawgGameId: '111' });

        const res = await request(app)
            .delete(`/lists/${list._id}/games/111`)
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body.list.rawgGameIds).not.toContain('111');
    });
});

describe('Collaborator management', () => {
    it('should return 403 when non-owner tries to add a collaborator', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const strangerId = new mongoose.Types.ObjectId().toString();
        const victimId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'List');

        const strangerToken = generateToken(strangerId, 'stranger');
        const res = await request(app)
            .post(`/lists/${list._id}/collaborators`)
            .set('Authorization', `Bearer ${strangerToken}`)
            .send({ userId: victimId });

        expect(res.status).toBe(403);
    });

    it('should return 403 when non-owner tries to remove a collaborator', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const collabId = new mongoose.Types.ObjectId().toString();
        const strangerId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'List');

        const ownerToken = generateToken(ownerId, `user_${ownerId.slice(-4)}`);
        await request(app)
            .post(`/lists/${list._id}/collaborators`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ userId: collabId });

        const strangerToken = generateToken(strangerId, 'stranger');
        const res = await request(app)
            .delete(`/lists/${list._id}/collaborators/${collabId}`)
            .set('Authorization', `Bearer ${strangerToken}`);

        expect(res.status).toBe(403);
    });

    it('should appear in /lists/mine for a collaborator', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const collabId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'Shared List');

        const ownerToken = generateToken(ownerId, `user_${ownerId.slice(-4)}`);
        await request(app)
            .post(`/lists/${list._id}/collaborators`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ userId: collabId });

        const collabToken = generateToken(collabId, 'collab');
        const res = await request(app)
            .get('/lists/mine')
            .set('Authorization', `Bearer ${collabToken}`);

        expect(res.status).toBe(200);
        expect(res.body.lists.some((l: any) => l._id === list._id)).toBe(true);
    });
});

describe('DELETE /lists/:listId - delete a list', () => {
    it('should return 403 when non-owner tries to delete', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const strangerId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'List');

        const strangerToken = generateToken(strangerId, 'stranger');
        const res = await request(app)
            .delete(`/lists/${list._id}`)
            .set('Authorization', `Bearer ${strangerToken}`);

        expect(res.status).toBe(403);
    });

    it('should delete list as owner and no longer appear in /lists/mine', async () => {
        const ownerId = new mongoose.Types.ObjectId().toString();
        const list = await createList(ownerId, 'To Delete');
        const ownerToken = generateToken(ownerId, `user_${ownerId.slice(-4)}`);

        const deleteRes = await request(app)
            .delete(`/lists/${list._id}`)
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(deleteRes.status).toBe(200);

        const mineRes = await request(app)
            .get('/lists/mine')
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(mineRes.body.lists).toHaveLength(0);
    });
});
