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

type RequestFunction = (name: string, jsonData: {}, headersData?: {}) => Promise<void>;

export class WebHooks {

    #redisClient: Redis;
    #emitter: EventEmitter;
    #requestFunctions: HashTable<RequestFunction>;
    constructor({ redisClient }: Options) {
        this.#redisClient = redisClient;
        this.#emitter = new EventEmitter();
        this.#requestFunctions = {};
        this.#setListeners();
    }

    #setListeners = async () => {
        const keys = await this.#redisClient.keys('*');
        keys.map(async (key: string) => {
            const urls: string[] = JSON.parse(await this.#redisClient.get(key));
            urls.forEach(url => {
                const encUrl = crypto.createHash('md5').update(url).digest('hex');
                this.#requestFunctions[encUrl] = this.#getRequestFunction(url);
                this.#emitter.on(key, this.#requestFunctions[encUrl]);
            });
        });
    };

    #getRequestFunction = (url: string): RequestFunction => {
        return async (name: string, jsonData: {}, headersData?: {}): Promise<void> => {
            /* istanbul ignore next */
            const { statusCode, body } = await request({
                method: 'POST',
                uri: url,
                strictSSL: false,
                headers: {
                    ...headersData,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(jsonData),
                resolveWithFullResponse: true,
            });
            /* istanbul ignore next */
            this.#emitter.emit(`${name}.status`, name, statusCode, body);
        };
    };

    #removeUrlFromName = async (name: string, url: string): Promise<void> => {
        const urls: string[] = JSON.parse(await this.#redisClient.get(name));
        if (urls.indexOf(url) !== -1) {
            urls.splice(urls.indexOf(url), 1);
            await this.#redisClient.set(name, JSON.stringify(urls));
        } else {
            throw new Error(`URL(${url}) not found wile removing from Name(${name}).`);
        }
    };

    #removeName = async (name: string): Promise<void> => {
        await this.#redisClient.unlink(name);
    };

    /**
     * @param  {string} name
     * @param  {Object} jsonData
     * @param  {Object} headersData?
     * @returns boolean
     */
    trigger = (name: string, jsonData: {}, headersData?: {}): boolean =>
        this.#emitter.emit(name, name, jsonData, headersData);
        /**
         * Add WebHook to name.
         * 
         * @param  {string} name
         * @param  {string} url
         */
    add = async (name: string, url: string): Promise<void> => {
        const urls = (await this.#redisClient.exists(name))
            ? JSON.parse(await this.#redisClient.get(name))
            : [];
        if (urls.indexOf(url) === -1) {
            urls.push(url);
            const encUrl = crypto.createHash('md5').update(url).digest('hex');
            this.#requestFunctions[encUrl] = this.#getRequestFunction(url);
            this.#emitter.on(name, this.#requestFunctions[encUrl]);
            await this.#redisClient.set(name, JSON.stringify(urls));
        } else {
            throw new Error(`URL(${url}) already exists for name(${name}).`);
        }
    };
    
    /**
     * Remove URL from specified name. If no URL is specified, then remove name from Database.
     * 
     * @param  {string} name
     * @param  {string} url?
     */
    remove = async (name: string, url?: string): Promise<void> => {
        if (!(await this.#redisClient.exists(name)))
            throw new Error(`Name(${name}) not found while removing.`);
        if (url) {
            await this.#removeUrlFromName(name, url);
            const urlKey = crypto.createHash('md5').update(url).digest('hex');
            this.#emitter.removeListener(name, this.#requestFunctions[urlKey]);
            delete this.#requestFunctions[urlKey];
        } else {
            this.#emitter.removeAllListeners(name);
            const urls: string[] = JSON.parse(await this.#redisClient.get(name));
            urls.forEach(url => {
                const urlKey = crypto.createHash('md5').update(url).digest('hex');
                delete this.#requestFunctions[urlKey];
            });
            await this.#removeName(name);
        }
    };
    
    /**
     * Return all names, and URL arrays.
     * 
     * @returns Promise
     */
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
    
    /**
     * Return array of URLs for specified name.
     * 
     * @param  {string} name
     * @returns Promise
     */
    getWebHook = async (name: string): Promise<string> => {
        if (!(await this.#redisClient.exists(name)))
            throw new Error(`Name(${name}) not found while getWebHook.`);
        return await this.#redisClient.get(name);
    };
    
    /**
     * Return array of URLs for specified name.
     * 
     * @param  {string} name
     * @returns Promise
     */

    /**
     * Return all request functions hash table
     * 
     * @returns HashTable
     */
    get requestFunctions(): HashTable<RequestFunction> {
        return this.#requestFunctions;
    }

    /**
     * Return EventEmitter instance.
     * 
     * @returns EventEmitter
     */
    get emitter(): EventEmitter {
        return this.#emitter;
    }
}

export default WebHooks;
