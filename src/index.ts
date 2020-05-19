import * as crypto from 'crypto';
import fetch from 'node-fetch';
import { EventEmitter } from 'events';

import { Connection } from 'mongoose';
import { Redis } from 'ioredis';

import { DB } from './db/db';
import { MongoDB } from './db/mongo';
import { RedisDB } from './db/redis';
import { MemoryDB, HashTable } from './db/memory';

export type Hook = {
    key: string;
    urls: string[];
};

type RequestFunction = (name: string, jsonData: {}, headersData?: {}) => Promise<void>;

export class DatabaseError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'Database Error';
    }
}

type Options = {
    mongooseConnection?: Connection;
    redisClient?: Redis;
    memoryDB?: HashTable<string[]>;
};

export class WebHooks {
    db: DB;
    emitter: EventEmitter;
    requestFunctions: HashTable<RequestFunction>;

    constructor(options: Options) {
        if (!!options.mongooseConnection) this.db = new MongoDB(options.mongooseConnection);
        else if (!!options.redisClient) this.db = new RedisDB(options.redisClient);
        else if (!!options.memoryDB) this.db = new MemoryDB(options.memoryDB);
        else throw new DatabaseError('No database specified.');

        this.emitter = new EventEmitter();
        this.requestFunctions = {};
        this.setListeners();
    }

    setListeners = async () => {
        const hooks = await this.db.getDB();
        hooks.forEach(async (hook: Hook) => {
            hook.urls.forEach(url => {
                const encUrl = crypto.createHash('md5').update(url).digest('hex');
                this.requestFunctions[encUrl] = this.getRequestFunction(url);
                this.emitter.on(hook.key, this.requestFunctions[encUrl]);
            });
        });
        this.emitter.emit('setListeners');
    };

    getRequestFunction = (url: string): RequestFunction => {
        return async (name: string, jsonData: {}, headersData?: {}): Promise<void> => {
            const res = await fetch(url, {
                method: 'POST',
                body: JSON.stringify(jsonData),
                headers: {
                    ...headersData,
                    'Content-Type': 'application/json',
                },
            });
            const { status } = res;
            const body = await res.text();
            this.emitter.emit(`${name}.status`, name, status, body);
        };
    };

    /**
     * @param  {string} name
     * @param  {Object} jsonData
     * @param  {Object} headersData?
     */
    trigger = (name: string, jsonData: {}, headersData?: {}) => {
        this.emitter.emit(name, name, jsonData, headersData);
    };

    /**
     * Add WebHook to name.
     *
     * @param  {string} name
     * @param  {string} url
     */
    add = async (name: string, url: string): Promise<void> => {
        if (!(await this.db.add(name, url)))
            throw new DatabaseError(`Cannot add name ${name}, url ${url} to database.`);
        const encUrl = crypto.createHash('md5').update(url).digest('hex');
        this.requestFunctions[encUrl] = this.getRequestFunction(url);
        this.emitter.on(name, this.requestFunctions[encUrl]);
    };

    /**
     * Remove URL from specified name. If no URL is specified, then remove name from Database.
     *
     * @param  {string} name
     * @param  {string} url?
     */
    remove = async (name: string, url?: string): Promise<void> => {
        const hook = await this.db.get(name);
        if (url) {
            if (!(await this.db.deleteUrl(name, url)))
                throw new DatabaseError(`Cannot delete name ${name}, url ${url} from database`);
            const urlKey = crypto.createHash('md5').update(url).digest('hex');
            this.emitter.removeListener(name, this.requestFunctions[urlKey]);
            delete this.requestFunctions[urlKey];
        } else {
            this.emitter.removeAllListeners(name);
            hook.urls.forEach(url => {
                const urlKey = crypto.createHash('md5').update(url).digest('hex');
                delete this.requestFunctions[urlKey];
            });
            if (!(await this.db.deleteKey(name)))
                throw new DatabaseError(`Cannot delete name ${name} from database`);
        }
    };

    /**
     * Return all names, and URL arrays.
     *
     * @returns Promise
     */
    getDB = async () => {
        return await this.db.getDB();
    };

    /**
     * Return array of URLs for specified name.
     *
     * @param  {string} name
     * @returns Promise
     */
    getWebHook = async (name: string): Promise<string[]> => {
        return (await this.db.get(name)).urls;
    };
}
