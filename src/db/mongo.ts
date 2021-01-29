import mongoose, { Schema } from 'mongoose';
import { Connection, Document, Model } from 'mongoose';
import { DB, Hook } from '..';

export const HookSchema = new Schema<HookDocument>({
  key: String,
  urls: [String],
});

export type HookDocument = Hook &
  Document & {
    _id: string;
  };

export class MongoDB implements DB {
  conn: Connection;
  hook: Model<Hook & Document>;

  constructor(mongooseConnection: Connection) {
    this.conn = mongooseConnection;
    this.hook =
      mongoose.models.Hook || this.conn.model<HookDocument>('Hook', HookSchema);
  }
  async get(key: string): Promise<Hook> {
    const doc = await this.hook.findOne({ key }).lean();
    return !!doc ? { urls: doc.urls, key: doc.key } : { urls: [], key };
  }
  async getDB(): Promise<Hook[]> {
    return (await this.hook.find({}).lean()).map(({ key, urls }) => ({
      key,
      urls,
    }));
  }
  async deleteKey(key: string): Promise<boolean> {
    const result = await this.hook.findOneAndDelete(
      { key },
      { rawResult: true }
    );
    if (result) {
      //@ts-ignore
      return result.ok === 1;
    }
    return false;
  }
  async deleteUrl(key: string, url: string): Promise<boolean> {
    const urls = (await this.get(key)).urls;
    if (urls.indexOf(url) !== -1) {
      urls.splice(urls.indexOf(url), 1);
      return (
        (
          await this.hook.findOneAndUpdate(
            { key },
            { key, urls },
            { rawResult: true }
          )
        ).ok === 1
      );
    }
    return false;
  }
  async add(key: string, url: string): Promise<boolean> {
    const hook = await this.get(key);
    const urls = hook.urls;

    if (urls.indexOf(url) === -1) {
      urls.push(url);
      const doc = await this.hook.findOneAndUpdate(
        { key },
        { key, urls },
        { upsert: true, rawResult: true }
      );
      return doc.ok === 1;
    }
    return false;
  }
}

export default MongoDB;
