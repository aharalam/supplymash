'use client';
import { useEffect, useState } from 'react';
import { warehousesApi, businessApi } from '../api';

type WarehouseMember = { businessId: string; businessName: string; sqFtLeased: number; leaseStartDate: string; leaseEndDate: string };
type Warehouse = {
  id: string; name: string; totalSqFt: number; availableSqFt: number;
  features: string[]; pricePerSqFtPerMonth: number; members: WarehouseMember[];
  status: string; location: { city: string; state: string };
};
type Business = { id: string; name: string };

const inputStyle: React.CSSProperties = {
  width: '100%', height: 44, padding: '0 var(--s-4)',
  borderRadius: 'var(--r-sm)', border: '1px solid var(--line-strong)',
  background: 'var(--surface)', color: 'var(--ink)',
  fontSize: 'var(--t-body)', font: 'inherit', outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--t-small)', fontWeight: 500,
  color: 'var(--muted)', marginBottom: 'var(--s-2)',
};
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', height: 'var(--btn-h)', padding: '0 var(--s-5)',
  borderRadius: 'var(--r-btn)', border: '1px solid transparent',
  font: '500 var(--t-body)/1 var(--font-text)',
  background: 'var(--action)', color: 'var(--action-ink)',
};
const btnSecondary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', height: 'var(--btn-h)', padding: '0 var(--s-5)',
  borderRadius: 'var(--r-btn)', border: '1px solid var(--line-strong)',
  font: '500 var(--t-body)/1 var(--font-text)',
  background: 'var(--bg)', color: 'var(--ink)',
};
const statusColors: Record<string, { bg: string; color: string }> = {
  available: { bg: 'color-mix(in oklab, #246444 15%, transparent)', color: '#246444' },
  partial:   { bg: 'color-mix(in oklab, #88591b 15%, transparent)', color: '#88591b' },
  full:      { bg: 'color-mix(in oklab, #a33e35 15%, transparent)', color: '#a33e35' },
};
const featureLabel = (f: string) => f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const featureOptions = ['refrigerated', 'climate_controlled', 'heavy_equipment', 'drive_in'];

