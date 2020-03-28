/// <reference types="node" />
import { EventEmitter } from 'events';
declare type Options = {
    redisUri?: string;
};
interface DB {
    [key: string]: string[];
}
interface HashTable<T> {
    [key: string]: T;
}
declare type RequestFunction = (shortName: string, jsonData: {}, headersData?: {}) => Promise<void>;
export declare class WebHooks {
    #private;
    constructor({ redisUri }: Options);
    trigger: (shortName: string, jsonData: {}, headersData?: {}) => boolean;
    add: (shortName: string, url: string) => Promise<void>;
    remove: (shortName: string, url?: string) => Promise<void>;
    getDB: () => Promise<DB>;
    getWebHook: (shortName: string) => Promise<string>;
    get listener(): HashTable<RequestFunction>;
    get emitter(): EventEmitter;
}
export default WebHooks;
