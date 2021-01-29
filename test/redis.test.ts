import { WebHooks } from '../src';
import { Redis } from 'ioredis';
const ioredisMock = require('ioredis-mock');

describe('redis db tests', () => {
  let wh: WebHooks;
  let redisClient: Redis;
  const db: Record<string, string[]> = {
    test1: ['test11', 'test12', 'test13', 'test14'],
    test2: ['test21', 'test22', 'test23', 'test24'],
  };
  beforeEach(() => {
    const db: Record<string, string[]> = {
      test1: ['test11', 'test12', 'test13', 'test14'],
      test2: ['test21', 'test22', 'test23', 'test24'],
    };
    redisClient = new ioredisMock({ data: db }) as Redis;
    wh = new WebHooks({ redisClient });
  });
  test('getDB', async () => {
    const data = await wh.getDB();
    expect(data).toStrictEqual(
      Object.keys(db).map(k => ({ key: k, urls: db[k] as string[] }))
    );
  });
  test('get', async () => {
    const data = await wh.getWebHook('test1');
    expect(data).toStrictEqual(db['test1']);
  });
  test('deleteKey', async () => {
    await wh.remove('test1');
    const keys = await redisClient.keys('*');
    const expecting = Object.fromEntries(
      await Promise.all(
        keys.map(async (key: string) => [
          key,
          await redisClient.lrange(key, 0, -1),
        ])
      )
    );
    expect(expecting).toStrictEqual({
      test2: ['test21', 'test22', 'test23', 'test24'],
    });
  });
  test('deleteUrl', async () => {
    await wh.remove('test1', 'test11');
    const keys = await redisClient.keys('*');
    const expecting = Object.fromEntries(
      await Promise.all(
        keys.map(async (key: string) => [
          key,
          await redisClient.lrange(key, 0, -1),
        ])
      )
    );
    expect(expecting).toStrictEqual({
      test1: ['test12', 'test13', 'test14'],
      test2: ['test21', 'test22', 'test23', 'test24'],
    });
  });
  test('addUrl', async () => {
    await wh.add('test1', 'test15');
    const keys = await redisClient.keys('*');
    const expecting = Object.fromEntries(
      await Promise.all(
        keys.map(async (key: string) => [
          key,
          await redisClient.lrange(key, 0, -1),
        ])
      )
    );
    expect(expecting).toStrictEqual({
      test1: ['test11', 'test12', 'test13', 'test14', 'test15'],
      test2: ['test21', 'test22', 'test23', 'test24'],
    });
  });
  test('addKey', async () => {
    await wh.add('test3', 'test31');
    const keys = await redisClient.keys('*');
    const expecting = Object.fromEntries(
      await Promise.all(
        keys.map(async (key: string) => [
          key,
          await redisClient.lrange(key, 0, -1),
        ])
      )
    );
    expect(expecting).toStrictEqual({
      test1: ['test11', 'test12', 'test13', 'test14'],
      test2: ['test21', 'test22', 'test23', 'test24'],
      test3: ['test31'],
    });
  });
});
