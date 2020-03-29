import { WebHooks } from '..';
import * as chai from 'chai';
import 'mocha';
import * as Redis from 'ioredis';
import * as http from 'http';

const { assert } = chai;

describe('WebHooks Test', () => {
    const redisClient = new Redis('redis://localhost');
    const unlinkAllKeys = async () => {
        const keys = await redisClient.keys('*');
        await Promise.all(keys.map(key => redisClient.unlink(key)));
    };

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
    const port = 8888;
    const protocol = 'http';
    const host = `localhost:${port}`;
    const baseUrl = `${protocol}://${host}`;
    before(async () => {
        server.listen(port);
        await unlinkAllKeys();
    });
    afterEach(async () => {
        await unlinkAllKeys();
    });
    after(async () => {
        await redisClient.quit();
        server.close();
    });

    it('test remove', async () => {
        const shortName = 'testRemove';
        const urls = [
            '/testRemove/123',
            '/testRemove/1235',
            '/testRemove/1236',
            '/testRemove/12367',
            '/testRemove/12368',
            '/testRemove/12369',
        ];
        const truth = urls.map(url => `${baseUrl}${url}`);
        redisClient.set(shortName, JSON.stringify(truth));
        const webHooks = new WebHooks({ redisClient });
        await webHooks.remove(shortName, truth.pop());
        await webHooks.remove(shortName, truth.pop());
        const dbValue = JSON.parse(await redisClient.get(shortName));
        assert.deepEqual(dbValue, truth);
        await webHooks.remove(shortName);
        const dbExists = await redisClient.exists(shortName);
        assert.equal(dbExists, 0);
    });

    it('test add', async () => {
        const webHooks = new WebHooks({ redisClient });
        const shortName = 'testAdd';
        const urls = ['/testAdd/123', '/testAdd/1235', '/testAdd/1236'];
        const truth = urls.map(url => `${baseUrl}${url}`);
        for (const i in truth) {
            await webHooks.add(shortName, truth[i]);
        }
        const dbValue = JSON.parse(await redisClient.get(shortName));
        assert.deepEqual(dbValue, truth);
    });

    it('test getWebHook', async () => {
        const shortName = 'testGetWebHook';
        const urls = ['/testGetWebHook/123', '/testGetWebHook/1235', '/testGetWebHook/1236'];
        const truth = urls.map(url => `${baseUrl}${url}`);
        redisClient.set(shortName, JSON.stringify(truth));
        const webHooks = new WebHooks({ redisClient });
        const getWebHookResponse = JSON.parse(await webHooks.getWebHook(shortName));
        assert.deepEqual(getWebHookResponse, truth);
    });

    it('test getDB', async () => {
        const db = {
            getDB2: [
                `${baseUrl}testGetDB2/123`,
                `${baseUrl}testGetDB2/1234`,
                `${baseUrl}testGetDB2/1235`,
            ],
            getDB1: [
                `${baseUrl}testGetDB/123`,
                `${baseUrl}testGetDB/1234`,
                `${baseUrl}testGetDB/1235`,
            ],
        };
        const values = Object.values(db);
        const keys = Object.keys(db);
        for (const i in keys) {
            redisClient.set(keys[i], JSON.stringify(values[i]));
        }
        const webHooks = new WebHooks({ redisClient });
        const val = await webHooks.getDB();
        assert.deepEqual(val, db);
    });

    it('test trigger', async function() {
        this.timeout(100);
        const data = { data: 123123123 };
        const body = JSON.stringify(data);
        const status = 200;
        const headerData = {
            custom: 'data',
        };
        const shortName = 'testTrigger';
        const url = '/testTrigger/123';
        await redisClient.set(shortName, JSON.stringify([`${baseUrl}${url}`]));
        const webHooks = new WebHooks({ redisClient });
        webHooks.emitter.addListener(
            `${shortName}.status`,
            (shortNameReceived: string, statusReceived: number, bodyReceived: string) => {
                assert.equal(statusReceived, status);
                assert.equal(shortNameReceived, shortName);
                assert.equal(
                    bodyReceived,
                    JSON.stringify({
                        headers: {
                            ...headerData,
                            'content-type': 'application/json',
                            host,
                            'content-length': body.length.toString(),
                            connection: 'close',
                        },
                        method: 'POST',
                        url,
                        body,
                    }),
                );
            },
        );
        webHooks.trigger(shortName, data, headerData);
    });
});
