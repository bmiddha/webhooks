import { Hook } from '..';

export interface DB {
  get(key: string): Promise<Hook>;
  getDB(): Promise<Hook[]>;
  deleteKey(key: string): Promise<boolean>;
  deleteUrl(key: string, url: string): Promise<boolean>;
  add(key: string, url: string): Promise<boolean>;
}

export default DB;
