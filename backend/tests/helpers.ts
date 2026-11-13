// Must be imported first in every test file: it fixes the environment before the app loads.
process.env.NODE_ENV = 'test';
process.env.WATSONX_API_KEY = '';
process.env.WATSONX_PROJECT_ID = '';
process.env.STRIPE_SECRET_KEY = '';

import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const realFetch = globalThis.fetch;
type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

const forbidExternal: Handler = (url) => {
  throw new Error(`Unexpected external call in tests: ${url}`);
};

/** Route outbound (non-localhost) fetches to `handler`; local calls go through. */
export function stubExternalFetch(handler: Handler): void {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith('http://127.0.0.1')) return realFetch(input, init);
    return handler(url, init ?? {});
  }) as typeof fetch;
}

/** Back to the default: any external call fails the test. */
export function restoreFetch(): void {
  stubExternalFetch(forbidExternal);
}
restoreFetch();

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

export interface ApiResult {
  status: number;
  body: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  text: string;
}

export async function startServer(): Promise<{ server: Server; api: (method: string, path: string, opts?: { body?: unknown; as?: string }) => Promise<ApiResult> }> {
  const { default: app } = await import('../src/app');
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
  const api = async (method: string, path: string, opts: { body?: unknown; as?: string } = {}): Promise<ApiResult> => {
    const headers: Record<string, string> = {};
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    if (opts.as) headers['X-Business-Id'] = opts.as;
    const res = await realFetch(base + path, {
      method,
      headers,
      body: opts.body === undefined ? undefined : typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body),
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* non-JSON body */
    }
    return { status: res.status, body, text };
  };
  return { server, api };
}

export const IDS = {
  detroit: 'sup-detroit-01',
  grLumber: 'sup-gr-lumber-01',
  lansing: 'sup-lansing-farm-01',
  corktown: 'biz-cafe-corktown-01',
  midtown: 'biz-cafe-midtown-01',
  greektown: 'biz-cafe-greektown-01',
  furniture: 'biz-furniture-gr-01',
  contractor: 'biz-contractor-det-01',
  kentFarm: 'biz-farm-kent-01',
  washtenawFarm: 'biz-farm-washtenaw-01',
  detroitPool: 'pool-detroit-01',
};

export const GREEKTOWN_ORDER = '3 cases of 8 oz cups and 3 gallons of cleaner';
export const FURNITURE_ORDER = '60 2x4s and 10 sheets of 3/4 plywood';
