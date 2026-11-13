import { IDS, startServer, GREEKTOWN_ORDER, FURNITURE_ORDER, ApiResult } from './helpers';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';

let server: Server;
let api: (method: string, path: string, opts?: { body?: unknown; as?: string }) => Promise<ApiResult>;

before(async () => {
  ({ server, api } = await startServer());
});
after(() => server.close());

const order = (businessId: string, supplierId: string, text: string) =>
  api('POST', '/orders', { body: { businessId, supplierId, text } });

/** Names a business viewer must never see before a scrap offer is accepted. */
function assertNoNames(result: ApiResult, names: string[], context: string) {
  for (const n of names) assert.ok(!result.text.includes(n), `${context} leaked "${n}": ${result.text.slice(0, 300)}`);
}

describe('seed and reset', () => {
  it('serves suppliers and the 10 seeded businesses with usual suppliers', async () => {
    await api('POST', '/demo/reset');
    const sup = await api('GET', '/suppliers');
    assert.equal(sup.status, 200);
    assert.deepEqual(sup.body.map((s: { id: string }) => s.id), [IDS.detroit, IDS.grLumber, IDS.lansing]);
    const biz = await api('GET', '/businesses');
    assert.equal(biz.body.length, 10);
    assert.ok(biz.body.every((b: { usualSupplierIds: unknown }) => Array.isArray(b.usualSupplierIds)));
  });

  it('reset restores the seeded pool after changes', async () => {
    await order(IDS.greektown, IDS.detroit, GREEKTOWN_ORDER);
    await api('POST', `/pools/${IDS.detroitPool}/close`);
    const reset = await api('POST', '/demo/reset');
    assert.deepEqual(reset.body, { ok: true });
    const pools = await api('GET', '/pools');
    assert.equal(pools.body.length, 1);
    assert.equal(pools.body[0].status, 'open');
    assert.equal(pools.body[0].progressPct, 78.14);
    assert.equal(pools.body[0].memberCount, 2);
  });
});

