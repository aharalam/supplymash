import { IDS, startServer, stubExternalFetch, restoreFetch, jsonResponse, GREEKTOWN_ORDER, ApiResult } from './helpers';
import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { assertSafeStripeKey, resetPaymentsCache } from '../src/services/payments';

describe('Stripe key safety', () => {
  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = '';
  });
  it('refuses live keys and accepts test keys or no key', () => {
    process.env.STRIPE_SECRET_KEY = 'sk_live_abc';
    assert.throws(assertSafeStripeKey, /TEST key/);
    process.env.STRIPE_SECRET_KEY = 'sk_test_abc';
    assert.doesNotThrow(assertSafeStripeKey);
    process.env.STRIPE_SECRET_KEY = '';
    assert.doesNotThrow(assertSafeStripeKey);
  });
});

/** Fake Stripe API. `declineCustomerOf` makes that business's card decline. */
function fakeStripe(opts: { declineBusiness?: string; networkDown?: boolean } = {}) {
  const calls = { customers: 0, attach: 0, intents: [] as Record<string, string>[] };
  const customerOf = new Map<string, string>(); // customer id → business id
  stubExternalFetch((url, init) => {
    if (opts.networkDown) throw new TypeError('fetch failed');
    assert.equal((init.headers as Record<string, string>).Authorization, 'Bearer sk_test_fake');
    const params = Object.fromEntries(new URLSearchParams(String(init.body)));
    if (url.endsWith('/v1/customers')) {
      calls.customers++;
      const id = `cus_${calls.customers}`;
      customerOf.set(id, params['metadata[businessId]']);
      return jsonResponse({ id });
    }
    if (url.endsWith('/v1/payment_methods/pm_card_visa/attach')) {
      calls.attach++;
      return jsonResponse({ id: `pm_${params.customer}` });
    }
    if (url.endsWith('/v1/payment_intents')) {
      calls.intents.push(params);
      const id = `pi_${calls.intents.length}`;
      if (customerOf.get(params.customer) === opts.declineBusiness) {
        return jsonResponse({ error: { type: 'card_error', code: 'card_declined', message: 'Your card was declined.', payment_intent: { id } } }, 402);
      }
      return jsonResponse({ id, status: 'succeeded' });
    }
    throw new Error(`unexpected Stripe call ${url}`);
  });
  return calls;
}

describe('closing a pool with Stripe test mode', () => {
  let server: Server;
  let api: (method: string, path: string, opts?: { body?: unknown; as?: string }) => Promise<ApiResult>;
  before(async () => {
    ({ server, api } = await startServer());
  });
  after(() => server.close());
  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
    resetPaymentsCache();
    await api('POST', '/demo/reset');
    await api('POST', '/orders', { body: { businessId: IDS.greektown, supplierId: IDS.detroit, text: GREEKTOWN_ORDER } });
  });
  afterEach(() => {
    process.env.STRIPE_SECRET_KEY = '';
    restoreFetch();
  });

  it('charges every member once, in cents, before building the PO', async () => {
    const calls = fakeStripe();
    const res = await api('POST', `/pools/${IDS.detroitPool}/close`);
    assert.equal(res.status, 200);
    assert.equal(calls.customers, 3);
    assert.equal(calls.attach, 3);
    assert.deepEqual(calls.intents.map((p) => p.amount), ['19600', '7750', '9900']);
    assert.ok(calls.intents.every((p) => p.currency === 'usd' && p.confirm === 'true' && p.off_session === 'true'));
    assert.deepEqual(res.body.invoices.map((i: { status: string }) => i.status), ['succeeded', 'succeeded', 'succeeded']);
    assert.deepEqual(res.body.invoices.map((i: { stripePaymentIntentId: string }) => i.stripePaymentIntentId), ['pi_1', 'pi_2', 'pi_3']);

    // Customers are reused across demo resets.
    await api('POST', '/demo/reset');
    await api('POST', `/pools/${IDS.detroitPool}/close`);
    assert.equal(calls.customers, 3);
  });

  it('a declined card drops that member, reprices the rest once and charges the difference', async () => {
    const calls = fakeStripe({ declineBusiness: IDS.midtown });
    const res = await api('POST', `/pools/${IDS.detroitPool}/close`);
    assert.equal(res.status, 200);

    const byBiz = Object.fromEntries(res.body.invoices.map((i: { businessId: string }) => [i.businessId, i]));
    assert.equal(byBiz[IDS.midtown].status, 'failed');
    assert.equal(byBiz[IDS.midtown].savings, 0);
    assert.equal(byBiz[IDS.corktown].status, 'succeeded');

    // Without Midtown: towels 5 ($19.50), cups 6 ($23.50), napkins 2, cleaner 3 → $295 < $350, so delivery returns.
    const po = res.body.purchaseOrder;
    assert.equal(po.subtotal, 295);
    assert.equal(po.deliveryFee, 45);
    assert.equal(po.total, 340);
    assert.ok(!po.emailText.includes('Midtown'));

    // 3 first charges + 2 top-ups for the remaining members' share of delivery.
    assert.equal(calls.intents.length, 5);
    const topUps = calls.intents.slice(3).map((p) => Number(p.amount));
    assert.ok(topUps.every((c) => c > 0));
    const firstCharges = Number(calls.intents[0].amount) + Number(calls.intents[2].amount);
    const finalTotal = byBiz[IDS.corktown].pooledCost + byBiz[IDS.greektown].pooledCost;
    assert.equal(firstCharges + topUps.reduce((a, b) => a + b, 0), Math.round(finalTotal * 100));
    assert.equal(Math.round(finalTotal * 100), 34000);

    // The declined business sees its failed invoice; the pool shows 2 members.
    const view = (await api('GET', `/pools/${IDS.detroitPool}`, { as: IDS.midtown })).body;
    assert.equal(view.memberCount, 2);
    assert.equal(view.yourInvoice.status, 'failed');

    // ...and is told why, while the others are told what they paid.
    const midtown = (await api('GET', '/notifications', { as: IDS.midtown })).body.notifications[0];
    assert.equal(midtown.kind, 'charge_failed');
    assert.match(midtown.body, /not charged/);
    const corktown = (await api('GET', '/notifications', { as: IDS.corktown })).body.notifications[0];
    assert.equal(corktown.kind, 'pool_closed');
    assert.match(corktown.body, /one delivery with 1 other local business\./);
  });

  it('if Stripe is unreachable, charges are mocked and the demo still completes', async () => {
    fakeStripe({ networkDown: true });
    const res = await api('POST', `/pools/${IDS.detroitPool}/close`);
    assert.equal(res.status, 200);
    assert.ok(res.body.invoices.every((i: { status: string }) => i.status === 'mock_succeeded'));
  });

  it('a double-click on close only charges once', async () => {
    const calls = fakeStripe();
    const [a, b] = await Promise.all([
      api('POST', `/pools/${IDS.detroitPool}/close`),
      api('POST', `/pools/${IDS.detroitPool}/close`),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    assert.equal(calls.intents.length, 3);
  });
});
