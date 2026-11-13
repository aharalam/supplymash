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

interface Update { kind: string; title: string; body: string; read: boolean }
const updates = async (as: string): Promise<{ unreadCount: number; notifications: Update[] }> =>
  (await api('GET', '/notifications', { as })).body;
const order = (businessId: string, supplierId: string, text: string) =>
  api('POST', '/orders', { body: { businessId, supplierId, text } });

describe('updates feed: every business affected by someone else hears about it', () => {
  before(async () => {
    await api('POST', '/demo/reset');
  });

  it('needs a viewer and starts empty after reset', async () => {
    assert.equal((await api('GET', '/notifications')).status, 400);
    assert.equal((await api('POST', '/notifications/read')).status, 400);
    assert.deepEqual(await updates(IDS.corktown), { unreadCount: 0, notifications: [] });
  });

  it('existing pool members learn their savings rose, without learning who joined', async () => {
    await order(IDS.greektown, IDS.detroit, GREEKTOWN_ORDER);
    const corktown = await updates(IDS.corktown);
    assert.equal(corktown.unreadCount, 1);
    const [u] = corktown.notifications;
    assert.equal(u.kind, 'pool_grew');
    assert.equal(u.title, 'Free delivery unlocked on your Motor City Restaurant Supply order');
    assert.match(u.body, /3 businesses now/);
    assert.match(u.body, /from \$12\.75 to \$45\.00/);
    assert.ok(!/Greek|Espresso|cup|cleaner/i.test(u.title + u.body), 'must not reveal the joiner or its order');

    assert.match((await updates(IDS.midtown)).notifications[0].body, /from \$39\.75 to \$52\.50/);
    assert.equal((await updates(IDS.greektown)).notifications.length, 0, 'the orderer is not told about itself');
  });

  it('a member whose savings did not change is not pinged', async () => {
    // Midtown adds napkins; the pool already has free delivery and the napkin tier needs 4.
    await order(IDS.midtown, IDS.detroit, '1 case napkins');
    assert.equal((await updates(IDS.greektown)).notifications.length, 0);
  });

  let matchId = '';
  it('a new scrap offer reaches both sides, anonymously', async () => {
    const res = await order(IDS.furniture, IDS.grLumber, FURNITURE_ORDER);
    matchId = res.body.scrapOffers[0].matchId;
    const holder = (await updates(IDS.furniture)).notifications[0];
    assert.equal(holder.kind, 'scrap_offer');
    assert.match(holder.body, /about 114 lbs of wood offcuts and sawdust/);
    assert.match(holder.body, /A farm \d+ mi away/);
    assert.ok(!holder.body.includes('Kent'));
    const farm = (await updates(IDS.kentFarm)).notifications[0];
    assert.equal(farm.kind, 'scrap_requested');
    assert.match(farm.body, /A manufacturer \d+ mi away expects about 114 lbs/);
    assert.ok(!/Lakeshore|2x4|Plywood/.test(farm.body));
  });

  it('no deal details are shown before acceptance', async () => {
    const [offer] = (await api('GET', '/scrap-offers', { as: IDS.kentFarm })).body;
    assert.equal(offer.deal, undefined);
  });

  it('acceptance tells the requester what, how much, where to pick up and who to contact', async () => {
    await api('PUT', `/matches/${matchId}/respond`, { body: { status: 'accepted' }, as: IDS.furniture });
    const farm = (await updates(IDS.kentFarm)).notifications[0];
    assert.equal(farm.kind, 'scrap_accepted');
    assert.equal(farm.title, 'Lakeshore Furniture Works accepted your scrap request');
    assert.match(farm.body, /≈ \$6\.38/); // 114 lb × $0.056
    assert.match(farm.body, /Pick it up at Lakeshore Furniture Works, Grand Rapids/);
    assert.match(farm.body, /orders@lakeshorefurniture\.example\.com/);

    const holder = (await updates(IDS.furniture)).notifications[0];
    assert.equal(holder.title, 'Deal confirmed with Kent County Pastures');

    for (const as of [IDS.kentFarm, IDS.furniture]) {
      const [offer] = (await api('GET', '/scrap-offers', { as })).body;
      assert.equal(offer.deal.pickupFrom, 'Lakeshore Furniture Works, Grand Rapids');
      assert.equal(offer.deal.total, 6.38);
    }
    const [farmOffer] = (await api('GET', '/scrap-offers', { as: IDS.kentFarm })).body;
    assert.equal(farmOffer.deal.counterpartyName, 'Lakeshore Furniture Works');
    const [holderOffer] = (await api('GET', '/scrap-offers', { as: IDS.furniture })).body;
    assert.equal(holderOffer.deal.counterpartyName, 'Kent County Pastures');
  });

  it('a declined offer tells the requester its request is still open', async () => {
    const res = await order(IDS.contractor, IDS.grLumber, '50 2x4s');
    const offer = res.body.scrapOffers[0];
    await api('PUT', `/matches/${offer.matchId}/respond`, { body: { status: 'declined' }, as: IDS.contractor });
    // The nearest farm to a Detroit contractor is one of the two Ann Arbor-area farms.
    const notes = [...(await updates(IDS.washtenawFarm)).notifications, ...(await updates('biz-sunrise-farm-01')).notifications];
    const declined = notes.find((n) => n.kind === 'scrap_declined');
    assert.ok(declined, 'the Detroit-area farm that requested it is told');
    assert.match(declined!.body, /still open/);
  });

  it('closing the pool tells every member what they paid and saved', async () => {
    await api('POST', `/pools/${IDS.detroitPool}/close`);
    const g = (await updates(IDS.greektown)).notifications[0];
    assert.equal(g.kind, 'pool_closed');
    assert.match(g.body, /charged \$99\.00 and saved \$45\.00/);
    assert.match(g.body, /one delivery with 2 other local businesses/);
    assert.equal((await updates(IDS.corktown)).notifications[0].kind, 'pool_closed');
  });

  it('marking read clears only that business', async () => {
    const before = (await updates(IDS.corktown)).unreadCount;
    assert.ok(before > 0);
    assert.deepEqual((await api('POST', '/notifications/read', { as: IDS.corktown })).body, { ok: true });
    assert.equal((await updates(IDS.corktown)).unreadCount, 0);
    assert.ok((await updates(IDS.midtown)).unreadCount > 0);
  });

  it('reset clears all updates', async () => {
    await api('POST', '/demo/reset');
    assert.equal((await updates(IDS.kentFarm)).notifications.length, 0);
  });
});
