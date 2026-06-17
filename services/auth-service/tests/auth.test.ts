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

// Helper: register a user and return { token, userId }
async function registerUser(username: string, email: string, password = 'password123') {
  const res = await request(app).post('/register').send({ username, email, password });
  return { token: res.body.token, userId: res.body.user.id as string };
}

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

  describe('GET /users/:username - public profile', () => {
    it('should return public profile without auth token', async () => {
      await registerUser('profileuser', 'profile@example.com');

      const res = await request(app).get('/users/profileuser');
      expect(res.status).toBe(200);
      expect(res.body.username).toBe('profileuser');
      expect(res.body.followersCount).toBe(0);
      expect(res.body.followingCount).toBe(0);
      expect(res.body.isFollowing).toBe(false);
      expect(res.body.email).toBeUndefined();
    });

    it('should return 404 for unknown username', async () => {
      const res = await request(app).get('/users/doesnotexist');
      expect(res.status).toBe(404);
    });

    it('isFollowing reflects real state when authenticated', async () => {
      const { token: tokenA, userId: userAId } = await registerUser('usera', 'a@example.com');
      const { userId: userBId } = await registerUser('userb', 'b@example.com');

      // A follows B
      await request(app)
        .post(`/users/${userBId}/follow`)
        .set('Authorization', `Bearer ${tokenA}`);

      const res = await request(app)
        .get('/users/userb')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.isFollowing).toBe(true);
      expect(res.body.followersCount).toBe(1);
    });
  });

  describe('POST /users/:userId/follow', () => {
    it('should follow another user successfully', async () => {
      const { token } = await registerUser('follower1', 'f1@example.com');
      const { userId: targetId } = await registerUser('target1', 't1@example.com');

      const res = await request(app)
        .post(`/users/${targetId}/follow`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Followed successfully');
    });

    it('should not allow following yourself', async () => {
      const { token, userId } = await registerUser('selfuser', 'self@example.com');

      const res = await request(app)
        .post(`/users/${userId}/follow`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cannot follow yourself');
    });

    it('should return 404 for non-existent userId', async () => {
      const { token } = await registerUser('fuser2', 'f2@example.com');
      const fakeId = '000000000000000000000000';

      const res = await request(app)
        .post(`/users/${fakeId}/follow`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should be idempotent — following twice does not error', async () => {
      const { token } = await registerUser('idemfollow', 'idem@example.com');
      const { userId: targetId } = await registerUser('idemtarget', 'idemtarget@example.com');

      await request(app).post(`/users/${targetId}/follow`).set('Authorization', `Bearer ${token}`);
      const res = await request(app).post(`/users/${targetId}/follow`).set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    it('should require auth token', async () => {
      const { userId: targetId } = await registerUser('noauthfollowtarget', 'nat@example.com');

      const res = await request(app).post(`/users/${targetId}/follow`);
      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /users/:userId/follow', () => {
    it('should unfollow a followed user', async () => {
      const { token } = await registerUser('unfollower', 'unf@example.com');
      const { userId: targetId } = await registerUser('unftarget', 'unftarget@example.com');

      await request(app).post(`/users/${targetId}/follow`).set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .delete(`/users/${targetId}/follow`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Unfollowed successfully');
    });

    it('should return 200 even when not following (no-op)', async () => {
      const { token } = await registerUser('noopunfollow', 'noop@example.com');
      const { userId: targetId } = await registerUser('nooptarget', 'nooptarget@example.com');

      const res = await request(app)
        .delete(`/users/${targetId}/follow`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /users/:userId/followers and /following', () => {
    it('should return followers list after a follow', async () => {
      const { token: tokenA, userId: userAId } = await registerUser('flwrA', 'flwrA@example.com');
      const { userId: userBId } = await registerUser('flwrB', 'flwrB@example.com');

      await request(app).post(`/users/${userBId}/follow`).set('Authorization', `Bearer ${tokenA}`);

      const res = await request(app)
        .get(`/users/${userBId}/followers`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((u: any) => u._id.toString() === userAId)).toBe(true);
    });

    it('should return following list after a follow', async () => {
      const { token: tokenA, userId: userAId } = await registerUser('fwingA', 'fwingA@example.com');
      const { userId: userBId } = await registerUser('fwingB', 'fwingB@example.com');

      await request(app).post(`/users/${userBId}/follow`).set('Authorization', `Bearer ${tokenA}`);

      const res = await request(app)
        .get(`/users/${userAId}/following`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.some((u: any) => u._id.toString() === userBId)).toBe(true);
    });

    it('should return empty array for a user with no social graph', async () => {
      const { token, userId } = await registerUser('lonelyuser', 'lonely@example.com');

      const followers = await request(app).get(`/users/${userId}/followers`).set('Authorization', `Bearer ${token}`);
      const following = await request(app).get(`/users/${userId}/following`).set('Authorization', `Bearer ${token}`);

      expect(followers.body).toEqual([]);
      expect(following.body).toEqual([]);
    });

    it('should require auth token', async () => {
      const { userId } = await registerUser('authrequired', 'authreq@example.com');

      const res = await request(app).get(`/users/${userId}/followers`);
      expect(res.status).toBe(401);
    });
  });
});