describe('the 3-minute demo path, end to end', () => {
  before(async () => {
    await api('POST', '/demo/reset');
  });

  it('1. Greektown sees the Detroit pool anonymously before ordering', async () => {
    const res = await api('GET', '/pools', { as: IDS.greektown });
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 1);
    const pool = res.body[0];
    assert.equal(pool.memberCount, 2);
    assert.equal(pool.progressPct, 78.14);
    assert.deepEqual(pool.nextMilestone, { label: 'Free delivery at $350.00', amountNeeded: 76.5 });
    assert.equal(pool.yourOrderId, undefined);
    assertNoNames(res, ['Corktown', 'Midtown', 'Napkin', 'Towel', 'orders'], 'viewer pool');
  });

  it('2. Greektown places a messy order and the pool crosses free delivery', async () => {
    const res = await order(IDS.greektown, IDS.detroit, GREEKTOWN_ORDER);
    assert.equal(res.status, 201);
    assert.equal(res.body.parsedBy, 'fallback');
    assert.deepEqual(
      res.body.order.lines.map((l: { sku: string; qty: number }) => [l.sku, l.qty]),
      [['CUPS8-CS', 3], ['CLEANER-GL', 3]],
    );
    const pool = res.body.pool;
    assert.equal(pool.id, IDS.detroitPool);
    assert.equal(pool.memberCount, 3);
    assert.equal(pool.progressPct, 100);
    assert.equal(pool.nextMilestone, null);
    // Alone: cups earn their tier anyway ($70.50) + cleaner $28.50 + $45 delivery.
    assert.equal(pool.yourSoloCost, 144);
    assert.equal(pool.yourPooledCost, 99);
    assert.equal(pool.yourSavings, 45);
    assert.deepEqual(res.body.scrapOffers, []);
    assertNoNames(res, ['Corktown', 'Midtown'], 'order response');
  });

  it('3. existing members now get free delivery too', async () => {
    const corktown = (await api('GET', `/pools/${IDS.detroitPool}`, { as: IDS.corktown })).body;
    assert.equal(corktown.yourSoloCost, 241);
    assert.equal(corktown.yourPooledCost, 196);
    assert.equal(corktown.yourSavings, 45);
    const midtown = (await api('GET', `/pools/${IDS.detroitPool}`, { as: IDS.midtown })).body;
    assert.equal(midtown.yourSavings, 52.5);
  });

  let offerId = '';
  it('4. the furniture maker orders lumber and is offered a sale to a nearby farm', async () => {
    const res = await order(IDS.furniture, IDS.grLumber, FURNITURE_ORDER);
    assert.equal(res.status, 201);
    assert.equal(res.body.pool.memberCount, 1);
    assert.equal(res.body.scrapOffers.length, 1);
    const offer = res.body.scrapOffers[0];
    offerId = offer.matchId;
    assert.equal(offer.role, 'holder');
    assert.equal(offer.material, 'Wood offcuts and sawdust');
    assert.equal(offer.estQty, 114); // 10% of (60 × 9 lb + 10 × 60 lb)
    assert.equal(offer.unit, 'lbs');
    assert.equal(offer.suggestedPricePerUnit, 0.056); // 80% of the farm's $0.07 max
    assert.match(offer.counterpartyLabel, /^A farm \d+ mi away$/);
    assert.ok(offer.distanceMiles > 0 && offer.distanceMiles < 15);
    assert.equal(offer.status, 'pending');
    assert.equal(offer.reasoningBy, 'template');
    assert.ok(offer.aiReasoning.includes('114 lbs'));
    assertNoNames(res, ['Kent County Pastures', 'Rockford'], 'holder offer');
  });

  it('5. the farm sees the offer anonymously, with no buttons to press', async () => {
    const res = await api('GET', '/scrap-offers', { as: IDS.kentFarm });
    assert.equal(res.body.length, 1);
    assert.equal(res.body[0].role, 'requester');
    assert.match(res.body[0].counterpartyLabel, /^A manufacturer \d+ mi away$/);
    assertNoNames(res, ['Lakeshore'], 'requester offer');
  });

  it('6. pending scrap stays out of the legacy listings, matches and matcher', async () => {
    const listings = await api('GET', '/listings');
    assert.ok(!listings.text.includes('Wood offcuts and sawdust'));
    assert.equal((await api('GET', '/listings?status=proposed')).body.length, 0);
    const matches = await api('GET', '/matches');
    assert.ok(!matches.body.some((m: { id: string }) => m.id === offerId));
    const run = await api('POST', '/matches/run');
    assert.ok(!run.text.includes('Wood offcuts and sawdust'));
  });

  it('7. only the holder may answer the offer', async () => {
    const asFarm = await api('PUT', `/matches/${offerId}/respond`, { body: { status: 'accepted' }, as: IDS.kentFarm });
    assert.equal(asFarm.status, 403);
    const anonymous = await api('PUT', `/matches/${offerId}/respond`, { body: { status: 'accepted' } });
    assert.equal(anonymous.status, 403);
    const bad = await api('PUT', `/matches/${offerId}/respond`, { body: { status: 'completed' }, as: IDS.furniture });
    assert.equal(bad.status, 400);
  });

  it('8. the holder accepts; names are revealed to both sides', async () => {
    const res = await api('PUT', `/matches/${offerId}/respond`, { body: { status: 'accepted' }, as: IDS.furniture });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'accepted');
    const holder = (await api('GET', '/scrap-offers', { as: IDS.furniture })).body[0];
    assert.equal(holder.status, 'accepted');
    assert.equal(holder.counterpartyLabel, 'Kent County Pastures');
    const requester = (await api('GET', '/scrap-offers', { as: IDS.kentFarm })).body[0];
    assert.equal(requester.counterpartyLabel, 'Lakeshore Furniture Works');
    assert.ok((await api('GET', '/matches')).body.some((m: { id: string }) => m.id === offerId));
    const again = await api('PUT', `/matches/${offerId}/respond`, { body: { status: 'declined' }, as: IDS.furniture });
    assert.equal(again.status, 409);
  });

  it('9. the operator sees every member, then closes the pool', async () => {
    const op = (await api('GET', `/pools/${IDS.detroitPool}`)).body;
    assert.deepEqual(op.orders.map((o: { businessName: string }) => o.businessName), ['Corktown Coffee', 'Midtown Grind', 'Greek Town Espresso']);
    assert.equal(op.subtotal, 372.5);

    const res = await api('POST', `/pools/${IDS.detroitPool}/close`);
    assert.equal(res.status, 200);
    const po = res.body.purchaseOrder;
    assert.deepEqual(
      po.lines.map((l: { sku: string; qty: number; unitPrice: number }) => [l.sku, l.qty, l.unitPrice]),
      [['PTOWEL-CS', 8, 19.5], ['CUPS8-CS', 6, 23.5], ['NAPKIN-CS', 2, 14], ['CLEANER-GL', 5, 9.5]],
    );
    assert.equal(po.subtotal, 372.5);
    assert.equal(po.deliveryFee, 0);
    assert.equal(po.total, 372.5);
    assert.equal(po.emailBy, 'template');
    assert.match(po.emailText, /^Subject: Combined purchase order pool-detroit-01/);
    assert.ok(po.emailText.includes('$372.50'));
    assert.ok(po.emailText.includes('Greek Town Espresso, Detroit'));

    const invoices = res.body.invoices;
    assert.equal(invoices.length, 3);
    assert.ok(invoices.every((i: { status: string; stripePaymentIntentId: string }) => i.status === 'mock_succeeded' && i.stripePaymentIntentId.startsWith('pi_mock_')));
    const charged = invoices.reduce((s: number, i: { pooledCost: number }) => s + i.pooledCost, 0);
    assert.equal(Math.round(charged * 100) / 100, po.total);
    assert.deepEqual(invoices.map((i: { savings: number }) => i.savings), [45, 52.5, 45]);
  });

  it('10. closing twice is refused, and each business sees only its own invoice', async () => {
    assert.equal((await api('POST', `/pools/${IDS.detroitPool}/close`)).status, 409);
    const view = (await api('GET', `/pools/${IDS.detroitPool}`, { as: IDS.greektown })).body;
    assert.equal(view.status, 'closed');
    assert.equal(view.yourInvoice.businessId, IDS.greektown);
    assert.equal(view.yourInvoice.pooledCost, 99);
    const orders = (await api('GET', '/orders', { as: IDS.greektown })).body;
    assert.equal(orders.length, 1);
    assert.equal(orders[0].status, 'invoiced');
    assert.equal(orders[0].pool.yourInvoice.status, 'mock_succeeded');
  });

  it('11. metrics add up', async () => {
    const m = (await api('GET', '/metrics')).body;
    assert.deepEqual(m, {
      dollarsSaved: 142.5,
      dollarsSavedClosed: 142.5, // 45 + 52.50 + 45
      dollarsSavedProjected: 0, // the furniture maker's lumber pool has no savings yet
      deliveriesAvoided: 2,
      lbsDiverted: 114,
      dollarsKeptInMichigan: 378.88, // $372.50 PO with a Michigan supplier + 114 lb × $0.056
    });
  });

  it('12. the next Detroit order starts a fresh pool', async () => {
    const res = await order(IDS.corktown, IDS.detroit, '1 case napkins');
    assert.equal(res.status, 201);
    assert.notEqual(res.body.pool.id, IDS.detroitPool);
    assert.equal(res.body.pool.memberCount, 1);
    assert.equal(res.body.pool.status, 'open');
  });
});

