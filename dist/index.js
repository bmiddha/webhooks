var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _db, _emitter, _requestFunctions, _setListeners, _getRequestFunction;
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import { EventEmitter } from 'events';
import { MongoDB } from './db/mongo';
import { RedisDB } from './db/redis';
import { MemoryDB } from './db/memory';
export class DatabaseError extends Error {
    constructor(message) {
        super(message);
        this.name = 'Database Error';
    }
}
export class WebHooks {
    constructor(options) {
        _db.set(this, void 0);
        _emitter.set(this, void 0);
        _requestFunctions.set(this, void 0);
        _setListeners.set(this, () => __awaiter(this, void 0, void 0, function* () {
            const hooks = yield __classPrivateFieldGet(this, _db).getDB();
            hooks.forEach((hook) => __awaiter(this, void 0, void 0, function* () {
                hook.urls.forEach(url => {
                    const encUrl = crypto.createHash('md5').update(url).digest('hex');
                    __classPrivateFieldGet(this, _requestFunctions)[encUrl] = __classPrivateFieldGet(this, _getRequestFunction).call(this, url);
                    __classPrivateFieldGet(this, _emitter).on(hook.key, __classPrivateFieldGet(this, _requestFunctions)[encUrl]);
                });
            }));
            __classPrivateFieldGet(this, _emitter).emit('setListeners');
        }));
        _getRequestFunction.set(this, (url) => {
            return (name, jsonData, headersData) => __awaiter(this, void 0, void 0, function* () {
                const res = yield fetch(url, {
                    method: 'POST',
                    body: JSON.stringify(jsonData),
                    headers: Object.assign(Object.assign({}, headersData), { 'Content-Type': 'application/json' }),
                });
                const { status } = res;
                const body = yield res.text();
                __classPrivateFieldGet(this, _emitter).emit(`${name}.status`, name, status, body);
            });
        });
        /**
         * @param  {string} name
         * @param  {Object} jsonData
         * @param  {Object} headersData?
         */
        this.trigger = (name, jsonData, headersData) => {
            __classPrivateFieldGet(this, _emitter).emit(name, name, jsonData, headersData);
        };
        /**
         * Add WebHook to name.
         *
         * @param  {string} name
         * @param  {string} url
         */
        this.add = (name, url) => __awaiter(this, void 0, void 0, function* () {
            if (!(yield __classPrivateFieldGet(this, _db).add(name, url)))
                throw new DatabaseError(`Cannot add name ${name}, url ${url} to database.`);
            const encUrl = crypto.createHash('md5').update(url).digest('hex');
            __classPrivateFieldGet(this, _requestFunctions)[encUrl] = __classPrivateFieldGet(this, _getRequestFunction).call(this, url);
            __classPrivateFieldGet(this, _emitter).on(name, __classPrivateFieldGet(this, _requestFunctions)[encUrl]);
        });
        /**
         * Remove URL from specified name. If no URL is specified, then remove name from Database.
         *
         * @param  {string} name
         * @param  {string} url?
         */
        this.remove = (name, url) => __awaiter(this, void 0, void 0, function* () {
            const hook = yield __classPrivateFieldGet(this, _db).get(name);
            if (url) {
                if (!(yield __classPrivateFieldGet(this, _db).deleteUrl(name, url)))
                    throw new DatabaseError(`Cannot delete name ${name}, url ${url} from database`);
                const urlKey = crypto.createHash('md5').update(url).digest('hex');
                __classPrivateFieldGet(this, _emitter).removeListener(name, __classPrivateFieldGet(this, _requestFunctions)[urlKey]);
                delete __classPrivateFieldGet(this, _requestFunctions)[urlKey];
            }
            else {
                __classPrivateFieldGet(this, _emitter).removeAllListeners(name);
                hook.urls.forEach(url => {
                    const urlKey = crypto.createHash('md5').update(url).digest('hex');
                    delete __classPrivateFieldGet(this, _requestFunctions)[urlKey];
                });
                if (!(yield __classPrivateFieldGet(this, _db).deleteKey(name)))
                    throw new DatabaseError(`Cannot delete name ${name} from database`);
            }
        });
        /**
         * Return all names, and URL arrays.
         *
         * @returns Promise
         */
        this.getDB = () => __awaiter(this, void 0, void 0, function* () {
            return yield __classPrivateFieldGet(this, _db).getDB();
        });
        /**
         * Return array of URLs for specified name.
         *
         * @param  {string} name
         * @returns Promise
         */
        this.getWebHook = (name) => __awaiter(this, void 0, void 0, function* () {
            return (yield __classPrivateFieldGet(this, _db).get(name)).urls;
        });
        if (!!options.mongooseConnection)
            __classPrivateFieldSet(this, _db, new MongoDB(options.mongooseConnection));
        else if (!!options.redisClient)
            __classPrivateFieldSet(this, _db, new RedisDB(options.redisClient));
        else if (!!options.memoryDB)
            __classPrivateFieldSet(this, _db, new MemoryDB(options.memoryDB));
        else
            throw new DatabaseError('No database specified.');
        __classPrivateFieldSet(this, _emitter, new EventEmitter());
        __classPrivateFieldSet(this, _requestFunctions, {});
        __classPrivateFieldGet(this, _setListeners).call(this);
    }
    /**
     * Return all request functions hash table
     *
     * @returns HashTable
     */
    get requestFunctions() {
        return __classPrivateFieldGet(this, _requestFunctions);
    }
    /**
     * Return EventEmitter instance.
     *
     * @returns EventEmitter
     */
    get emitter() {
        return __classPrivateFieldGet(this, _emitter);
    }
}
_db = new WeakMap(), _emitter = new WeakMap(), _requestFunctions = new WeakMap(), _setListeners = new WeakMap(), _getRequestFunction = new WeakMap();
export default WebHooks;
