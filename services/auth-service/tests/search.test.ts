import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app';

let mongoServer: MongoMemoryServer;

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

async function registerUser(username: string, email: string) {
  const res = await request(app).post('/register').send({ username, email, password: 'password123' });
  return { token: res.body.token, userId: res.body.user.id as string };
}

describe('GET /users/search', () => {
  it('should return users matching a partial, case-insensitive username', async () => {
    await registerUser('ZeldaFan', 'zelda@example.com');
    await registerUser('MarioLover', 'mario@example.com');

    const res = await request(app).get('/users/search').query({ q: 'zelda' });

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].username).toBe('ZeldaFan');
  });

  it('should return an empty list for an empty query', async () => {
    await registerUser('SomeUser', 'someuser@example.com');
    const res = await request(app).get('/users/search').query({ q: '' });

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });

  it('should return an empty list when nothing matches', async () => {
    await registerUser('SomeUser', 'someuser2@example.com');
    const res = await request(app).get('/users/search').query({ q: 'doesnotexist' });

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual([]);
  });

  it('should exclude the requesting user from results when authenticated', async () => {
    const { token, userId } = await registerUser('SearchSelf', 'searchself@example.com');
    await registerUser('SearchSelfTwo', 'searchselftwo@example.com');

    const res = await request(app)
      .get('/users/search')
      .query({ q: 'searchself' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.users.some((u: any) => u._id === userId)).toBe(false);
    expect(res.body.users.some((u: any) => u.username === 'SearchSelfTwo')).toBe(true);
  });

  it('should not leak passwordHash', async () => {
    await registerUser('NoLeak', 'noleak@example.com');
    const res = await request(app).get('/users/search').query({ q: 'NoLeak' });

    expect(res.status).toBe(200);
    expect(res.body.users[0].passwordHash).toBeUndefined();
  });
});
