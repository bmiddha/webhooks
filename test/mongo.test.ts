import { WebHooks, HookDocument, HookSchema } from '../src';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('mongo db tests', () => {
  const HookModel = mongoose.model<HookDocument & mongoose.Document>(
    'Hook',
    HookSchema
  );
  const testData1 = {
    key: 'test1',
    urls: ['test11', 'test12', 'test13', 'test14'],
  };
  const testData2 = {
    key: 'test2',
    urls: ['test21', 'test22', 'test23', 'test24'],
  };
  const db = [testData1, testData2];
  let wh: WebHooks;
  let mongoServer: MongoMemoryServer;

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

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    wh = new WebHooks({ mongooseConnection: mongoose.connection });
    await HookModel.insertMany(db);
  });

  afterEach(async () => {
    await HookModel.deleteMany({});
  });

  test('getDB', async () => {
    const data = await wh.getDB();
    expect(data).toStrictEqual(db);
  });
  test('get', async () => {
    const data = await wh.getWebHook('test1');
    expect(data).toStrictEqual(testData1.urls);
  });
  test('deleteKey', async () => {
    await wh.remove('test1');
    const data = (await HookModel.find({}).lean()).map(({ key, urls }) => ({
      key,
      urls,
    }));
    expect(data).toStrictEqual([testData2]);
  });
  test('deleteUrl', async () => {
    await wh.remove('test1', 'test11');
    const data = (await HookModel.find({}).lean()).map(({ key, urls }) => ({
      key,
      urls,
    }));
    expect(data).toStrictEqual([
      { key: 'test1', urls: ['test12', 'test13', 'test14'] },
      testData2,
    ]);
  });
  test('addUrl', async () => {
    await wh.add('test1', 'test15');
    const data = (await HookModel.find({}).lean()).map(({ key, urls }) => ({
      key,
      urls,
    }));
    expect(data).toStrictEqual([
      { ...testData1, urls: [...testData1.urls, 'test15'] },
      testData2,
    ]);
  });
  test('addKey', async () => {
    await wh.add('test3', 'test31');
    const data = (await HookModel.find({}).lean()).map(({ key, urls }) => ({
      key,
      urls,
    }));
    expect(data).toStrictEqual([
      testData1,
      testData2,
      { key: 'test3', urls: ['test31'] },
    ]);
  });
});
