import { MongoMemoryServer } from 'mongodb-memory-server';
import { Redis } from 'ioredis';
import { WebHooks } from '../src';
import mongoose from 'mongoose';
import nock from 'nock';
const ioredisMock = require('ioredis-mock');

describe('trigger test', () => {
  let mongoServer: MongoMemoryServer;
  afterEach(nock.cleanAll);
  afterAll(async () => {
    nock.restore();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeAll(async () => {
    mongoServer = new MongoMemoryServer();
    const uri = await mongoServer.getUri();
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useCreateIndex: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    });
  });

  test.each([
    { memoryDB: {} },
    { mongooseConnection: mongoose.connection },
    { redisClient: new ioredisMock() as Redis },
  ])('test trigger: %j', async opts => {
    const wh = new WebHooks(opts);

    const body = {
      testBody1: 'testBodyVal1',
      testBody2: 'testBodyVal2',
      testBody3: 'testBodyVal3',
    };
    const headers = {
      testHeader1: 'testHeaderVal1',
      testHeader2: 'testHeaderVal2',
      testHeader3: 'testHeaderVal3',
    };
    const status = 200;
    const key = 'trigger1';
    const baseUrl = 'http://localhost:8100';
    const url = `${baseUrl}/${key}`;

    nock(baseUrl)
      .post(`/${key}`)
      .delayBody(2000)
      .reply(status, body, headers);

    await wh.add(key, url);

    expect(
      new Promise(resolve => wh.emitter.on(`${key}.status`, resolve))
    ).resolves.toStrictEqual({
      key,
      url,
      status,
      headers,
      body: JSON.stringify(body),
    });

    await new Promise(resolve => setTimeout(resolve, 200));
    wh.trigger({ key, body, headers });
  });
});
