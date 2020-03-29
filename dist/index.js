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
var _redisClient, _emitter, _functions, _setListeners, _getRequestFunction, _removeUrlFromShortName, _removeShortName;
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("request-promise-native");
const crypto = require("crypto");
const events_1 = require("events");
class WebHooks {
    constructor({ redisClient }) {
        _redisClient.set(this, void 0);
        _emitter.set(this, void 0);
        _functions.set(this, void 0);
        _setListeners.set(this, () => __awaiter(this, void 0, void 0, function* () {
            const keys = yield __classPrivateFieldGet(this, _redisClient).keys('*');
            keys.map((key) => __awaiter(this, void 0, void 0, function* () {
                const urls = JSON.parse(yield __classPrivateFieldGet(this, _redisClient).get(key));
                urls.forEach(url => {
                    const encUrl = crypto.createHash('md5').update(url).digest('hex');
                    __classPrivateFieldGet(this, _functions)[encUrl] = __classPrivateFieldGet(this, _getRequestFunction).call(this, url);
                    __classPrivateFieldGet(this, _emitter).on(key, __classPrivateFieldGet(this, _functions)[encUrl]);
                });
            }));
        }));
        _getRequestFunction.set(this, (url) => {
            return (shortName, jsonData, headersData) => __awaiter(this, void 0, void 0, function* () {
                const headers = Object.assign(Object.assign({}, headersData), { 'Content-Type': 'application/json' });
                const response = yield request({
                    method: 'POST',
                    uri: url,
                    strictSSL: false,
                    headers: headers,
                    body: JSON.stringify(jsonData),
                    resolveWithFullResponse: true,
                });
                const { statusCode, body } = response;
                console.debug(`Request sent - Server responded with: ${statusCode}, ${body}`);
                __classPrivateFieldGet(this, _emitter).emit(`${shortName}.status`, shortName, statusCode, body);
            });
        });
        _removeUrlFromShortName.set(this, (shortName, url) => __awaiter(this, void 0, void 0, function* () {
            const urls = JSON.parse(yield __classPrivateFieldGet(this, _redisClient).get(shortName));
            if (urls.indexOf(url) !== -1) {
                urls.splice(urls.indexOf(url), 1);
                yield __classPrivateFieldGet(this, _redisClient).set(shortName, JSON.stringify(urls));
            }
            else {
                throw new Error(`URL(${url}) not found wile removing from ShortName(${shortName}).`);
            }
        }));
        _removeShortName.set(this, (shortName) => __awaiter(this, void 0, void 0, function* () {
            if (yield __classPrivateFieldGet(this, _redisClient).exists(shortName))
                yield __classPrivateFieldGet(this, _redisClient).unlink(shortName);
            else
                throw new Error(`ShortName(${shortName}) not found while removing ShortName.`);
        }));
        this.trigger = (shortName, jsonData, headersData) => __classPrivateFieldGet(this, _emitter).emit(shortName, shortName, jsonData, headersData);
        this.add = (shortName, url) => __awaiter(this, void 0, void 0, function* () {
            const urls = (yield __classPrivateFieldGet(this, _redisClient).exists(shortName))
                ? JSON.parse(yield __classPrivateFieldGet(this, _redisClient).get(shortName))
                : [];
            if (urls.indexOf(url) === -1) {
                urls.push(url);
                const encUrl = crypto.createHash('md5').update(url).digest('hex');
                __classPrivateFieldGet(this, _functions)[encUrl] = __classPrivateFieldGet(this, _getRequestFunction).call(this, url);
                __classPrivateFieldGet(this, _emitter).on(shortName, __classPrivateFieldGet(this, _functions)[encUrl]);
                yield __classPrivateFieldGet(this, _redisClient).set(shortName, JSON.stringify(urls));
            }
            else {
                throw new Error(`URL(${url}) already exists for shortName(${shortName}).`);
            }
        });
        this.remove = (shortName, url) => __awaiter(this, void 0, void 0, function* () {
            if (url) {
                yield __classPrivateFieldGet(this, _removeUrlFromShortName).call(this, shortName, url);
                const urlKey = crypto.createHash('md5').update(url).digest('hex');
                __classPrivateFieldGet(this, _emitter).removeListener(shortName, __classPrivateFieldGet(this, _functions)[urlKey]);
                delete __classPrivateFieldGet(this, _functions)[urlKey];
            }
            else {
                if (!(yield __classPrivateFieldGet(this, _redisClient).exists(shortName)))
                    throw new Error(`ShortName(${shortName}) not found while removing.`);
                __classPrivateFieldGet(this, _emitter).removeAllListeners(shortName);
                const urls = JSON.parse(yield __classPrivateFieldGet(this, _redisClient).get(shortName));
                urls.forEach(url => {
                    const urlKey = crypto.createHash('md5').update(url).digest('hex');
                    delete __classPrivateFieldGet(this, _functions)[urlKey];
                });
                __classPrivateFieldGet(this, _removeShortName).call(this, shortName);
            }
        });
        this.getDB = () => __awaiter(this, void 0, void 0, function* () {
            const keys = yield __classPrivateFieldGet(this, _redisClient).keys('*');
            const pairs = yield Promise.all(keys.map((key) => __awaiter(this, void 0, void 0, function* () {
                const urls = JSON.parse(yield __classPrivateFieldGet(this, _redisClient).get(key));
                return [key, urls];
            })));
            return Object.fromEntries(pairs);
        });
        this.getWebHook = (shortName) => __awaiter(this, void 0, void 0, function* () {
            if (!(yield __classPrivateFieldGet(this, _redisClient).exists(shortName)))
                throw new Error(`ShortName(${shortName}) not found while removing.`);
            return yield __classPrivateFieldGet(this, _redisClient).get(shortName);
        });
        __classPrivateFieldSet(this, _redisClient, redisClient);
        __classPrivateFieldSet(this, _emitter, new events_1.EventEmitter());
        __classPrivateFieldSet(this, _functions, {});
        __classPrivateFieldGet(this, _setListeners).call(this);
    }
    get listener() {
        return __classPrivateFieldGet(this, _functions);
    }
    get emitter() {
        return __classPrivateFieldGet(this, _emitter);
    }
}
exports.WebHooks = WebHooks;
_redisClient = new WeakMap(), _emitter = new WeakMap(), _functions = new WeakMap(), _setListeners = new WeakMap(), _getRequestFunction = new WeakMap(), _removeUrlFromShortName = new WeakMap(), _removeShortName = new WeakMap();
exports.default = WebHooks;
//# sourceMappingURL=index.js.map