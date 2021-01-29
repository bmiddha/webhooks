import { StatusResponse } from '..';
export type TriggerOptions = {
  key: string;
  body: {};
  headers?: {};
  callback?: (res: StatusResponse) => void;
};
