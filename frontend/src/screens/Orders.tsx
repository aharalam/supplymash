'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  apiError, businessApi, demoApi, metricsApi, notificationsApi, ordersApi, poolsApi, scrapOffersApi, suppliersApi,
} from '../api';
import type {
  BusinessSummary, ClosePoolResponse, CreateOrderResponse, Invoice, Metrics, NotificationFeed, OrderLine, OrderWithPool,
  PoolOperatorView, PoolView, ScrapOffer, Supplier,
} from '../api/types';
import { usePersona } from '../persona';

// ── Formatting ────────────────────────────────────────────────────────────────

const usdFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const usd = (n: number | undefined) => (n === undefined ? '—' : usdFormat.format(n));
const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const PLACEHOLDER_BY_CATEGORY: Record<string, string> = {
  lumber: 'e.g. 60 2x4s and 10 sheets of plywood',
  animal_feed: 'e.g. 10 bags of corn feed and 5 bags of fertilizer',
};

/** Sub-dollar unit prices need 3 decimals ($0.056/lb, not $0.06/lbs). */
const perUnit = (n: number) => (n < 1 ? `$${n.toFixed(3)}` : usdFormat.format(n));
const unitOne = (u: string) => u.replace(/s$/, '');
const lineText = (l: OrderLine) => `${l.qty} ${l.unit}${l.qty === 1 ? '' : 's'} · ${l.name}`;

const INVOICE_STATUS: Record<Invoice['status'], { label: string; tone: string }> = {
  succeeded: { label: 'Charged', tone: 'good' },
  mock_succeeded: { label: 'Charged (test mock)', tone: 'good' },
  failed: { label: 'Card declined', tone: 'bad' },
};

function GraniteTag({ children = 'Powered by watsonx.ai Granite' }: { children?: string }) {
  return <span className="ai-tag">{children}</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Orders() {
  const persona = usePersona();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [version, setVersion] = useState(0); // bump after any change to refetch
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const [resetNote, setResetNote] = useState('');

  useEffect(() => {
    businessApi.summaries().then(setBusinesses).catch(() => setBusinesses([]));
  }, [version]);

  const viewer = businesses.find((b) => b.id === persona);

  async function resetDemo() {
    setResetNote('');
    try { await demoApi.reset(); setResetNote('Demo data reset.'); refresh(); }
    catch (err) { setResetNote(apiError(err)); }
  }

  return (
    <div className="workspace orders-page">
      <header className="workspace-heading">
        <div>
          <h1>{persona ? 'Order supplies' : 'Pools to close'}</h1>
          <p>
            {persona
              ? `Ordering as ${viewer?.name ?? 'a business'} — name your usual supplier and SupplyMash pools it with nearby orders.`
              : 'Operator view. Close a pool to send one purchase order to the supplier and charge each business its share.'}
          </p>
        </div>
      </header>

      <MetricsStrip version={version} />

      {persona
        ? <BusinessView key={persona} persona={persona} viewer={viewer} version={version} onChange={refresh} />
        : <OperatorView businesses={businesses} version={version} onChange={refresh} />}

      <footer className="demo-tools">
        <button type="button" className="quiet-button" onClick={() => void resetDemo()}>Reset demo data</button>
        <span role="status">{resetNote}</span>
      </footer>
    </div>
  );
}

// ── Metrics strip ─────────────────────────────────────────────────────────────

function MetricsStrip({ version }: { version: number }) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    metricsApi.get().then((m) => { setMetrics(m); setFailed(false); }).catch(() => setFailed(true));
  }, [version]);

  const facts: [string, string, string?][] = [
    ['Dollars saved', usd(metrics?.dollarsSavedClosed),
      metrics ? `+ ${usd(metrics.dollarsSavedProjected)} projected in open pools` : undefined],
    ['Deliveries avoided', metrics ? whole.format(metrics.deliveriesAvoided) : '—'],
    ['Waste diverted', metrics ? `${whole.format(metrics.lbsDiverted)} lbs` : '—'],
    ['Kept in Michigan', usd(metrics?.dollarsKeptInMichigan)],
  ];
  return (
    <section aria-label="Network impact">
      <dl className="overview-facts metrics-strip">
        {facts.map(([label, value, note]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd>{note && <p className="fact-note">{note}</p>}</div>
        ))}
      </dl>
      {failed && <p className="inline-error" role="alert">Impact figures are unavailable right now.</p>}
    </section>
  );
}

// ── Pool progress ─────────────────────────────────────────────────────────────

