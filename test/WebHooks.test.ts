import { WebHooks } from '../lib';
import * as chai from 'chai';
import * as http from 'http';
import * as mongoose from 'mongoose';
import { HookDocument, HookSchema } from '../lib/db/mongo';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Redis } from 'ioredis';
const ioredisMock = require('ioredis-mock');

const { assert } = chai;

const requestHandler = (request: http.IncomingMessage, response: http.ServerResponse) => {
    const { headers, method, url } = request;
    const buffer: Uint8Array[] = [];
    request
        .on('error', err => {
            console.error(err);
        })
        .on('data', chunk => {
            buffer.push(chunk);
        })
        .on('end', () => {
            const body = Buffer.concat(buffer).toString();
            response.on('error', err => {
                console.error(err);
            });
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify({ headers, method, url, body }));
        });
};

const server = http.createServer(requestHandler);
const protocol = 'http';
let port: number;
let host: string;
let baseUrl: string;

beforeAll(async () => {
    server.listen(0);
    port = await new Promise(resolve => {
        server.on('listening', () => {
            const addressInfo = server.address().valueOf() as {
                address: string;
                family: string;
                port: number;
            };
            resolve(addressInfo.port);
        });
    });
    host = `localhost:${port}`;
    baseUrl = `${protocol}://${host}`;
});

afterAll(async () => {
    server.close();
});

const testAdd = async (wh: WebHooks) => {
    const name = 'testAdd';
    const urls = ['/testAdd/123', '/testAdd/1235', '/testAdd/1236'];
    const truth = urls.map(url => `${baseUrl}${url}`);
    for (const url of truth) {
        await wh.add(name, url);
    }
    const dbValue = await wh.getWebHook(name);
    assert.deepEqual(dbValue, truth);
    try {
        await wh.add(name, truth[0]);
    } catch (e) {
        assert.equal(e.message, `Cannot add name ${name}, url ${truth[0]} to database.`);
    }
};

const testRemove = async (wh: WebHooks) => {
    const name = 'testRemove';
    const truth = [
        '/testRemove/123',
        '/testRemove/1235',
        '/testRemove/1236',
        '/testRemove/12367',
        '/testRemove/12368',
        '/testRemove/12369',
    ].map(url => `${baseUrl}${url}`);
    for (const t of truth) await wh.add(name, t);
    const removedUrl = truth.pop();
    await wh.remove(name, removedUrl);
    await wh.remove(name, truth.pop());
    const whValue = await wh.getWebHook(name);
    assert.deepEqual(whValue, truth);
    try {
        await wh.remove(name, removedUrl);
    } catch (e) {
        assert.equal(e.message, `Cannot delete name ${name}, url ${removedUrl} from database`);
    }
    await wh.remove(name);
    const dbExists = !!(await wh.getWebHook(name)).length;
    assert.equal(dbExists, false);
    try {
        await wh.remove(name);
    } catch (e) {
        assert.equal(e.message, `Cannot delete name ${name} from database`);
    }
    const badName = 'testRemove-bad';
    try {
        await wh.remove(badName, removedUrl);
    } catch (e) {
        assert.equal(e.message, `Cannot delete name ${badName}, url ${removedUrl} from database`);
    }
    try {
        await wh.remove(badName);
    } catch (e) {
        assert.equal(e.message, `Cannot delete name ${badName} from database`);
    }
};

const testGetWebhook = async (wh: WebHooks) => {
    const name = 'testGetWebHook';
    const truth = ['/testGetWebHook/123', '/testGetWebHook/1235', '/testGetWebHook/1236'].map(
        url => `${baseUrl}${url}`,
    );
    for (const t of truth) await wh.add(name, t);
    const getWebHookResponse = await wh.getWebHook(name);
    assert.deepEqual(getWebHookResponse, truth);
    const badName = 'testGetWebHook-bad';
    assert.deepEqual(await wh.getWebHook(badName), []);
};

const testGetRequestsFunction = async (wh: WebHooks) => {
    const { requestFunctions } = wh;
    assert.typeOf(requestFunctions, 'object');
};

