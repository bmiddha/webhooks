# WebHooks

Easy-to-use, object oriented WebHooks library written in TypeScript.

[![Node CI](https://github.com/bmiddha/webhooks/workflows/Node%20CI/badge.svg)](https://github.com/bmiddha/webhooks/actions?query=workflow%3A%22Node+CI%22)
[![NPM Publish](https://github.com/bmiddha/webhooks/workflows/NPM%20Publish/badge.svg)](https://github.com/bmiddha/webhooks/actions?query=workflow%3A%22NPM+Publish%22)
[![codecov](https://codecov.io/gh/bmiddha/webhooks/branch/master/graph/badge.svg)](https://codecov.io/gh/bmiddha/webhooks)
[![Coverage Status](https://coveralls.io/repos/github/bmiddha/webhooks/badge.svg?branch=master)](https://coveralls.io/github/bmiddha/webhooks?branch=master)
[![dependencies Status](https://david-dm.org/bmiddha/webhooks/status.svg)](https://david-dm.org/bmiddha/webhooks)
[![devDependencies Status](https://david-dm.org/bmiddha/webhooks/dev-status.svg)](https://david-dm.org/bmiddha/webhooks?type=dev)
[![bundlephobia](https://badgen.net/bundlephobia/min/@bmiddha/webhooks)](https://bundlephobia.com/result?p=@bmiddha/webhooks@0.2.1)
[![bundlephobia](https://badgen.net/bundlephobia/minzip/@bmiddha/webhooks)](https://bundlephobia.com/result?p=@bmiddha/webhooks@0.2.1)
[![license](https://img.shields.io/github/license/bmiddha/webhooks)](https://github.com/bmiddha/webhooks/blob/master/LICENSE)

[![NPM](https://nodei.co/npm/@bmiddha/webhooks.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/@bmiddha/webhooks/)

## Install

```powershell
npm install --save @bmiddha/webhooks
```

## API

### `add(name, url)` - Add WebHook

#### Parameters

| Name        | Type     | Required |
| ----------- | -------- | -------- |
| `name` | `string` | `true`   |
| `url`       | `string` | `true`   |

### Return: `void`

Add WebHook to database.

### `remove(name, url)` - Remove WebHook

#### Parameters

| Name        | Type     | Required |
| ----------- | -------- | -------- |
| `name` | `string` | `true`   |
| `url`       | `string` | `false`  |

### Return: `void`

### `trigger(name, data, headers)` - Trigger WebHook

#### Parameters

| Name        | Type     | Required |
| ----------- | -------- | -------- |
| `name` | `string` | `true`   |
| `data`      | `JSON`   | `true`   |
| `headers`   | `JSON`   | `false`  |

#### Return: `boolean`

Event emission return value

### `getDB()` - Get All WebHooks from Database

#### Return: `Object`

All names, and URLs.

```json
{
    "name1": [
        "url1",
        "url2",
        "url3"
    ],
    "name2": [
        "url4"
    ]
}
```

### `getWebHook(name)` - Get WebHook

#### Parameters

| Name        | Type     | Required |
| ----------- | -------- | -------- |
| `name` | `string` | `true`   |

### `requestFunctions()` - Get Request Functions

### Return: `Array<(name: string, jsonData: {}, headersData?: {})>`

### `emitter()` - Get Event Emitter

### Return: `events.EventEmitter`

## Example

```typescript
import * as Redis from 'ioredis';
import WebHooks from '@bmiddha/webhooks';

const redisClient = new Redis();

const webHooks = new WebHooks({ redisClient });

webHooks.add('webHookName', 'http://localhost:8080/hook')
import * as Redis from "ioredis";
import WebHooks from "@bmiddha/webhooks";

const redisClient = new Redis();

const webHooks = new WebHooks({ redisClient });

const demo = async () => {
    await webHooks.add("webHookName", "http://localhost:8080/hook");
    webHooks.trigger("webHooksName", { data: 123 });
    webHooks.trigger(
    "webHooksName",
    {
        test: "data",
        more: {
        test: "data"
        },
        even: {
        more: {
            test: "data"
        }
        }
    },
    {
        "custom-header": "value"
    }
    );
}

demo();

```

## Acknowledgments

Inspired by [roccomuso/node-webhooks](https://github.com/roccomuso/node-webhooks).
