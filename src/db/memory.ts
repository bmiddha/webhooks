import { DB } from './db';
import { Hook } from '..';

export interface HashTable<T> {
    [key: string]: T;
}

export class MemoryDB implements DB {
    db: HashTable<string[]>;

    constructor(db: HashTable<string[]>) {
        this.db = db;
    }

    async get(key: string): Promise<Hook> {
        return { key, urls: this.db[key] || [] };
    }
    async getDB(): Promise<Hook[]> {
        const keys = Object.keys(this.db);
        const hooks = keys.map((key: string) => {
            const urls = this.db[key];
            return { key, urls };
        });
        return hooks;
    }
    async deleteKey(key: string): Promise<boolean> {
        if (!!this.db[key]) {
            delete this.db[key];
            return true;
        }
        return false;
    }
    async deleteUrl(key: string, url: string): Promise<boolean> {
        if (!this.db[key]) return false;
        const index = this.db[key].indexOf(url);
        if (index !== -1) {
            this.db[key].splice(index, 1);
            return true;
        }
        return false;
    }
    async add(key: string, url: string): Promise<boolean> {
        if (!this.db[key]) {
            this.db[key] = [];
        }
        if (this.db[key].indexOf(url) === -1) {
            this.db[key].push(url);
            return true;
        }
        return false;
    }
}
