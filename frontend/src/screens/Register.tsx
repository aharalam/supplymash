'use client';
import { useState } from 'react';
import { businessApi } from '../api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Feature = 'recycling_exchange' | 'order_pooling' | 'micro_warehouse';

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

export default function Register() {
  const [requestError, setRequestError] = useState('');
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', type: 'factory', city: '', state: 'MI', zipCode: '',
    contactEmail: '', description: '',
    enrolledFeatures: [] as Feature[],
  });
  const [success, setSuccess] = useState(false);

  const featureOptions: { value: Feature; title: string; desc: string }[] = [
    { value: 'recycling_exchange', title: 'Recycling Exchange', desc: 'Post excess materials and find raw inputs from nearby businesses.' },
    { value: 'order_pooling', title: 'Order Pooling', desc: 'Combine orders to share delivery costs and unlock better pricing.' },
    { value: 'micro_warehouse', title: 'Micro-Warehouses', desc: 'Access affordable shared storage in your neighborhood.' },
  ];

  const toggleFeature = (f: Feature) =>
    setForm((prev) => ({
      ...prev,
      enrolledFeatures: prev.enrolledFeatures.includes(f)
        ? prev.enrolledFeatures.filter((x) => x !== f)
        : [...prev.enrolledFeatures, f],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    setRequestError('');
    try {
    e.preventDefault();
    await businessApi.create({
      name: form.name, type: form.type,
      location: { city: form.city, state: form.state, zipCode: form.zipCode },
      contactEmail: form.contactEmail, description: form.description,
      enrolledFeatures: form.enrolledFeatures,
    });
    setSuccess(true);
    setTimeout(() => router.push('/'), 2000);
    } catch {
      setRequestError('The request could not be completed. Check your connection and try again; your form has been kept.');
    }
  };

  if (success) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80svh', paddingTop: 'var(--nav)', gap: 'var(--s-5)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 'var(--r-md)', background: 'color-mix(in oklab, #246444 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#246444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        </div>
        <h2 style={{ fontSize: 'var(--t-h2)', fontWeight: 500, letterSpacing: '-0.025em', textAlign: 'center' }}>You're registered</h2>
        <p style={{ fontSize: 'var(--t-lead)', color: 'var(--muted)', textAlign: 'center' }}>Redirecting to the network…</p>
      </div>
    );
  }

  return (
    <section style={{ paddingTop: 'calc(var(--nav) + 48px)', paddingBottom: 'var(--s-10)', background: 'var(--bg)', minHeight: '100svh' }}>
      <div style={{ width: 'min(100% - 2 * var(--gut), var(--container))', margin: '0 auto' }}>
        {/* split: hero left, form right */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', columnGap: 'var(--gutter)', alignItems: 'start' }}>

          {/* left: copy */}
          <div style={{ position: 'relative', top: 0 }}>
            <h1 style={{ fontSize: 'var(--t-h1)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.04, marginBottom: 'var(--s-5)' }}>
              Join the Michigan supply network
            </h1>
            <p style={{ fontSize: 'var(--t-lead)', color: 'var(--muted)', lineHeight: 1.5, marginBottom: 'var(--s-6)', maxWidth: '44ch' }}>
              Register once to access recycling exchanges, shared order pools, and neighborhood warehouse space. Free to join.
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)', marginBottom: 'var(--s-7)' }}>
              {[
                'Exchange materials with local businesses',
                'Combine orders to share delivery costs',
                'Find shared warehouse space',
              ].map((item) => (
                <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--s-3)', fontSize: 'var(--t-body)', color: 'var(--muted)' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'color-mix(in oklab, var(--accent) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 6l3 3 5-5"/>
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/"
              style={{ fontSize: 'var(--t-small)', color: 'var(--muted)', textDecoration: 'underline', textDecorationColor: 'color-mix(in oklab, var(--ink) 20%, transparent)', textUnderlineOffset: 4 }}
            >
              ← Back to network
            </Link>
          </div>

          {/* right: form */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: 'clamp(20px, 4vw, 40px)',
              borderRadius: 'var(--r-lg)',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              display: 'flex', flexDirection: 'column', gap: 'var(--s-6)',
            }}
          >
            {requestError && <p role="alert" className="network-error">{requestError}</p>}
            {/* Business info */}
            <div>
              <h2 style={{ fontSize: 'var(--t-h3)', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 'var(--s-5)' }}>Business information</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 'var(--s-5)' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="register-field-1" style={labelStyle}>Business name *</label>
                  <input id="register-field-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Great Lakes Lumber Co." />
                </div>
                <div>
                  <label htmlFor="register-field-2" style={labelStyle}>Business type *</label>
                  <select id="register-field-2" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inputStyle}>
                    {['factory', 'farm', 'construction', 'restaurant', 'retailer', 'manufacturer', 'other'].map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="register-field-3" style={labelStyle}>Contact email *</label>
                  <input id="register-field-3" required type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="register-field-4" style={labelStyle}>City *</label>
                  <input id="register-field-4" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label htmlFor="register-field-5" style={labelStyle}>ZIP code *</label>
                  <input id="register-field-5" required value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="register-field-6" style={labelStyle}>Description</label>
                  <textarea id="register-field-6"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    style={{ ...inputStyle, height: 'auto', padding: 'var(--s-3) var(--s-4)', resize: 'vertical' }}
                    placeholder="What your business produces, buys, or needs regularly."
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <h2 style={{ fontSize: 'var(--t-h3)', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 'var(--s-2)' }}>Select programs</h2>
              <p style={{ fontSize: 'var(--t-small)', color: 'var(--muted)', marginBottom: 'var(--s-5)' }}>
                Choose which SupplyMash programs to enroll in. You can join all three.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                {featureOptions.map((f) => {
                  const checked = form.enrolledFeatures.includes(f.value);
                  return (
                    <label
                      key={f.value}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 'var(--s-4)',
                        padding: 'var(--s-5)',
                        borderRadius: 'var(--r-md)',
                        border: `1px solid ${checked ? 'var(--accent)' : 'var(--line)'}`,
                        background: checked ? 'color-mix(in oklab, var(--accent) 7%, var(--bg))' : 'var(--bg)',
                        cursor: 'pointer',
                        transition: 'border-color 150ms, background 150ms',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeature(f.value)}
                        style={{ marginTop: 3, flexShrink: 0 }}
                      />
                      <div>
                        <p style={{ fontSize: 'var(--t-body)', fontWeight: 500, color: 'var(--ink)', marginBottom: 'var(--s-1)' }}>{f.title}</p>
                        <p style={{ fontSize: 'var(--t-small)', color: 'var(--muted)' }}>{f.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 'var(--btn-h)', padding: '0 var(--s-5)',
                borderRadius: 'var(--r-btn)', border: '1px solid transparent',
                font: '500 var(--t-body)/1 var(--font-text)',
                background: 'var(--action)', color: 'var(--action-ink)',
                width: '100%',
              }}
            >
              Register business →
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
