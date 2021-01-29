import * as crypto from 'crypto';
import fetch from 'node-fetch';
import EventEmitter from 'events';
import {
  DB,
  Options,
  Hook,
  MongoDB,
  RedisDB,
  MemoryDB,
  TriggerOptions,
} from '.';

type RequestFunction = (params: {
  key: string;
  body: {};
  headers?: {};
}) => Promise<void>;

export class WebHooks {
  db: DB;
  emitter: EventEmitter = new EventEmitter();
  requestFunctions: Record<string, RequestFunction> = {};

  constructor(options: Options) {
    if (options.mongooseConnection !== undefined) {
      this.db = new MongoDB(options.mongooseConnection);
    } else if (!!options.redisClient) {
      this.db = new RedisDB(options.redisClient);
    } else if (!!options.memoryDB) {
      this.db = new MemoryDB(options.memoryDB);
    } else throw new Error('No database specified.');
    this.setListeners();
  }

  setListeners = async () => {
    const hooks = await this.db.getDB();
    hooks.forEach(async (hook: Hook) => {
      hook.urls.forEach(url => {
        const encUrl = crypto
          .createHash('md5')
          .update(url)
          .digest('hex');
        this.requestFunctions[encUrl] = this.getRequestFunction(url);
        this.emitter.on(hook.key, this.requestFunctions[encUrl]);
      });
    });
    this.emitter.emit('setListeners');
  };

  getRequestFunction = (url: string): RequestFunction => {
    return async ({ key, body, headers }): Promise<void> => {
      const res = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      });
      const status = {
        key,
        url,
        status: res.status,
        headers,
        body: await res.text(),
      };
      this.emitter.emit(`${key}.status`, status);
      this.emitter.emit(`${url}.status`, status);
      this.emitter.emit(`${key}.${url}.status`, status);
    };
  };

  /**
   * @param  {TriggerOptions} options
   */
  trigger = ({ key, body, headers, callback }: TriggerOptions) => {
    if (callback) {
      this.emitter.on(`${key}.status`, callback);
    }
    this.emitter.emit(key, { key, body, headers });
  };

  /**
   * Add WebHook to key.
   *
   * @param  {string} key
   * @param  {string} url
   */
  add = async (key: string, url: string): Promise<void> => {
    if (!(await this.db.add(key, url)))
      throw new Error(`Cannot add key ${key}, url ${url} to database.`);
    const encUrl = crypto
      .createHash('md5')
      .update(url)
      .digest('hex');
    this.requestFunctions[encUrl] = this.getRequestFunction(url);
    this.emitter.on(key, this.requestFunctions[encUrl]);
  };

  /**
   * Remove URL from specified key. If no URL is specified, then remove key from Database.
   *
   * @param  {string} key
   * @param  {string} url?
   */
  remove = async (key: string, url?: string): Promise<void> => {
    const hook = await this.db.get(key);
    if (url) {
      if (!(await this.db.deleteUrl(key, url)))
        throw new Error(`Cannot delete key ${key}, url ${url} from database`);
      const urlKey = crypto
        .createHash('md5')
        .update(url)
        .digest('hex');
      if (this.requestFunctions[urlKey]) {
        this.emitter.removeListener(key, this.requestFunctions[urlKey]);
      }
      delete this.requestFunctions[urlKey];
    } else {
      this.emitter.removeAllListeners(key);
      hook.urls.forEach(url => {
        const urlKey = crypto
          .createHash('md5')
          .update(url)
          .digest('hex');
        delete this.requestFunctions[urlKey];
      });
      if ((await this.db.deleteKey(key)) === false)
        throw new Error(`Cannot delete key ${key} from database`);
    }
  };

  /**
   * Return all keys, and URL arrays.
   *
   * @returns Promise
   */
  getDB = async () => {
    return await this.db.getDB();
  };

  /**
   * Return array of URLs for specified key.
   *
   * @param  {string} key
   * @returns Promise
   */
  getWebHook = async (key: string): Promise<string[]> => {
    return (await this.db.get(key)).urls;
  };
}

export default WebHooks;
