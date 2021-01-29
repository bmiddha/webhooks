import { MemoryDBType, WebHooks } from '../src';

describe('memory db tests', () => {
  let wh: WebHooks;
  let db: MemoryDBType;
  beforeEach(() => {
    db = {};
    wh = new WebHooks({ memoryDB: db });
  });
  test('getDB', async () => {
    db['test1'] = ['test11', 'test12', 'test13', 'test14'];
    db['test2'] = ['test21', 'test22', 'test23', 'test24'];
    const data = await wh.getDB();
    expect(data).toStrictEqual(
      Object.keys(db).map(k => ({ key: k, urls: db[k] }))
    );
  });
  test('get', async () => {
    db['test1'] = ['test11', 'test12', 'test13', 'test14'];
    db['test2'] = ['test21', 'test22', 'test23', 'test24'];
    const data = await wh.getWebHook('test1');
    expect(data).toStrictEqual(db['test1']);
  });
  test('deleteKey', async () => {
    db['test1'] = ['test11', 'test12', 'test13', 'test14'];
    db['test2'] = ['test21', 'test22', 'test23', 'test24'];
    await wh.remove('test1');
    expect(db).toStrictEqual({
      test2: ['test21', 'test22', 'test23', 'test24'],
    });
  });
  test('deleteUrl', async () => {
    db['test1'] = ['test11', 'test12', 'test13', 'test14'];
    db['test2'] = ['test21', 'test22', 'test23', 'test24'];
    await wh.remove('test1', 'test11');
    expect(db).toStrictEqual({
      test1: ['test12', 'test13', 'test14'],
      test2: ['test21', 'test22', 'test23', 'test24'],
    });
  });
  test('addUrl', async () => {
    db['test1'] = ['test11', 'test12', 'test13', 'test14'];
    db['test2'] = ['test21', 'test22', 'test23', 'test24'];
    await wh.add('test1', 'test15');
    expect(db).toStrictEqual({
      test1: ['test11', 'test12', 'test13', 'test14', 'test15'],
      test2: ['test21', 'test22', 'test23', 'test24'],
    });
  });
  test('addKey', async () => {
    db['test1'] = ['test11', 'test12', 'test13', 'test14'];
    db['test2'] = ['test21', 'test22', 'test23', 'test24'];
    await wh.add('test3', 'test31');
    expect(db).toStrictEqual({
      test1: ['test11', 'test12', 'test13', 'test14'],
      test2: ['test21', 'test22', 'test23', 'test24'],
      test3: ['test31'],
    });
  });
});
