import { WebHooks } from '..';
import * as chai from 'chai';
import 'mocha';
import * as Redis from 'ioredis';
import * as http from 'http';

const expect = chai.expect;

describe('WebHooks Test', () => {
    const redisClient = new Redis('redis://localhost');
    const webHooks = new WebHooks({ redisClient });
    const unlinkAllKeys = async () => {
        const keys = await redisClient.keys('*');
        await Promise.all(keys.map(key => redisClient.unlink(key)));
    };

    const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
        console.log(req.method, req.url);
        let body = '';
        req.on('data', (chunk: string) => {
            body += chunk;
        });
        req.on('end', () => {
            console.log(body);
            res.write('OK');
            res.end();
        });
    };
    const server = http.createServer(requestHandler);
    const port = 8888;
    const basePath = `http://localhost:${port}`;
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

    it('should return response on call', async function () {
        this.timeout(10);
        await webHooks.add('test3', `${basePath}/test33/123`);
        webHooks.emitter.addListener(
            'test3.status',
            (shortName: string, status: number, body: string) => {
                expect(body).to.equal('OK');
            },
        );
        webHooks.trigger('test3', { data: 123123123 });
    });
});
