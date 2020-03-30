/// <reference types="node" />
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
declare type Options = {
    redisClient?: Redis;
};
interface DB {
    [key: string]: string[];
}
interface HashTable<T> {
    [key: string]: T;
}
declare type RequestFunction = (name: string, jsonData: {}, headersData?: {}) => Promise<void>;
export declare class WebHooks {
    #private;
    constructor({ redisClient }: Options);
    /**
     * @param  {string} name
     * @param  {Object} jsonData
     * @param  {Object} headersData?
     * @returns boolean
     */
    trigger: (name: string, jsonData: {}, headersData?: {}) => boolean;
    /**
     * Add WebHook to name.
     *
     * @param  {string} name
     * @param  {string} url
     */
    add: (name: string, url: string) => Promise<void>;
    /**
     * Remove URL from specified name. If no URL is specified, then remove name from Database.
     *
     * @param  {string} name
     * @param  {string} url?
     */
    remove: (name: string, url?: string) => Promise<void>;
    /**
     * Return all names, and URL arrays.
     *
     * @returns Promise
     */
    getDB: () => Promise<DB>;
    /**
     * Return array of URLs for specified name.
     *
     * @param  {string} name
     * @returns Promise
     */
    getWebHook: (name: string) => Promise<string>;
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
    get requestFunctions(): HashTable<RequestFunction>;
    /**
     * Return EventEmitter instance.
     *
     * @returns EventEmitter
     */
    get emitter(): EventEmitter;
}
export default WebHooks;
