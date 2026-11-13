'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiError, listingsApi, matchesApi, businessApi } from '../api';

type Listing = {
  id: string;
  businessName: string;
  type: 'offering' | 'requesting';
  materialCategory: string;
  title: string;
  description: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  location: { city: string; state: string };
  status: string;
};

type Match = {
  id: string;
  offeringBusiness: string;
  requestingBusiness: string;
  material: string;
  compatibilityScore: number;
  aiReasoning: string;
  status: string;
};

type Business = { id: string; name: string };

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 var(--s-4)',
  borderRadius: 'var(--r-sm)',
  border: '1px solid var(--line-strong)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontSize: 'var(--t-body)',
  font: 'inherit',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--t-small)',
  fontWeight: 500,
  color: 'var(--muted)',
  marginBottom: 'var(--s-2)',
};

const materialLabel = (cat: string) =>
  cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function RecyclingExchange() {
  const [requestError, setRequestError] = useState('');
  const [listings, setListings] = useState<Listing[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    businessId: '',
    type: 'offering',
    materialCategory: 'wood_lumber',
    title: '',
    description: '',
    quantity: '',
    unit: 'lbs',
    pricePerUnit: '',
  });

  const load = () =>
    Promise.all([listingsApi.list(), matchesApi.list(), businessApi.list()]).then(
      ([l, m, b]) => { setRequestError(''); setListings(l); setMatches(m); setBusinesses(b); },
    ).catch(() => { setRequestError('Unable to load data. Make sure the backend is running on port 3001, then retry.'); });

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    setRequestError('');
    try {
    e.preventDefault();
    await listingsApi.create({
      ...form,
      quantity: Number(form.quantity),
      pricePerUnit: Number(form.pricePerUnit),
    });
    setShowForm(false);
    load();
    } catch {
      setRequestError('The request could not be completed. Check your connection and try again; your form has been kept.');
    }
  };

  const handleAccept = async (match: Match) => {
    setRequestError('');
    try {
      await matchesApi.respond(match.id, 'accepted');
      load();
    } catch (err) {
      setRequestError(apiError(err, 'The match could not be accepted. Try again.'));
    }
  };

  const [finding, setFinding] = useState(false);
  const [findResult, setFindResult] = useState('');
  const findMatches = async () => {
    setFinding(true); setFindResult(''); setRequestError('');
    try {
      const r = await matchesApi.run();
      setFindResult(r.matched > 0 ? `${r.matched} new match${r.matched === 1 ? '' : 'es'} found.` : 'No new matches right now.');
      load();
    } catch (err) {
      setRequestError(apiError(err, 'Matching could not finish. Try again.'));
    } finally {
      setFinding(false);
    }
  };

  return (
    <>
      {requestError && <div role="alert" className="request-error">{requestError} <button type="button" onClick={() => { void load(); }}>Retry connection</button></div>}
      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <section
        style={{
          paddingTop: 'calc(var(--nav) + 48px)',
          paddingBottom: '40px',
          background: 'var(--bg)',
          minHeight: 'auto',
        }}
      >
        <div style={{ width: 'min(100% - 2 * var(--gut), var(--container))', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-5)', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 'var(--t-h1)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.04, marginBottom: 'var(--s-4)' }}>
                Material exchange
              </h1>
              <p style={{ fontSize: 'var(--t-lead)', color: 'var(--muted)', maxWidth: '52ch' }}>
                Post excess materials or request raw inputs. AI matches compatible Michigan businesses.
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="page-cta"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)',
                height: 'var(--btn-h)', padding: '0 var(--s-5)',
                borderRadius: 'var(--r-btn)', border: '1px solid transparent',
                font: '500 var(--t-body)/1 var(--font-text)',
                background: 'var(--action)', color: 'var(--action-ink)',
                flexShrink: 0,
              }}
            >
              {showForm ? 'Cancel' : 'Post a listing'}
            </button>
          </div>

          {/* New listing form */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              style={{
                marginTop: 'var(--s-7)',
                padding: 'clamp(20px, 4vw, 40px)',
                borderRadius: 'var(--r-lg)',
                border: '1px solid var(--line)',
                background: 'var(--surface)',
              }}
            >
              <h2 style={{ fontSize: 'var(--t-h3)', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 'var(--s-6)' }}>
                Create a listing
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 'var(--s-5)', marginBottom: 'var(--s-5)' }}>
                <div>
                  <label htmlFor="recyclingexchange-field-1" style={labelStyle}>Business</label>
                  <select id="recyclingexchange-field-1" required value={form.businessId} onChange={(e) => setForm({ ...form, businessId: e.target.value })} style={inputStyle}>
                    <option value="">Select…</option>
                    {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="recyclingexchange-field-2" style={labelStyle}>Listing type</label>
                  <select id="recyclingexchange-field-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                    <option value="offering">Offering — I have excess</option>
                    <option value="requesting">Requesting — I need this</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="recyclingexchange-field-3" style={labelStyle}>Material category</label>
                  <select id="recyclingexchange-field-3" value={form.materialCategory} onChange={(e) => setForm({ ...form, materialCategory: e.target.value })} style={inputStyle}>
                    {['wood_lumber', 'metal_scrap', 'plastic', 'cardboard_paper', 'food_byproduct', 'textile', 'other'].map((c) => (
                      <option key={c} value={c}>{materialLabel(c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="recyclingexchange-field-4" style={labelStyle}>Title</label>
                  <input id="recyclingexchange-field-4" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} placeholder="e.g. Excess wood chips — 2 tons/week" />
                </div>
                <div>
                  <label htmlFor="recyclingexchange-field-5" style={labelStyle}>Quantity</label>
                  <input id="recyclingexchange-field-5" type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="recyclingexchange-field-6" style={labelStyle}>Unit</label>
                  <input id="recyclingexchange-field-6" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={inputStyle} placeholder="lbs, tons, pallets…" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="recyclingexchange-field-7" style={labelStyle}>Description</label>
                  <textarea id="recyclingexchange-field-7" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
                    style={{ ...inputStyle, height: 'auto', padding: 'var(--s-3) var(--s-4)', resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
                <button type="submit" className="btn-primary" style={{
                  display: 'inline-flex', alignItems: 'center', height: 'var(--btn-h)', padding: '0 var(--s-5)',
                  borderRadius: 'var(--r-btn)', border: '1px solid transparent',
                  font: '500 var(--t-body)/1 var(--font-text)',
                  background: 'var(--action)', color: 'var(--action-ink)',
                }}>Post listing</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary" style={{
                  display: 'inline-flex', alignItems: 'center', height: 'var(--btn-h)', padding: '0 var(--s-5)',
                  borderRadius: 'var(--r-btn)', border: '1px solid var(--line-strong)',
                  font: '500 var(--t-body)/1 var(--font-text)',
                  background: 'var(--bg)', color: 'var(--ink)',
                }}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── LISTINGS ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '40px 0 64px', background: 'var(--surface)', minHeight: '50svh' }}>
        <div style={{ width: 'min(100% - 2 * var(--gut), var(--container))', margin: '0 auto' }}>
          <div style={{ marginBottom: 'var(--head-gap)' }}>
            <h2 style={{ fontSize: 'var(--t-h2)', fontWeight: 500, letterSpacing: '-0.025em', marginBottom: 'var(--s-3)' }}>Active listings</h2>
          </div>
          {listings.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 'var(--t-body)' }}>No active listings yet. Post one above.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: 'var(--card-gap)' }}>
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── AI MATCHES ───────────────────────────────────────────────────────── */}
      {(
        <section style={{ padding: '40px 0 64px', background: 'var(--bg)', minHeight: matches.length ? '50svh' : undefined }}>
          <div style={{ width: 'min(100% - 2 * var(--gut), var(--container))', margin: '0 auto' }}>
            <div style={{ marginBottom: 'var(--head-gap)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--s-4)', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: 'var(--t-h2)', fontWeight: 500, letterSpacing: '-0.025em', marginBottom: 'var(--s-3)' }}>Suggested matches</h2>
                <p style={{ fontSize: 'var(--t-lead)', color: 'var(--muted)', maxWidth: '52ch' }}>
                  Compares every surplus listing with every request by material and quantity. Accept to begin the exchange.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)' }}>
                <span role="status" style={{ fontSize: 'var(--t-label)', color: 'var(--muted)' }}>{findResult}</span>
                <button
                  type="button"
                  onClick={() => void findMatches()}
                  disabled={finding}
                  className="accept-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', height: 'var(--btn-h)', padding: '0 var(--s-5)',
                    borderRadius: 'var(--r-btn)', border: '1px solid transparent',
                    font: '500 var(--t-body)/1 var(--font-text)',
                    background: 'var(--action)', color: 'var(--action-ink)', opacity: finding ? 0.7 : 1,
                  }}
                >
                  {finding ? 'Checking listings…' : 'Find matches'}
                </button>
              </div>
            </div>
            {matches.length === 0 && (
              <p style={{ fontSize: 'var(--t-body)', color: 'var(--muted)', maxWidth: '64ch', lineHeight: 1.6 }}>
                No suggested matches yet. Click <strong>Find matches</strong> to compare the listings above.
                Scrap offers that SupplyMash spots from orders stay private until the holder accepts. Answer those on the{' '}
                <Link href="/orders" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>Orders</Link> page.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="card-hover"
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 'var(--s-4)',
                    padding: 'var(--s-6)',
                    borderRadius: 'var(--r-lg)',
                    border: '1px solid var(--line)',
                    background: 'var(--surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-4)', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 'var(--t-body)', fontWeight: 500, color: 'var(--ink)' }}>
                      {m.offeringBusiness} → {m.requestingBusiness}
                    </span>
                    <span style={{
                      padding: '3px 10px', borderRadius: 999,
                      background: 'color-mix(in oklab, #246444 15%, transparent)',
                      color: '#246444', fontSize: 'var(--t-label)', fontWeight: 500,
                    }}>
                      {m.compatibilityScore}% match
                    </span>
                  </div>
                  <p style={{ fontSize: 'var(--t-body)', color: 'var(--muted)', lineHeight: 1.6, maxWidth: '72ch' }}>{m.aiReasoning}</p>
                  <div style={{ display: 'flex', gap: 'var(--s-3)', alignItems: 'center', flexWrap: 'wrap' }}>
                    {m.status === 'pending' && (
                      <button
                        onClick={() => handleAccept(m)}
                        className="accept-btn"
                        style={{
                          display: 'inline-flex', alignItems: 'center', height: 'var(--btn-h)', padding: '0 var(--s-5)',
                          borderRadius: 'var(--r-btn)', border: '1px solid transparent',
                          font: '500 var(--t-body)/1 var(--font-text)',
                          background: 'var(--action)', color: 'var(--action-ink)',
                        }}
                      >
                        Accept match →
                      </button>
                    )}
                    <span style={{
                      padding: '3px 10px', borderRadius: 999,
                      border: '1px solid var(--line)',
                      fontSize: 'var(--t-label)', fontWeight: 500,
                      color: m.status === 'accepted' ? '#246444' : 'var(--muted)',
                    }}>
                      {m.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function ListingCard({ listing: l }: { listing: Listing }) {
  return (
    <div
      className="listing-card"
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--s-3)',
        padding: 'var(--s-5)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--line)',
        borderLeft: `3px solid ${l.type === 'offering' ? '#246444' : '#315e86'}`,
        background: 'var(--card)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-3)' }}>
        <span style={{
          padding: '3px 10px', borderRadius: 999, fontSize: 'var(--t-label)', fontWeight: 500,
          background: l.type === 'offering' ? 'color-mix(in oklab, #246444 15%, transparent)' : 'color-mix(in oklab, #315e86 15%, transparent)',
          color: l.type === 'offering' ? '#246444' : '#315e86',
        }}>
          {l.type === 'offering' ? '↑ Offering' : '↓ Requesting'}
        </span>
        <span style={{ fontSize: 'var(--t-small)', color: 'var(--muted)' }}>{materialLabel(l.materialCategory)}</span>
      </div>
      <h3 style={{ fontSize: 'var(--t-body)', fontWeight: 500, color: 'var(--ink)' }}>{l.title}</h3>
      {l.description && <p style={{ fontSize: 'var(--t-small)', color: 'var(--muted)', lineHeight: 1.5 }}>{l.description}</p>}
      <div style={{ display: 'flex', gap: 'var(--s-4)', flexWrap: 'wrap', marginTop: 'var(--s-1)' }}>
        <span style={{ fontSize: 'var(--t-small)', color: 'var(--muted)' }}>{l.location.city}, {l.location.state}</span>
        <span style={{ fontSize: 'var(--t-small)', color: 'var(--muted)' }}>{l.quantity} {l.unit}</span>
        <span style={{
          marginLeft: 'auto', padding: '2px 8px', borderRadius: 999, fontSize: 'var(--t-label)', fontWeight: 500,
          background: l.status === 'active' ? 'color-mix(in oklab, #246444 12%, transparent)' : 'color-mix(in oklab, var(--accent) 12%, transparent)',
          color: l.status === 'active' ? '#246444' : 'var(--accent)',
        }}>{l.status}</span>
      </div>
    </div>
  );
}
