import { createServer, IncomingMessage, ServerResponse } from 'http';

const handler = (req: IncomingMessage, res: ServerResponse) => {
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

createServer(handler).listen(8000);