const testGetDB = async (wh: WebHooks) => {
    const db = [
        {
            key: 'getDB2',
            urls: [
                `${baseUrl}/testGetDB2/123`,
                `${baseUrl}/testGetDB2/1234`,
                `${baseUrl}/testGetDB2/1235`,
            ],
        },
        {
            key: 'getDB1',
            urls: [
                `${baseUrl}/testGetDB/123`,
                `${baseUrl}/testGetDB/1234`,
                `${baseUrl}/testGetDB/1235`,
            ],
        },
    ];
    for (const i of db) for (const u of i.urls) await wh.add(i.key, u);
    const res = await wh.getDB();
    for (const i in res) {
        assert.equal(res[i].key, db[i].key);
        assert.deepEqual(res[i].urls, db[i].urls);
    }
};

const testTrigger = async (wh: WebHooks) => {
    const data = { data: 123123123 };
    const body = JSON.stringify(data);
    const status = 200;
    const headerData: { [key: string]: string } = {
        custom: 'data',
    };
    const name = 'testTrigger';
    const path = '/testTrigger/123';
    const url = `${baseUrl}${path}`;

    await wh.add(name, url);

    await new Promise(resolve => setTimeout(resolve, 100));
    await new Promise(resolve => {
        wh.emitter.on(
            `${name}.status`,
            (nameReceived: string, statusReceived: number, bodyReceived: string) => {
                assert.equal(statusReceived, status);
                assert.equal(nameReceived, name);

                const parsed = JSON.parse(bodyReceived);

                assert.equal(parsed.body, body);
                assert.equal(parsed.method, 'POST');
                assert.equal(parsed.url, path);
                assert.equal(parsed.headers['content-type'], 'application/json');
                assert.equal(parsed.headers['content-length'], body.length.toString());

                Object.keys(headerData).forEach(key => {
                    assert.equal(parsed.headers[key], headerData[key]);
                });

                resolve();
            },
        );
        wh.trigger(name, data, headerData);
    });
};

describe('MemoryDB Tests', () => {
    let wh: WebHooks;

    beforeEach(async () => {
        wh = new WebHooks({ memoryDB: {} });
    });

    it('test add', async () => {
        await testAdd(wh);
    });
    it('test remove', async () => {
        await testRemove(wh);
    });
    it('test getWebHook', async () => {
        await testGetWebhook(wh);
    });
    it('test getRequestsFunction', async () => {
        await testGetRequestsFunction(wh);
    });
    it('test getDB', async () => {
        await testGetDB(wh);
    });
    it('test trigger', async () => {
        await testTrigger(wh);
    });
});

describe('Redis Tests', () => {
    let wh: WebHooks;
    let redisClient: Redis;

    beforeEach(async () => {
        redisClient = new ioredisMock();
        wh = new WebHooks({ redisClient });
    });

    it('test add', async () => {
        await testAdd(wh);
    });
    it('test remove', async () => {
        await testRemove(wh);
    });
    it('test getWebHook', async () => {
        await testGetWebhook(wh);
    });
    it('test getRequestsFunction', async () => {
        await testGetRequestsFunction(wh);
    });
    it('test getDB', async () => {
        await testGetDB(wh);
    });
    it('test trigger', async () => {
        await testTrigger(wh);
    });
});

describe('MongoDB Tests', () => {
    const HookModel = mongoose.model<HookDocument & mongoose.Document>('Hook', HookSchema);
    let wh: WebHooks;
    let mongoServer: MongoMemoryServer;

    const clearDb = async () => {
        await HookModel.deleteMany({});
    };

    beforeAll(async () => {
        mongoServer = new MongoMemoryServer();
        try {
            await mongoose.connect(await mongoServer.getUri(), {
                useNewUrlParser: true,
                useCreateIndex: true,
                useUnifiedTopology: true,
                useFindAndModify: false,
            });
            console.log('Mongoose connected');
        } catch (e) {
            console.error('Mongoose Error');
            mongoose.disconnect();
            process.exit(1);
        }
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        wh = new WebHooks({ mongooseConnection: mongoose.connection });
    });

    afterEach(async () => {
        await clearDb();
    });
    it('test add', async () => {
        await testAdd(wh);
    });
    it('test remove', async () => {
        await testRemove(wh);
    });
    it('test getWebHook', async () => {
        await testGetWebhook(wh);
    });
    it('test getRequestsFunction', async () => {
        await testGetRequestsFunction(wh);
    });
    it('test getDB', async () => {
        await testGetDB(wh);
    });
    it('test trigger', async () => {
        await testTrigger(wh);
    });
});

describe('General Tests', () => {
    it('No DB', () => {
        try {
            new WebHooks({});
        } catch (e) {
            assert.equal(e.message, 'No database specified.');
        }
    });
});