export default function Warehouses() {
  const [requestError, setRequestError] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joinWarehouseId, setJoinWarehouseId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({ name: '', city: '', state: 'MI', zipCode: '', totalSqFt: '', pricePerSqFtPerMonth: '2.50', features: [] as string[] });
  const [joinForm, setJoinForm] = useState({ businessId: '', sqFtLeased: '', leaseStartDate: '', leaseEndDate: '' });

  const load = () =>
    Promise.all([warehousesApi.list(), businessApi.list()]).then(([w, b]) => { setRequestError(''); setWarehouses(w); setBusinesses(b); }).catch(() => { setRequestError('Unable to load data. Make sure the backend is running on port 3001, then retry.'); });

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    setRequestError('');
    try {
    e.preventDefault();
    await warehousesApi.create({
      name: createForm.name, totalSqFt: Number(createForm.totalSqFt),
      pricePerSqFtPerMonth: Number(createForm.pricePerSqFtPerMonth),
      features: createForm.features,
      location: { city: createForm.city, state: createForm.state, zipCode: createForm.zipCode },
    });
    setShowCreate(false);
    load();
    } catch {
      setRequestError('The request could not be completed. Check your connection and try again; your form has been kept.');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    setRequestError('');
    try {
    e.preventDefault();
    if (!joinWarehouseId) return;
    await warehousesApi.join(joinWarehouseId, { ...joinForm, sqFtLeased: Number(joinForm.sqFtLeased) });
    setJoinWarehouseId(null);
    load();
    } catch {
      setRequestError('The request could not be completed. Check your connection and try again; your form has been kept.');
    }
  };

  const toggleFeature = (f: string) =>
    setCreateForm((prev) => ({
      ...prev,
      features: prev.features.includes(f) ? prev.features.filter((x) => x !== f) : [...prev.features, f],
    }));

  return (
    <>
      {requestError && <div role="alert" className="request-error">{requestError} <button type="button" onClick={() => { void load(); }}>Retry connection</button></div>}
      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 'calc(var(--nav) + 48px)', paddingBottom: '40px', background: 'var(--bg)', minHeight: 'auto' }}>
        <div style={{ width: 'min(100% - 2 * var(--gut), var(--container))', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-5)', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 'var(--t-h1)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.04, marginBottom: 'var(--s-4)' }}>
                Shared storage
              </h1>
              <p style={{ fontSize: 'var(--t-lead)', color: 'var(--muted)', maxWidth: '52ch' }}>
                Rent shared neighborhood storage — affordable for farms, retailers, and contractors across Michigan.
              </p>
            </div>
            <button onClick={() => setShowCreate(!showCreate)} style={btnPrimary}>
              {showCreate ? 'Cancel' : 'List a warehouse'}
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} style={{ marginTop: 'var(--s-7)', padding: 'clamp(20px, 4vw, 40px)', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', background: 'var(--surface)' }}>
              <h2 style={{ fontSize: 'var(--t-h3)', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 'var(--s-6)' }}>List a warehouse</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 'var(--s-5)', marginBottom: 'var(--s-5)' }}>
                <div><label htmlFor="warehouses-field-1" style={labelStyle}>Name</label><input id="warehouses-field-1" required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} style={inputStyle} /></div>
                <div><label htmlFor="warehouses-field-2" style={labelStyle}>City</label><input id="warehouses-field-2" required value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} style={inputStyle} /></div>
                <div><label htmlFor="warehouses-field-3" style={labelStyle}>ZIP code</label><input id="warehouses-field-3" required value={createForm.zipCode} onChange={(e) => setCreateForm({ ...createForm, zipCode: e.target.value })} style={inputStyle} /></div>
                <div><label htmlFor="warehouses-field-4" style={labelStyle}>Total sq ft</label><input id="warehouses-field-4" type="number" required value={createForm.totalSqFt} onChange={(e) => setCreateForm({ ...createForm, totalSqFt: e.target.value })} style={inputStyle} /></div>
                <div><label htmlFor="warehouses-field-5" style={labelStyle}>Price / sq ft / month ($)</label><input id="warehouses-field-5" type="number" step="0.01" value={createForm.pricePerSqFtPerMonth} onChange={(e) => setCreateForm({ ...createForm, pricePerSqFtPerMonth: e.target.value })} style={inputStyle} /></div>
                <div>
                  <label style={labelStyle}>Features</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-3)', paddingTop: 'var(--s-2)' }}>
                    {featureOptions.map((f) => (
                      <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-2)', fontSize: 'var(--t-small)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={createForm.features.includes(f)} onChange={() => toggleFeature(f)} />
                        {featureLabel(f)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
                <button type="submit" style={btnPrimary}>List warehouse</button>
                <button type="button" onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── WAREHOUSES ────────────────────────────────────────────────────────── */}
      <section style={{ padding: '40px 0 64px', background: 'var(--surface)', minHeight: 'auto' }}>
        <div style={{ width: 'min(100% - 2 * var(--gut), var(--container))', margin: '0 auto' }}>
          <div style={{ marginBottom: 'var(--head-gap)' }}>
            <h2 style={{ fontSize: 'var(--t-h2)', fontWeight: 500, letterSpacing: '-0.025em' }}>Available spaces</h2>
          </div>
          {warehouses.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 'var(--t-body)' }}>No warehouses listed yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: 'var(--card-gap)' }}>
              {warehouses.map((w) => {
                const sc = statusColors[w.status] ?? statusColors.full;
                return (
                  <div key={w.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)', padding: 'var(--s-6)', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', background: 'var(--card)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-3)' }}>
                      <h3 style={{ fontSize: 'var(--t-body)', fontWeight: 500, color: 'var(--ink)' }}>{w.name}</h3>
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 'var(--t-label)', fontWeight: 500, background: sc.bg, color: sc.color }}>{w.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--s-5)', flexWrap: 'wrap' }}>
                      {[
                        ['Location', `${w.location.city}, ${w.location.state}`],
                        ['Available', `${w.availableSqFt.toLocaleString()} / ${w.totalSqFt.toLocaleString()} sq ft`],
                        ['Rate', `$${w.pricePerSqFtPerMonth}/sq ft/mo`],
                      ].map(([k, v]) => (
                        <div key={k as string}>
                          <span style={{ fontSize: 'var(--t-label)', color: 'var(--muted)', display: 'block' }}>{k}</span>
                          <span style={{ fontSize: 'var(--t-small)', fontWeight: 500, color: 'var(--ink)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    {w.features.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s-2)' }}>
                        {w.features.map((f) => (
                          <span key={f} style={{ padding: '3px 10px', borderRadius: 999, border: '1px solid var(--line)', fontSize: 'var(--t-label)', color: 'var(--muted)' }}>
                            {featureLabel(f)}
                          </span>
                        ))}
                      </div>
                    )}
                    <p style={{ fontSize: 'var(--t-small)', color: 'var(--muted)' }}>
                      {w.members.length} tenant{w.members.length !== 1 ? 's' : ''}
                    </p>
                    {w.status !== 'full' && (
                      <button onClick={() => setJoinWarehouseId(w.id)} style={{ ...btnPrimary, height: 36, padding: '0 var(--s-4)', fontSize: 'var(--t-small)', alignSelf: 'flex-start' }}>
                        Rent space →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Join modal */}
      {joinWarehouseId && (
        <div style={{ position: 'fixed', inset: 0, padding: 16, overflowY: 'auto', background: 'rgba(15,35,27,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={handleJoin} style={{ background: 'var(--bg)', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', padding: 'clamp(20px, 4vw, 40px)', width: 'min(100% - 48px, 480px)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}>
            <h2 style={{ fontSize: 'var(--t-h3)', fontWeight: 500, letterSpacing: '-0.02em' }}>Rent storage space</h2>
            <div><label htmlFor="warehouses-field-6" style={labelStyle}>Business</label>
              <select id="warehouses-field-6" required value={joinForm.businessId} onChange={(e) => setJoinForm({ ...joinForm, businessId: e.target.value })} style={inputStyle}>
                <option value="">Select…</option>
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select></div>
            <div><label htmlFor="warehouses-field-7" style={labelStyle}>Square feet needed</label><input id="warehouses-field-7" type="number" required value={joinForm.sqFtLeased} onChange={(e) => setJoinForm({ ...joinForm, sqFtLeased: e.target.value })} style={inputStyle} /></div>
            <div><label htmlFor="warehouses-field-8" style={labelStyle}>Lease start</label><input id="warehouses-field-8" type="date" required value={joinForm.leaseStartDate} onChange={(e) => setJoinForm({ ...joinForm, leaseStartDate: e.target.value })} style={inputStyle} /></div>
            <div><label htmlFor="warehouses-field-9" style={labelStyle}>Lease end</label><input id="warehouses-field-9" type="date" required value={joinForm.leaseEndDate} onChange={(e) => setJoinForm({ ...joinForm, leaseEndDate: e.target.value })} style={inputStyle} /></div>
            <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
              <button type="submit" style={btnPrimary}>Confirm lease</button>
              <button type="button" onClick={() => setJoinWarehouseId(null)} style={btnSecondary}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