function PoolProgress({ pool }: { pool: Pick<PoolView, 'progressPct' | 'nextMilestone' | 'memberCount' | 'status'> }) {
  const pct = Math.max(0, Math.min(100, pool.progressPct));
  return (
    <div className="pool-progress">
      <div className="pool-progress__meta">
        <span>{pool.memberCount} business{pool.memberCount === 1 ? '' : 'es'} in this pool</span>
        <span>
          {pool.nextMilestone
            ? `${pool.nextMilestone.label} · ${usd(pool.nextMilestone.amountNeeded)} to go`
            : pool.status === 'closed' ? 'Pool closed' : 'Free delivery reached'}
        </span>
      </div>
      <div className="pool-progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to free delivery">
        <div className="pool-progress__fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SavingsRow({ solo, pooled, savings }: { solo?: number; pooled?: number; savings?: number }) {
  return (
    <dl className="savings-row">
      <div><dt>Ordering alone</dt><dd>{usd(solo)}</dd></div>
      <div><dt>Pooled</dt><dd>{usd(pooled)}</dd></div>
      <div className="savings-row__win"><dt>You save</dt><dd>{usd(savings)}</dd></div>
    </dl>
  );
}

// ── Business view ─────────────────────────────────────────────────────────────

function BusinessView({ persona, viewer, version, onChange }: {
  persona: string; viewer?: BusinessSummary; version: number; onChange: () => void;
}) {
  const [result, setResult] = useState<CreateOrderResponse | null>(null);
  const [offers, setOffers] = useState<ScrapOffer[] | null>(null);
  const [offersError, setOffersError] = useState('');
  const [openPools, setOpenPools] = useState<PoolView[]>([]);
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  useEffect(() => {
    notificationsApi.list().then(setFeed).catch(() => setFeed(null));
    scrapOffersApi.list().then((o) => { setOffers(o); setOffersError(''); }).catch((err) => setOffersError(apiError(err)));
    poolsApi.listForViewer()
      .then((p) => setOpenPools(p.filter((pool) => pool.status === 'open' && !pool.yourOrderId)))
      .catch(() => setOpenPools([]));
  }, [version]);
  // The order card shows each offer's latest status (e.g. after it was answered in the inbox).
  const latest = (o: ScrapOffer) => offers?.find((x) => x.matchId === o.matchId) ?? o;

  return (
    <div className="business-grid">
      <div className="business-grid__main">
        <PlaceOrder persona={persona} viewer={viewer} onPlaced={(r) => { setResult(r); onChange(); }} />
        {result && <OrderResult result={{ ...result, scrapOffers: result.scrapOffers.map(latest) }} onChange={onChange} />}
        <MyOrders version={version} />
      </div>
      <aside className="business-grid__side">
        {feed && feed.notifications.length > 0 && <Updates feed={feed} onRead={onChange} />}
        {openPools.length > 0 && <OpenPools pools={openPools} />}
        <ScrapInbox offers={offers} error={offersError} onChange={onChange} />
      </aside>
    </div>
  );
}

const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : new Date(iso).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' });
};

function Updates({ feed, onRead }: { feed: NotificationFeed; onRead: () => void }) {
  const [busy, setBusy] = useState(false);
  async function markRead() {
    setBusy(true);
    try { await notificationsApi.markAllRead(); onRead(); } finally { setBusy(false); }
  }
  return (
    <section className="updates" aria-labelledby="updates-title">
      <div className="workspace-section-title">
        <h2 id="updates-title">Updates</h2>
        {feed.unreadCount > 0 && <span className="count-label count-label--new">{feed.unreadCount} new</span>}
      </div>
      <ul className="update-list">
        {feed.notifications.slice(0, 6).map((n) => (
          <li key={n.id} className={`update update--${n.kind}${n.read ? '' : ' update--unread'}`}>
            <p className="update__title">{n.title}</p>
            <p className="update__body">{n.body}</p>
            <p className="update__time">{timeAgo(n.createdAt)}</p>
          </li>
        ))}
      </ul>
      {feed.unreadCount > 0 && (
        <button type="button" className="quiet-button" disabled={busy} onClick={() => void markRead()}>Mark all as read</button>
      )}
    </section>
  );
}

function OpenPools({ pools }: { pools: PoolView[] }) {
  return (
    <section className="open-pools" aria-labelledby="open-pools-title">
      <div className="workspace-section-title"><h2 id="open-pools-title">Open pools near you</h2></div>
      <p className="field-hint">
        Nearby businesses are already ordering from your usual suppliers. Order from one to join. Who they are and what they buy stays private.
      </p>
      {pools.map((p) => (
        <article key={p.id} className="open-pool">
          <h3>{p.supplierName}</h3>
          <PoolProgress pool={p} />
          <p className="field-hint">Closes {shortDate(p.deadline)}</p>
        </article>
      ))}
    </section>
  );
}

