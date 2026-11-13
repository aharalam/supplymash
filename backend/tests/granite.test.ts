import { IDS, startServer, stubExternalFetch, restoreFetch, jsonResponse, FURNITURE_ORDER, ApiResult } from './helpers';
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { graniteChat, graniteJSON, resetGraniteToken } from '../src/services/granite';
import { db, reseed } from '../src/models/store';
import { parseOrder } from '../src/services/parser';

/** Fake watsonx: IAM token + chat, answering by which job the system prompt describes. */
function fakeWatsonx(replies: { parse?: string; scrap?: string; reason?: string; intro?: string; chatStatus?: number }) {
  const calls = { iam: 0, chat: 0, bodies: [] as Record<string, unknown>[], auth: [] as string[] };
  stubExternalFetch(async (url, init) => {
    if (url === 'https://iam.cloud.ibm.com/identity/token') {
      calls.iam++;
      assert.match(String(init.body), /grant_type=urn%3Aibm%3Aparams%3Aoauth%3Agrant-type%3Aapikey&apikey=test-key/);
      return jsonResponse({ access_token: 'tok-123', expires_in: 3600 });
    }
    assert.match(url, /^https:\/\/us-south\.ml\.cloud\.ibm\.com\/ml\/v1\/text\/chat\?version=/);
    calls.chat++;
    calls.auth.push(String((init.headers as Record<string, string>).Authorization));
    const body = JSON.parse(String(init.body));
    calls.bodies.push(body);
    if (replies.chatStatus) return jsonResponse({ errors: [{ message: 'boom' }] }, replies.chatStatus);
    const system: string = body.messages[0].content;
    const content = system.includes('free-text supply order')
      ? replies.parse
      : system.includes('reusable scrap')
        ? replies.scrap
        : system.includes('friendly explanation')
          ? replies.reason
          : replies.intro;
    return jsonResponse({ choices: [{ message: { role: 'assistant', content: content ?? '' } }] });
  });
  return calls;
}

function configure() {
  process.env.WATSONX_API_KEY = 'test-key';
  process.env.WATSONX_PROJECT_ID = 'proj-1';
  process.env.WATSONX_MODEL_ID = 'ibm/granite-test';
  resetGraniteToken();
}

function unconfigure() {
  process.env.WATSONX_API_KEY = '';
  process.env.WATSONX_PROJECT_ID = '';
  resetGraniteToken();
  restoreFetch();
}

