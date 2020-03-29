import * as request from 'request-promise-native';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';

type Options = {
    redisClient?: Redis;
};

interface DB {
    [key: string]: string[];
}

interface HashTable<T> {
    [key: string]: T;
}

type RequestFunction = (shortName: string, jsonData: {}, headersData?: {}) => Promise<void>;

export class WebHooks {
    #redisClient: Redis;
    #emitter: EventEmitter;
    #functions: HashTable<RequestFunction>;
    constructor({ redisClient }: Options) {
        this.#redisClient = redisClient;
        this.#emitter = new EventEmitter();
        this.#functions = {};
        this.#setListeners();
    }
    
    #setListeners = async () => {
        const keys = await this.#redisClient.keys('*');
        keys.map(async (key: string) => {
            const urls: string[] = JSON.parse(await this.#redisClient.get(key));
            urls.forEach(url => {
                const encUrl = crypto.createHash('md5').update(url).digest('hex');
                this.#functions[encUrl] = this.#getRequestFunction(url);
                this.#emitter.on(key, this.#functions[encUrl]);
            });
        });
    };
    #getRequestFunction = (url: string): RequestFunction => {
        return async (shortName: string, jsonData: {}, headersData?: {}): Promise<void> => {
            const headers = {
                ...headersData,
                'Content-Type': 'application/json',
            };
            const response = await request({
                method: 'POST',
                uri: url,
                strictSSL: false,
                headers: headers,
                body: JSON.stringify(jsonData),
                resolveWithFullResponse: true,
            });
            const { statusCode, body } = response;
            this.#emitter.emit(`${shortName}.status`, shortName, statusCode, body);
        };
    };
    #removeUrlFromShortName = async (shortName: string, url: string): Promise<void> => {
        const urls: string[] = JSON.parse(await this.#redisClient.get(shortName));
        if (urls.indexOf(url) !== -1) {
            urls.splice(urls.indexOf(url), 1);
            await this.#redisClient.set(shortName, JSON.stringify(urls));
        } else {
            throw new Error(`URL(${url}) not found wile removing from ShortName(${shortName}).`);
        }
    };
    #removeShortName = async (shortName: string): Promise<void> => {
        if (await this.#redisClient.exists(shortName)) await this.#redisClient.unlink(shortName);
        else throw new Error(`ShortName(${shortName}) not found while removing ShortName.`);
    };
    trigger = (shortName: string, jsonData: {}, headersData?: {}): boolean =>
        this.#emitter.emit(shortName, shortName, jsonData, headersData);
    add = async (shortName: string, url: string): Promise<void> => {
        const urls = (await this.#redisClient.exists(shortName))
            ? JSON.parse(await this.#redisClient.get(shortName))
            : [];
        if (urls.indexOf(url) === -1) {
            urls.push(url);
            const encUrl = crypto.createHash('md5').update(url).digest('hex');
            this.#functions[encUrl] = this.#getRequestFunction(url);
            this.#emitter.on(shortName, this.#functions[encUrl]);
            await this.#redisClient.set(shortName, JSON.stringify(urls));
        } else {
            throw new Error(`URL(${url}) already exists for shortName(${shortName}).`);
        }
    };
    remove = async (shortName: string, url?: string): Promise<void> => {
        if (url) {
            await this.#removeUrlFromShortName(shortName, url);
            const urlKey = crypto.createHash('md5').update(url).digest('hex');
            this.#emitter.removeListener(shortName, this.#functions[urlKey]);
            delete this.#functions[urlKey];
        } else {
            if (!(await this.#redisClient.exists(shortName)))
                throw new Error(`ShortName(${shortName}) not found while removing.`);
            this.#emitter.removeAllListeners(shortName);
            const urls: string[] = JSON.parse(await this.#redisClient.get(shortName));
            urls.forEach(url => {
                const urlKey = crypto.createHash('md5').update(url).digest('hex');
                delete this.#functions[urlKey];
            });
            await this.#removeShortName(shortName);
        }
    };
    getDB = async (): Promise<DB> => {
        const keys = await this.#redisClient.keys('*');
        const pairs = await Promise.all(
            keys.map(async (key: string) => {
                const urls = JSON.parse(await this.#redisClient.get(key));
                return [key, urls];
            }),
        );
        return Object.fromEntries(pairs);
    };
    getWebHook = async (shortName: string): Promise<string> => {
        if (!(await this.#redisClient.exists(shortName)))
            throw new Error(`ShortName(${shortName}) not found while removing.`);
        return await this.#redisClient.get(shortName);
    };
    get listener(): HashTable<RequestFunction> {
        return this.#functions;
    }
    get emitter(): EventEmitter {
        return this.#emitter;
    }
}

export default WebHooks;
