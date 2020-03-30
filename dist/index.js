"use strict";
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
var _redisClient, _emitter, _requestFunctions, _setListeners, _getRequestFunction, _removeUrlFromName, _removeName;
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request-promise-native");
const crypto = require("crypto");
const events_1 = require("events");
class WebHooks {
    constructor({ redisClient }) {
        _redisClient.set(this, void 0);
        _emitter.set(this, void 0);
        _requestFunctions.set(this, void 0);
        _setListeners.set(this, () => __awaiter(this, void 0, void 0, function* () {
            const keys = yield __classPrivateFieldGet(this, _redisClient).keys('*');
            keys.map((key) => __awaiter(this, void 0, void 0, function* () {
                const urls = JSON.parse(yield __classPrivateFieldGet(this, _redisClient).get(key));
                urls.forEach(url => {
                    const encUrl = crypto.createHash('md5').update(url).digest('hex');
                    __classPrivateFieldGet(this, _requestFunctions)[encUrl] = __classPrivateFieldGet(this, _getRequestFunction).call(this, url);
                    __classPrivateFieldGet(this, _emitter).on(key, __classPrivateFieldGet(this, _requestFunctions)[encUrl]);
                });
            }));
        }));
        _getRequestFunction.set(this, (url) => {
            return (name, jsonData, headersData) => __awaiter(this, void 0, void 0, function* () {
                /* istanbul ignore next */
                const { statusCode, body } = yield request({
                    method: 'POST',
                    uri: url,
                    strictSSL: false,
                    headers: Object.assign(Object.assign({}, headersData), { 'Content-Type': 'application/json' }),
                    body: JSON.stringify(jsonData),
                    resolveWithFullResponse: true,
                });
                /* istanbul ignore next */
                __classPrivateFieldGet(this, _emitter).emit(`${name}.status`, name, statusCode, body);
            });
        });
        _removeUrlFromName.set(this, (name, url) => __awaiter(this, void 0, void 0, function* () {
            const urls = JSON.parse(yield __classPrivateFieldGet(this, _redisClient).get(name));
            if (urls.indexOf(url) !== -1) {
                urls.splice(urls.indexOf(url), 1);
                yield __classPrivateFieldGet(this, _redisClient).set(name, JSON.stringify(urls));
            }
            else {
                throw new Error(`URL(${url}) not found wile removing from Name(${name}).`);
            }
        }));
        _removeName.set(this, (name) => __awaiter(this, void 0, void 0, function* () {
            yield __classPrivateFieldGet(this, _redisClient).unlink(name);
        }));
        /**
         * @param  {string} name
         * @param  {Object} jsonData
         * @param  {Object} headersData?
         * @returns boolean
         */
        this.trigger = (name, jsonData, headersData) => __classPrivateFieldGet(this, _emitter).emit(name, name, jsonData, headersData);
        /**
         * Add WebHook to name.
         *
         * @param  {string} name
         * @param  {string} url
         */
        this.add = (name, url) => __awaiter(this, void 0, void 0, function* () {
            const urls = (yield __classPrivateFieldGet(this, _redisClient).exists(name))
                ? JSON.parse(yield __classPrivateFieldGet(this, _redisClient).get(name))
                : [];
            if (urls.indexOf(url) === -1) {
                urls.push(url);
                const encUrl = crypto.createHash('md5').update(url).digest('hex');
                __classPrivateFieldGet(this, _requestFunctions)[encUrl] = __classPrivateFieldGet(this, _getRequestFunction).call(this, url);
                __classPrivateFieldGet(this, _emitter).on(name, __classPrivateFieldGet(this, _requestFunctions)[encUrl]);
                yield __classPrivateFieldGet(this, _redisClient).set(name, JSON.stringify(urls));
            }
            else {
                throw new Error(`URL(${url}) already exists for name(${name}).`);
            }
        });
        /**
         * Remove URL from specified name. If no URL is specified, then remove name from Database.
         *
         * @param  {string} name
         * @param  {string} url?
         */
        this.remove = (name, url) => __awaiter(this, void 0, void 0, function* () {
            if (!(yield __classPrivateFieldGet(this, _redisClient).exists(name)))
                throw new Error(`Name(${name}) not found while removing.`);
            if (url) {
                yield __classPrivateFieldGet(this, _removeUrlFromName).call(this, name, url);
                const urlKey = crypto.createHash('md5').update(url).digest('hex');
                __classPrivateFieldGet(this, _emitter).removeListener(name, __classPrivateFieldGet(this, _requestFunctions)[urlKey]);
                delete __classPrivateFieldGet(this, _requestFunctions)[urlKey];
            }
            else {
                __classPrivateFieldGet(this, _emitter).removeAllListeners(name);
                const urls = JSON.parse(yield __classPrivateFieldGet(this, _redisClient).get(name));
                urls.forEach(url => {
                    const urlKey = crypto.createHash('md5').update(url).digest('hex');
                    delete __classPrivateFieldGet(this, _requestFunctions)[urlKey];
                });
                yield __classPrivateFieldGet(this, _removeName).call(this, name);
            }
        });
        /**
         * Return all names, and URL arrays.
         *
         * @returns Promise
         */
        this.getDB = () => __awaiter(this, void 0, void 0, function* () {
            const keys = yield __classPrivateFieldGet(this, _redisClient).keys('*');
            const pairs = yield Promise.all(keys.map((key) => __awaiter(this, void 0, void 0, function* () {
                const urls = JSON.parse(yield __classPrivateFieldGet(this, _redisClient).get(key));
                return [key, urls];
            })));
            return Object.fromEntries(pairs);
        });
        /**
         * Return array of URLs for specified name.
         *
         * @param  {string} name
         * @returns Promise
         */
        this.getWebHook = (name) => __awaiter(this, void 0, void 0, function* () {
            if (!(yield __classPrivateFieldGet(this, _redisClient).exists(name)))
                throw new Error(`Name(${name}) not found while getWebHook.`);
            return yield __classPrivateFieldGet(this, _redisClient).get(name);
        });
        __classPrivateFieldSet(this, _redisClient, redisClient);
        __classPrivateFieldSet(this, _emitter, new events_1.EventEmitter());
        __classPrivateFieldSet(this, _requestFunctions, {});
        __classPrivateFieldGet(this, _setListeners).call(this);
    }
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
exports.WebHooks = WebHooks;
_redisClient = new WeakMap(), _emitter = new WeakMap(), _requestFunctions = new WeakMap(), _setListeners = new WeakMap(), _getRequestFunction = new WeakMap(), _removeUrlFromName = new WeakMap(), _removeName = new WeakMap();
exports.default = WebHooks;
//# sourceMappingURL=index.js.map