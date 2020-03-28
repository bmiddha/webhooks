import WebHooks from './webhooks';

const webHooks = new WebHooks({
    redisUri: 'redis://localhost',
});

const func = async () => {
    // await webHooks.add('shortName1', 'http://127.0.0.1:8000/prova/other_url');
    // await webHooks.add('shortName2', 'http://127.0.0.1:8000/prova2/');
    console.log(await webHooks.getDB());
    webHooks.trigger('shortName1', { data: 123 });
    webHooks.trigger('shortName2', { data: 123456 }, { header: 'header' });
};

func();
