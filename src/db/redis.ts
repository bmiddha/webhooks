import { Redis } from 'ioredis';
import { DB } from './db';
import { Hook } from '..';

export class RedisDB implements DB {
    redisClient: Redis;

    constructor(redisClient: Redis) {
        this.redisClient = redisClient;
    }

    async get(key: string): Promise<Hook> {
        return { key, urls: await this.redisClient.lrange(key, 0, -1) };
    }
    async getDB(): Promise<Hook[]> {
        const keys = await this.redisClient.keys('*');
        const hooks = await Promise.all(
            keys.map(async (key: string) => {
                const urls = await this.redisClient.lrange(key, 0, -1);
                return { key, urls };
            }),
        );
        return hooks;
    }
    async deleteKey(key: string): Promise<boolean> {
        return (await this.redisClient.del(key)) === 1;
    }
    async deleteUrl(key: string, url: string): Promise<boolean> {
        return (await this.redisClient.lrem(key, 0, url)) > 0;
    }
    async add(key: string, url: string): Promise<boolean> {
        const urls = await this.redisClient.lrange(key, 0, -1);
        if (urls.indexOf(url) === -1)
            return (await this.redisClient.rpush(key, url)) === urls.length + 1;
        return false;
    }
}
