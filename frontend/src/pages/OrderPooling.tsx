import { useEffect, useState } from 'react';
import { orderPoolsApi, businessApi } from '../api';

type PoolMember = { businessId: string; businessName: string; itemDescription: string; quantity: number; unit: string };
type OrderPool = {
  id: string; title: string; supplier: string; category: string;
  members: PoolMember[]; status: string; deadline: string; estimatedSavings: number;
  location: { city: string; state: string };
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
  open:      { bg: 'color-mix(in oklab, #22c55e 15%, transparent)', color: '#22c55e' },
  forming:   { bg: 'color-mix(in oklab, #f59e0b 15%, transparent)', color: '#f59e0b' },
  confirmed: { bg: 'color-mix(in oklab, #3b82f6 15%, transparent)', color: '#3b82f6' },
  delivered: { bg: 'color-mix(in oklab, var(--ink) 10%, transparent)', color: 'var(--muted)' },
};

export default function OrderPooling() {
  const [pools, setPools] = useState<OrderPool[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joinPoolId, setJoinPoolId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({ title: '', supplier: '', category: '', city: '', state: 'MI', zipCode: '', deadline: '' });
  const [joinForm, setJoinForm] = useState({ businessId: '', itemDescription: '', quantity: '', unit: 'units' });

  const load = () =>
    Promise.all([orderPoolsApi.list(), businessApi.list()]).then(([p, b]) => { setPools(p); setBusinesses(b); });

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await orderPoolsApi.create({
      title: createForm.title, supplier: createForm.supplier,
      category: createForm.category, deadline: createForm.deadline,
      location: { city: createForm.city, state: createForm.state, zipCode: createForm.zipCode },
    });
    setShowCreate(false);
    load();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinPoolId) return;
    await orderPoolsApi.join(joinPoolId, { ...joinForm, quantity: Number(joinForm.quantity) });
    setJoinPoolId(null);
    load();
  };

  return (
    <>
      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 'calc(var(--nav) + var(--padt))', paddingBottom: 'var(--padb)', background: 'var(--bg)', minHeight: '40svh' }}>
        <div style={{ width: 'min(100% - 2 * var(--gut), var(--container))', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--s-5)', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 'var(--t-h1)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.04, marginBottom: 'var(--s-4)' }}>
                Local Order Pooling
              </h1>
              <p style={{ fontSize: 'var(--t-lead)', color: 'var(--muted)', maxWidth: '52ch' }}>
                Combine orders with nearby businesses from the same supplier. Split delivery costs, unlock better pricing.
              </p>
            </div>
            <button onClick={() => setShowCreate(!showCreate)} style={btnPrimary}>
              {showCreate ? 'Cancel' : 'Create a pool'}
            </button>
          </div>

          {showCreate && (
            <form onSubmit={handleCreate} style={{ marginTop: 'var(--s-7)', padding: 'var(--s-7)', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', background: 'var(--surface)' }}>
              <h2 style={{ fontSize: 'var(--t-h3)', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 'var(--s-6)' }}>Create order pool</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--s-5)', marginBottom: 'var(--s-5)' }}>
                <div><label style={labelStyle}>Pool title</label><input required value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} style={inputStyle} placeholder="e.g. Detroit cleaning supplies run" /></div>
                <div><label style={labelStyle}>Supplier</label><input required value={createForm.supplier} onChange={(e) => setCreateForm({ ...createForm, supplier: e.target.value })} style={inputStyle} placeholder="e.g. Sysco, Costco Business" /></div>
                <div><label style={labelStyle}>Category</label><input required value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })} style={inputStyle} placeholder="e.g. cleaning supplies" /></div>
                <div><label style={labelStyle}>Order deadline</label><input type="date" required value={createForm.deadline} onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>City</label><input required value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>ZIP code</label><input required value={createForm.zipCode} onChange={(e) => setCreateForm({ ...createForm, zipCode: e.target.value })} style={inputStyle} /></div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
                <button type="submit" style={btnPrimary}>Create pool</button>
                <button type="button" onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* ── POOLS ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding: 'var(--padt) 0 var(--padb)', background: 'var(--surface)', minHeight: '60svh' }}>
        <div style={{ width: 'min(100% - 2 * var(--gut), var(--container))', margin: '0 auto' }}>
          <div style={{ marginBottom: 'var(--head-gap)' }}>
            <h2 style={{ fontSize: 'var(--t-h2)', fontWeight: 500, letterSpacing: '-0.025em' }}>Open pools</h2>
          </div>
          {pools.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 'var(--t-body)' }}>No order pools yet. Create one above to get started.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--card-gap)' }}>
              {pools.map((pool) => {
                const sc = statusColors[pool.status] ?? statusColors.delivered;
                return (
                  <div key={pool.id} style={{ padding: 'var(--s-6)', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', background: 'var(--card)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--s-4)', flexWrap: 'wrap', marginBottom: 'var(--s-4)' }}>
                      <h3 style={{ fontSize: 'var(--t-body)', fontWeight: 500, color: 'var(--ink)' }}>{pool.title}</h3>
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 'var(--t-label)', fontWeight: 500, background: sc.bg, color: sc.color }}>{pool.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--s-5)', flexWrap: 'wrap', marginBottom: 'var(--s-4)' }}>
                      {[
                        ['Supplier', pool.supplier],
                        ['Category', pool.category],
                        ['Location', `${pool.location.city}, ${pool.location.state}`],
                        ['Deadline', pool.deadline],
                        ...(pool.estimatedSavings > 0 ? [['Est. savings', `$${pool.estimatedSavings}/member`]] : []),
                      ].map(([k, v]) => (
                        <div key={k}>
                          <span style={{ fontSize: 'var(--t-label)', color: 'var(--muted)', display: 'block' }}>{k}</span>
                          <span style={{ fontSize: 'var(--t-small)', fontWeight: 500, color: 'var(--ink)' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    {pool.members.length > 0 && (
                      <div style={{ marginBottom: 'var(--s-4)' }}>
                        <p style={{ fontSize: 'var(--t-small)', fontWeight: 500, color: 'var(--muted)', marginBottom: 'var(--s-2)' }}>
                          {pool.members.length} member{pool.members.length !== 1 ? 's' : ''} joined
                        </p>
                        <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-1)' }}>
                          {pool.members.map((m, i) => (
                            <li key={i} style={{ fontSize: 'var(--t-small)', color: 'var(--muted)' }}>
                              {m.businessName}: {m.quantity} {m.unit} of {m.itemDescription}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(pool.status === 'open' || pool.status === 'forming') && (
                      <button onClick={() => setJoinPoolId(pool.id)} style={{ ...btnPrimary, height: 36, padding: '0 var(--s-4)', fontSize: 'var(--t-small)' }}>
                        Join pool →
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
      {joinPoolId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form
            onSubmit={handleJoin}
            style={{ background: 'var(--bg)', borderRadius: 'var(--r-lg)', border: '1px solid var(--line)', padding: 'var(--s-7)', width: 'min(100% - 48px, 480px)', display: 'flex', flexDirection: 'column', gap: 'var(--s-5)' }}
          >
            <h2 style={{ fontSize: 'var(--t-h3)', fontWeight: 500, letterSpacing: '-0.02em' }}>Join order pool</h2>
            <div><label style={labelStyle}>Business</label>
              <select required value={joinForm.businessId} onChange={(e) => setJoinForm({ ...joinForm, businessId: e.target.value })} style={inputStyle}>
                <option value="">Select…</option>
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select></div>
            <div><label style={labelStyle}>What do you need?</label>
              <input required value={joinForm.itemDescription} onChange={(e) => setJoinForm({ ...joinForm, itemDescription: e.target.value })} style={inputStyle} placeholder="e.g. 10 cases paper towels" /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-4)' }}>
              <div><label style={labelStyle}>Quantity</label><input type="number" required value={joinForm.quantity} onChange={(e) => setJoinForm({ ...joinForm, quantity: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>Unit</label><input value={joinForm.unit} onChange={(e) => setJoinForm({ ...joinForm, unit: e.target.value })} style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--s-3)' }}>
              <button type="submit" style={btnPrimary}>Join pool</button>
              <button type="button" onClick={() => setJoinPoolId(null)} style={btnSecondary}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
