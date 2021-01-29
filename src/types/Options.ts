import { Connection } from 'mongoose';
import { Redis } from 'ioredis';

export type MemoryDBType = Record<string, string[]>;

export type Options = {
  mongooseConnection?: Connection;
  redisClient?: Redis;
  memoryDB?: MemoryDBType;
};