function PlaceOrder({ persona, viewer, onPlaced }: {
  persona: string; viewer?: BusinessSummary; onPlaced: (r: CreateOrderResponse) => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [chosenSupplierId, setSupplierId] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    suppliersApi.list().then(setSuppliers).catch(() => setError('Suppliers could not be loaded. Is the backend running?'));
  }, []);

  // Until the user picks one, preselect the viewer's usual supplier (else the first).
  const usualSupplierId = viewer?.usualSupplierIds?.find((id) => suppliers.some((s) => s.id === id));
  const supplierId = chosenSupplierId || usualSupplierId || suppliers[0]?.id || '';
  const supplier = suppliers.find((s) => s.id === supplierId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const r = await ordersApi.create({ businessId: persona, supplierId, text: text.trim() });
      setText('');
      onPlaced(r);
    } catch (err) {
      setError(apiError(err, 'Your order could not be placed. Your text has been kept; try again.'));
    } finally { setBusy(false); }
  }

  return (
    <section className="order-form-section" aria-labelledby="place-order-title">
      <div className="workspace-section-title"><h2 id="place-order-title">Place an order</h2></div>
      <form className="order-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="order-supplier">Supplier</label>
          <select id="order-supplier" required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            {suppliers.length === 0 && <option value="">Loading suppliers…</option>}
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.location.city}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="order-text">What do you need?</label>
          <textarea
            id="order-text" required rows={3} value={text} onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER_BY_CATEGORY[supplier?.catalog[0]?.category ?? ''] ?? 'e.g. 2 cases Bounty and some napkins'}
          />
          {supplier && (
            <p className="field-hint">
              Carries {supplier.catalog.map((c) => c.name).join(', ')}. Free delivery from {usd(supplier.freeDeliveryMinimum)} per shipment.
            </p>
          )}
        </div>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button type="submit" className="solid-button" disabled={busy || !supplierId || !text.trim()}>
          {busy ? 'Placing order…' : 'Place order'}
        </button>
      </form>
    </section>
  );
}

function OrderResult({ result, onChange }: { result: CreateOrderResponse; onChange: () => void }) {
  const { order, pool, scrapOffers, parsedBy } = result;
  return (
    <section className="order-result" aria-labelledby="order-result-title" aria-live="polite">
      <div className="order-result__head">
        <h2 id="order-result-title">Order added to the {pool.supplierName} pool</h2>
        <span className={`parse-tag parse-tag--${parsedBy}`}>
          {parsedBy === 'granite' ? 'Parsed by watsonx.ai Granite' : 'Parsed by fallback matcher'}
        </span>
      </div>
      <p className="quoted-order">“{order.rawText}”</p>
      <ul className="line-list">
        {order.lines.map((l) => (
          <li key={l.sku}><span>{lineText(l)}</span><span>{usd(l.soloUnitPrice)} each</span></li>
        ))}
      </ul>
      <PoolProgress pool={pool} />
      <SavingsRow solo={pool.yourSoloCost} pooled={pool.yourPooledCost} savings={pool.yourSavings} />
      <p className="field-hint">Pool closes {shortDate(pool.deadline)}. Savings are estimates until the pool closes.</p>
      {scrapOffers.length > 0 && (
        <div className="order-result__offers">
          <h3>This order may leave scrap a neighbor wants</h3>
          {scrapOffers.map((o) => <ScrapOfferCard key={o.matchId} offer={o} onChange={onChange} />)}
        </div>
      )}
    </section>
  );
}