describe('Granite client', () => {
  beforeEach(configure);
  afterEach(unconfigure);

  it('is skipped entirely when not configured', async () => {
    unconfigure(); // any external call would now throw
    assert.equal(await graniteChat('s', 'u'), null);
  });

  it('sends model, project and bearer token, and caches the IAM token', async () => {
    const calls = fakeWatsonx({ parse: 'hi' });
    assert.equal(await graniteChat('free-text supply order', 'u'), 'hi');
    assert.equal(await graniteChat('free-text supply order', 'u'), 'hi');
    assert.equal(calls.iam, 1);
    assert.equal(calls.chat, 2);
    assert.equal(calls.bodies[0].model_id, 'ibm/granite-test');
    assert.equal(calls.bodies[0].project_id, 'proj-1');
    assert.equal(calls.auth[0], 'Bearer tok-123');
  });

  it('extracts JSON wrapped in prose or code fences', async () => {
    fakeWatsonx({ parse: 'Sure!\n```json\n[{"sku":"A","qty":2}]\n```' });
    assert.deepEqual(await graniteJSON('free-text supply order', 'u'), [{ sku: 'A', qty: 2 }]);
  });

  it('returns null for replies with no valid JSON', async () => {
    fakeWatsonx({ parse: 'I cannot help with that.' });
    assert.equal(await graniteJSON('free-text supply order', 'u'), null);
    fakeWatsonx({ parse: '[{"sku": "A", qty: }]' });
    assert.equal(await graniteJSON('free-text supply order', 'u'), null);
  });

  it('returns null on HTTP errors', async () => {
    fakeWatsonx({ chatStatus: 500 });
    assert.equal(await graniteChat('s', 'u'), null);
  });

  it('gives up after the timeout', async () => {
    stubExternalFetch((_url, init) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    // AbortSignal.timeout's timer is unref'd; in the server the open socket keeps the
    // process alive, so do the same here or the test process exits mid-wait.
    const keepAlive = setTimeout(() => {}, 5000);
    const started = Date.now();
    assert.equal(await graniteChat('s', 'u', { timeoutMs: 50 }), null);
    assert.ok(Date.now() - started < 1000);
    clearTimeout(keepAlive);
  });
});

describe('parseOrder with Granite', () => {
  beforeEach(() => {
    configure();
    reseed();
  });
  afterEach(unconfigure);
  const detroit = () => db.suppliers.find((s) => s.id === IDS.detroit)!;

  it('uses Granite lines when valid, dropping unknown SKUs', async () => {
    fakeWatsonx({ parse: '[{"sku":"PTOWEL-CS","qty":2},{"sku":"MADE-UP","qty":9}]' });
    const r = await parseOrder('two cases of the quilted Bounty stuff', detroit());
    assert.equal(r.parsedBy, 'granite');
    assert.deepEqual(r.lines.map((l) => [l.sku, l.qty]), [['PTOWEL-CS', 2]]);
  });

  it('falls back when Granite returns nothing usable', async () => {
    fakeWatsonx({ parse: '[]' });
    const r = await parseOrder('3 cups', detroit());
    assert.equal(r.parsedBy, 'fallback');
    assert.deepEqual(r.lines.map((l) => [l.sku, l.qty]), [['CUPS8-CS', 3]]);
  });

  it('falls back when watsonx is down', async () => {
    fakeWatsonx({ chatStatus: 503 });
    const r = await parseOrder('3 cups', detroit());
    assert.equal(r.parsedBy, 'fallback');
  });
});

describe('orders, scrap and PO email with Granite on', () => {
  let server: Server;
  let api: (method: string, path: string, opts?: { body?: unknown; as?: string }) => Promise<ApiResult>;
  before(async () => {
    ({ server, api } = await startServer());
  });
  after(() => server.close());
  beforeEach(async () => {
    configure();
    await api('POST', '/demo/reset');
  });
  afterEach(unconfigure);

  const furnitureOrder = () =>
    api('POST', '/orders', { body: { businessId: IDS.furniture, supplierId: IDS.grLumber, text: FURNITURE_ORDER } });

  it('Granite parses, refines the scrap estimate and writes the reason', async () => {
    fakeWatsonx({
      parse: '[{"sku":"STUD2X4-8","qty":60},{"sku":"PLY34-4X8","qty":10}]',
      scrap: '[{"materialCategory":"wood_lumber","title":"Pine offcuts","estLbs":150,"readyInDays":10},{"materialCategory":"plastic","title":"Wrap","estLbs":5,"readyInDays":1}]',
      reason: 'Your framing order will leave clean pine offcuts. A farm nearby wants them for bedding.',
    });
    const res = await furnitureOrder();
    assert.equal(res.status, 201);
    assert.equal(res.body.parsedBy, 'granite');
    assert.equal(res.body.scrapOffers.length, 1); // nobody requested plastic
    const offer = res.body.scrapOffers[0];
    assert.equal(offer.material, 'Pine offcuts');
    assert.equal(offer.estQty, 150);
    assert.equal(offer.readyInDays, 10);
    assert.equal(offer.reasoningBy, 'granite');
    assert.match(offer.aiReasoning, /pine offcuts/);
  });

  it('the rule-based offcut offer survives when Granite infers nothing', async () => {
    fakeWatsonx({ parse: '[{"sku":"STUD2X4-8","qty":60},{"sku":"PLY34-4X8","qty":10}]', scrap: '[]', reason: '' });
    const res = await furnitureOrder();
    const offer = res.body.scrapOffers[0];
    assert.equal(offer.material, 'Wood offcuts and sawdust');
    assert.equal(offer.estQty, 114);
    assert.equal(offer.reasoningBy, 'template');
  });

  it('Granite calling the purchased product itself "scrap" is ignored', async () => {
    // Seen live from granite-4-h-small: the whole plywood order offered as scrap.
    fakeWatsonx({ parse: '[]', scrap: '[{"materialCategory":"wood_lumber","title":"Plywood Sheet 4x8","estLbs":600,"readyInDays":7}]' });
    const res = await furnitureOrder();
    assert.equal(res.body.scrapOffers[0].material, 'Wood offcuts and sawdust');
    assert.equal(res.body.scrapOffers[0].estQty, 114);
  });

  it('impossible Granite estimates are ignored', async () => {
    fakeWatsonx({ parse: '[]', scrap: '[{"materialCategory":"wood_lumber","title":"Offcuts","estLbs":99999,"readyInDays":3}]' });
    const res = await furnitureOrder();
    assert.equal(res.body.scrapOffers[0].estQty, 114);
  });

  it('Granite writes the PO greeting, but never the numbers', async () => {
    fakeWatsonx({ intro: 'Hello Motor City Restaurant Supply team,\n\nThree neighbours are ordering together this week.' });
    const res = await api('POST', `/pools/${IDS.detroitPool}/close`);
    assert.equal(res.body.purchaseOrder.emailBy, 'granite');
    assert.ok(res.body.purchaseOrder.emailText.includes('Three neighbours'));
    assert.ok(res.body.purchaseOrder.emailText.includes('$273.50'));
  });

  it('a Granite greeting containing prices is replaced by the template', async () => {
    fakeWatsonx({ intro: 'Hello! Please ship $999 of goods.' });
    const res = await api('POST', `/pools/${IDS.detroitPool}/close`);
    assert.equal(res.body.purchaseOrder.emailBy, 'template');
    assert.ok(!res.body.purchaseOrder.emailText.includes('$999'));
  });
});
