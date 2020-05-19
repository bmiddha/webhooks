import mongoose, { Connection, Document, Model, Schema } from 'mongoose';
import { DB } from './db';
import { Hook } from '..';

export const HookSchema = new Schema({
    _id: String,
    urls: [String],
});

export type HookDocument = {
    _id: string;
    urls: string[];
};

export class MongoDB implements DB {
    conn: Connection;
    hook: Model<HookDocument & Document>;

    constructor(mongooseConnection: Connection) {
        this.conn = mongooseConnection;
        this.hook =
            mongoose.models.Hook || this.conn.model<HookDocument & Document>('Hook', HookSchema);
    }
    async get(key: string): Promise<Hook> {
        const doc = await this.hook.findById(key);
        return !!doc ? { urls: doc.urls, key: doc._id } : { urls: [], key };
    }
    async getDB(): Promise<Hook[]> {
        return (await this.hook.find({})).map(({ urls, _id }) => {
            return { urls, key: _id };
        });
    }
    async deleteKey(key: string): Promise<boolean> {
        return (await this.hook.findByIdAndDelete(key, { rawResult: true })).ok === 1;
    }
    async deleteUrl(key: string, url: string): Promise<boolean> {
        const urls = (await this.get(key)).urls;
        if (urls.indexOf(url) !== -1) {
            urls.splice(urls.indexOf(url), 1);
            return (await this.hook.findByIdAndUpdate(key, { urls }, { rawResult: true })).ok === 1;
        }
        return false;
    }
    async add(key: string, url: string): Promise<boolean> {
        const hook = await this.get(key);
        const urls = hook.urls;

        if (urls.indexOf(url) === -1) {
            urls.push(url);
            const doc = await this.hook.findByIdAndUpdate(
                key,
                { urls },
                { upsert: true, rawResult: true },
            );
            return doc.ok === 1;
        }
        return false;
    }
}