describe('pool membership rules', () => {
  before(async () => {
    await api('POST', '/demo/reset');
  });

  it('a second order from a member merges into its existing order', async () => {
    const res = await order(IDS.midtown, IDS.detroit, '2 napkins and 1 case towels');
    assert.equal(res.status, 201);
    assert.equal(res.body.order.id, 'ord-cafe2-seed-01');
    assert.equal(res.body.pool.memberCount, 2);
    assert.deepEqual(
      res.body.order.lines.map((l: { sku: string; qty: number }) => [l.sku, l.qty]),
      [['PTOWEL-CS', 4], ['CLEANER-GL', 2], ['NAPKIN-CS', 2]],
    );
    const mine = (await api('GET', '/orders', { as: IDS.midtown })).body;
    assert.equal(mine.length, 1);
  });

  it('declining a scrap offer expires it and keeps it hidden', async () => {
    const res = await order(IDS.furniture, IDS.grLumber, '100 2x4s');
    const offer = res.body.scrapOffers[0];
    const decline = await api('PUT', `/matches/${offer.matchId}/respond`, { body: { status: 'declined' }, as: IDS.furniture });
    assert.equal(decline.status, 200);
    assert.equal((await api('GET', '/scrap-offers', { as: IDS.furniture })).body[0].status, 'declined');
    assert.ok(!(await api('GET', '/matches')).body.some((m: { id: string }) => m.id === offer.matchId));
    assert.equal((await api('GET', '/listings?status=expired')).body.length, 0);
    // The farm's request is still open, so a new lumber order can be offered again.
    const again = await order(IDS.furniture, IDS.grLumber, '20 2x4s');
    assert.equal(again.body.scrapOffers.length, 1);
  });

  it('a farm with no matching supplier sees no pools; paper goods create no scrap offers', async () => {
    assert.deepEqual((await api('GET', '/pools', { as: IDS.kentFarm })).body, []);
    const res = await order(IDS.corktown, IDS.detroit, '2 cups');
    assert.deepEqual(res.body.scrapOffers, []);
  });

  it('a Detroit lumber order is matched to the nearest farm within 60 miles', async () => {
    const res = await order(IDS.contractor, IDS.grLumber, '50 2x4s');
    assert.equal(res.body.scrapOffers.length, 1);
    assert.ok(res.body.scrapOffers[0].distanceMiles <= 60);
  });
});

