/// <reference types="node" />
import { EventEmitter } from 'events';
import { Connection } from 'mongoose';
import { Redis } from 'ioredis';
import { HashTable } from './db/memory';
export declare type Hook = {
    key: string;
    urls: string[];
};
declare type RequestFunction = (name: string, jsonData: {}, headersData?: {}) => Promise<void>;
export declare class DatabaseError extends Error {
    constructor(message: string);
}
declare type Options = {
    mongooseConnection?: Connection;
    redisClient?: Redis;
    memoryDB?: HashTable<string[]>;
};
export declare class WebHooks {
    #private;
    constructor(options: Options);
    /**
     * @param  {string} name
     * @param  {Object} jsonData
     * @param  {Object} headersData?
     */
    trigger: (name: string, jsonData: {}, headersData?: {}) => void;
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
    getDB: () => Promise<Hook[]>;
    /**
     * Return array of URLs for specified name.
     *
     * @param  {string} name
     * @returns Promise
     */
    getWebHook: (name: string) => Promise<string[]>;
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