function MyOrders({ version }: { version: number }) {
  const [orders, setOrders] = useState<OrderWithPool[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    ordersApi.mine().then((o) => { setOrders(o); setError(''); }).catch((err) => setError(apiError(err)));
  }, [version]);

  return (
    <section className="my-orders" aria-labelledby="my-orders-title">
      <div className="workspace-section-title"><h2 id="my-orders-title">Your orders</h2></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {orders && orders.length === 0 && <p className="empty-message">No orders yet. Place one above.</p>}
      <ul className="order-list">
        {orders?.map((o) => (
          <li key={o.id} className="order-row">
            <div className="order-row__head">
              <h3>{o.pool.supplierName}</h3>
              <span className={`status-pill status-pill--${o.status}`}>{o.status === 'invoiced' ? 'Invoiced' : 'In pool'}</span>
            </div>
            <p className="order-row__lines">{o.lines.map(lineText).join(' · ')}</p>
            <PoolProgress pool={o.pool} />
            <SavingsRow solo={o.pool.yourSoloCost} pooled={o.pool.yourPooledCost} savings={o.pool.yourSavings} />
            {o.pool.yourInvoice && (
              <p className="field-hint">
                Invoice: {usd(o.pool.yourInvoice.pooledCost)} · {INVOICE_STATUS[o.pool.yourInvoice.status].label}
                {o.pool.yourInvoice.stripePaymentIntentId && <> · <code>{o.pool.yourInvoice.stripePaymentIntentId}</code></>}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Scrap offers ──────────────────────────────────────────────────────────────

function ScrapInbox({ offers, error, onChange }: { offers: ScrapOffer[] | null; error: string; onChange: () => void }) {

  const pending = offers?.filter((o) => o.role === 'holder' && o.status === 'pending').length ?? 0;
  return (
    <section className="review-panel scrap-inbox" aria-labelledby="scrap-title">
      <div className="workspace-section-title">
        <h2 id="scrap-title">Scrap offers</h2>
        <span className="count-label">{offers ? `${pending} to review` : '—'}</span>
      </div>
      <p>From what you buy, SupplyMash spots scrap a nearby business has asked for. Nothing is shared until you accept.</p>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {offers && offers.length === 0 && <p className="empty-message">No scrap offers right now.</p>}
      {offers?.map((o) => <ScrapOfferCard key={o.matchId} offer={o} onChange={onChange} />)}
    </section>
  );
}

function ScrapOfferCard({ offer, onChange }: { offer: ScrapOffer; onChange: () => void }) {
  const [response, setStatus] = useState<ScrapOffer['status'] | null>(null);
  const status = response ?? offer.status; // our answer wins until the server reflects it
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function respond(next: 'accepted' | 'declined') {
    setBusy(true); setError('');
    try { await scrapOffersApi.respond(offer.matchId, next); setStatus(next); onChange(); }
    catch (err) { setError(apiError(err, 'Your response could not be saved. Try again.')); }
    finally { setBusy(false); }
  }

  const value = offer.estQty * offer.suggestedPricePerUnit;
  return (
    <article className="scrap-offer">
      <div className="scrap-offer__head">
        <h3>{offer.material}</h3>
        <span className={`status-pill status-pill--${status}`}>{status}</span>
      </div>
      <p className="scrap-offer__facts">
        {offer.role === 'holder' ? 'You hold' : 'You requested'} ~{whole.format(offer.estQty)} {offer.unit} · ready in {offer.readyInDays} day{offer.readyInDays === 1 ? '' : 's'}
        <br />
        {perUnit(offer.suggestedPricePerUnit)}/{unitOne(offer.unit)} suggested (≈ {usd(value)}) · {offer.counterpartyLabel}
      </p>
      <blockquote className="ai-reasoning">
        <p>{offer.aiReasoning}</p>
        {offer.reasoningBy === 'granite' && <GraniteTag />}
      </blockquote>
      {offer.role === 'holder' && status === 'pending' && (
        <div className="scrap-offer__actions">
          <button type="button" className="solid-button" disabled={busy} onClick={() => void respond('accepted')}>Accept and sell</button>
          <button type="button" className="outline-button" disabled={busy} onClick={() => void respond('declined')}>Decline</button>
        </div>
      )}
      {offer.deal && (
        <dl className="scrap-deal">
          <div><dt>{offer.role === 'holder' ? 'Buyer' : 'Seller'}</dt><dd>{offer.deal.counterpartyName}</dd></div>
          <div><dt>Contact</dt><dd><a href={`mailto:${offer.deal.counterpartyEmail}`}>{offer.deal.counterpartyEmail}</a></dd></div>
          <div><dt>Pickup</dt><dd>{offer.role === 'holder' ? 'They collect from you' : offer.deal.pickupFrom}</dd></div>
          <div><dt>Total</dt><dd>{usd(offer.deal.total)}</dd></div>
        </dl>
      )}
      {offer.role === 'requester' && status === 'declined' && (
        <p className="field-hint">The holder passed on this one. Your request is still open.</p>
      )}
      {offer.role === 'requester' && status === 'pending' && (
        <p className="field-hint">Waiting for them to accept. You'll get an update here, and you pick it up once they say yes.</p>
      )}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </article>
  );
}

// ── Operator view ─────────────────────────────────────────────────────────────

function OperatorView({ businesses, version, onChange }: {
  businesses: BusinessSummary[]; version: number; onChange: () => void;
}) {
  const [pools, setPools] = useState<PoolOperatorView[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    poolsApi.listForOperator().then((p) => { setPools(p); setError(''); }).catch((err) => setError(apiError(err)));
  }, [version]);

  const nameFor = (id: string) => businesses.find((b) => b.id === id)?.name ?? id;
  return (
    <section aria-labelledby="operator-pools-title">
      <div className="workspace-section-title"><h2 id="operator-pools-title">Supplier pools</h2></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      {pools && pools.length === 0 && <p className="empty-message">No pools yet.</p>}
      <div className="operator-pools">
        {pools?.map((p) => <OperatorPool key={p.id} pool={p} nameFor={nameFor} onChange={onChange} />)}
      </div>
    </section>
  );
}

function OperatorPool({ pool, nameFor, onChange }: {
  pool: PoolOperatorView; nameFor: (id: string) => string; onChange: () => void;
}) {
  const [closed, setClosed] = useState<ClosePoolResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const po = closed?.purchaseOrder ?? pool.purchaseOrder;
  const invoices = closed?.invoices ?? pool.invoices;
  const isClosed = pool.status === 'closed' || closed !== null;

  async function close() {
    setBusy(true); setError('');
    try { setClosed(await poolsApi.close(pool.id)); onChange(); }
    catch (err) { setError(apiError(err, 'The pool could not be closed. Try again.')); }
    finally { setBusy(false); }
  }

  return (
    <article className="operator-pool">
      <div className="operator-pool__head">
        <div>
          <h3>{pool.supplierName}</h3>
          <p className="quiet-label">Deadline {shortDate(pool.deadline)} · subtotal {usd(pool.subtotal)}</p>
        </div>
        <span className={`status-pill status-pill--${isClosed ? 'closed' : 'open'}`}>{isClosed ? 'Closed' : 'Open'}</span>
      </div>
      <PoolProgress pool={{ ...pool, status: isClosed ? 'closed' : pool.status }} />

      <div className="table-scroll">
        <table className="data-table">
          <thead><tr><th scope="col">Business</th><th scope="col">Lines</th><th scope="col">Alone</th><th scope="col">Pooled</th><th scope="col">Saves</th></tr></thead>
          <tbody>
            {pool.orders.map((o, i) => (
              <tr key={`${o.businessName}-${i}`}>
                <th scope="row">{o.businessName}</th>
                <td>{o.lines.map(lineText).join(' · ')}</td>
                <td>{usd(o.soloCost)}</td>
                <td>{usd(o.pooledCost)}</td>
                <td className="num-win">{usd(Math.max(0, o.soloCost - o.pooledCost))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isClosed && (
        <div className="operator-pool__actions">
          <button type="button" className="solid-button" disabled={busy} onClick={() => void close()}>
            {busy ? 'Charging and closing…' : 'Close pool'}
          </button>
          <p className="field-hint">Charges each business first, then sends one purchase order to the supplier.</p>
        </div>
      )}
      {error && <p className="inline-error" role="alert">{error}</p>}

      {po && (
        <div className="po-block">
          <h4>Purchase order</h4>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Unit price</th><th scope="col">Line total</th></tr></thead>
              <tbody>
                {po.lines.map((l) => (
                  <tr key={l.sku}><th scope="row">{l.name}</th><td>{l.qty}</td><td>{usd(l.unitPrice)}</td><td>{usd(l.qty * l.unitPrice)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr><th scope="row" colSpan={3}>Subtotal</th><td>{usd(po.subtotal)}</td></tr>
                <tr><th scope="row" colSpan={3}>Delivery</th><td>{po.deliveryFee === 0 ? 'Free' : usd(po.deliveryFee)}</td></tr>
                <tr><th scope="row" colSpan={3}>Total</th><td>{usd(po.total)}</td></tr>
              </tfoot>
            </table>
          </div>
          <div className="email-preview">
            <div className="email-preview__head"><span>Email to supplier</span>{po.emailBy === 'granite' && <GraniteTag>Greeting drafted by watsonx.ai Granite</GraniteTag>}</div>
            <pre>{po.emailText}</pre>
          </div>
        </div>
      )}

      {invoices && invoices.length > 0 && (
        <div className="po-block">
          <h4>Invoices</h4>
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th scope="col">Business</th><th scope="col">Charged</th><th scope="col">Saved</th><th scope="col">Stripe payment</th><th scope="col">Status</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.orderId}>
                    <th scope="row">{nameFor(inv.businessId)}</th>
                    <td>{usd(inv.pooledCost)}</td>
                    <td className="num-win">{usd(inv.savings)}</td>
                    <td><code>{inv.stripePaymentIntentId ?? '—'}</code></td>
                    <td><span className={`status-pill status-pill--${INVOICE_STATUS[inv.status].tone}`}>{INVOICE_STATUS[inv.status].label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
}