describe('errors come back as { error } with the right status', () => {
  before(async () => {
    await api('POST', '/demo/reset');
  });

  const cases: [string, string, string, { body?: unknown; as?: string }, number][] = [
    ['missing order fields', 'POST', '/orders', { body: {} }, 400],
    ['blank order text', 'POST', '/orders', { body: { businessId: IDS.corktown, supplierId: IDS.detroit, text: '   ' } }, 400],
    ['unknown business', 'POST', '/orders', { body: { businessId: 'nope', supplierId: IDS.detroit, text: '2 cups' } }, 404],
    ['unknown supplier', 'POST', '/orders', { body: { businessId: IDS.corktown, supplierId: 'nope', text: '2 cups' } }, 404],
    ['unparseable order', 'POST', '/orders', { body: { businessId: IDS.corktown, supplierId: IDS.detroit, text: 'hello there' } }, 422],
    ['malformed JSON', 'POST', '/orders', { body: '{"businessId":' }, 400],
    ['orders without viewer', 'GET', '/orders', {}, 400],
    ['scrap offers without viewer', 'GET', '/scrap-offers', {}, 400],
    ['unknown pool', 'GET', '/pools/nope', {}, 404],
    ['unknown pool as viewer', 'GET', '/pools/nope', { as: IDS.corktown }, 404],
    ['close unknown pool', 'POST', '/pools/nope/close', {}, 404],
    ['unknown match', 'PUT', '/matches/nope/respond', { body: { status: 'accepted' } }, 404],
    ['unknown API route', 'GET', '/does-not-exist', {}, 404],
  ];
  for (const [name, method, path, opts, status] of cases) {
    it(name, async () => {
      const res = await api(method, path, opts);
      assert.equal(res.status, status, res.text);
      assert.equal(typeof res.body.error, 'string');
    });
  }

  it('the 422 message suggests catalog items', async () => {
    const res = await order(IDS.corktown, IDS.detroit, 'hello there');
    assert.match(res.body.error, /Try naming items like/);
  });
});

describe('legacy endpoints still work', () => {
  before(async () => {
    await api('POST', '/demo/reset');
  });

  it('register a business (usualSupplierIds defaults to [])', async () => {
    const res = await api('POST', '/businesses', {
      body: { name: 'Test Bakery', type: 'restaurant', location: { city: 'Flint', state: 'MI', zipCode: '48502' }, contactEmail: 't@example.com' },
    });
    assert.equal(res.status, 201);
    assert.deepEqual(res.body.usualSupplierIds, []);
  });

  it('post a listing, run the matcher, accept a legacy match without a viewer header', async () => {
    const created = await api('POST', '/listings', {
      body: { businessId: 'biz-mc-builders-01', type: 'offering', materialCategory: 'metal_scrap', title: 'Rebar offcuts', quantity: 300, unit: 'lbs', pricePerUnit: 0.1 },
    });
    assert.equal(created.status, 201);
    const run = await api('POST', '/matches/run');
    assert.equal(run.status, 200);
    assert.ok(run.body.matched >= 1); // Great Lakes Lumber chips ↔ farm requests
    const match = run.body.matches[0];
    const res = await api('PUT', `/matches/${match.id}/respond`, { body: { status: 'accepted' } });
    assert.equal(res.status, 200);
  });

  it('warehouses are seeded and old order pools still answer', async () => {
    const wh = await api('GET', '/warehouses');
    assert.equal(wh.body.length, 2);
    assert.equal((await api('GET', '/order-pools')).status, 200);
    assert.equal((await api('GET', '/health')).body.status, 'ok');
  });
});

describe('privacy sweep: no business ever sees another business before acceptance', () => {
  before(async () => {
    await api('POST', '/demo/reset');
    await order(IDS.greektown, IDS.detroit, GREEKTOWN_ORDER);
    await order(IDS.furniture, IDS.grLumber, FURNITURE_ORDER);
  });

  const allNames = [
    'Corktown Coffee', 'Midtown Grind', 'Greek Town Espresso', 'Lakeshore Furniture Works',
    'Rivertown Construction', 'Kent County Pastures', 'Washtenaw Roots Farm',
  ];
  for (const viewer of [IDS.corktown, IDS.midtown, IDS.greektown, IDS.furniture, IDS.kentFarm]) {
    it(`viewer ${viewer}`, async () => {
      const own = (await api('GET', '/businesses')).body.find((b: { id: string }) => b.id === viewer).name;
      const others = allNames.filter((n) => n !== own);
      for (const path of ['/pools', '/orders', '/scrap-offers']) {
        const res = await api('GET', path, { as: viewer });
        assert.equal(res.status, 200);
        assertNoNames(res, others, `${viewer} ${path}`);
      }
    });
  }
});
