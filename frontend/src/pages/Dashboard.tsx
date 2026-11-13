import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { businessApi, listingsApi, matchesApi } from '../api';

interface Stats {
  businesses: number;
  activeListings: number;
  matches: number;
}

interface RecentMatch {
  id: string;
  offeringBusiness: string;
  requestingBusiness: string;
  material: string;
  compatibilityScore: number;
  status: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ businesses: 0, activeListings: 0, matches: 0 });
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([businessApi.list(), listingsApi.list(), matchesApi.list()]).then(
      ([businesses, listings, matches]) => {
        setStats({
          businesses: businesses.length,
          activeListings: listings.length,
          matches: matches.length,
        });
        setRecentMatches(matches.slice(0, 3));
      },
    );
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRunMatching = async () => {
    setLoading(true);
    try {
      const result = await matchesApi.run();
      setRunResult(`${result.matched} new match${result.matched !== 1 ? 'es' : ''} found`);
      loadAll();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── HERO: split ─────────────────────────────────────────────────────── */}
      <section
        data-enter=""
        style={{
          height: '100svh',
          padding: 'calc(var(--nav) + var(--hgap)) 0 var(--hpadb)',
          position: 'relative',
          background: 'var(--bg)',
        }}
      >
        <div
          style={{
            width: 'min(100% - 2 * var(--gut), var(--container))',
            margin: '0 auto',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '5fr 7fr',
            columnGap: 'var(--gutter)',
            alignItems: 'start',
          }}
        >
          {/* left: copy */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)',
                height: 32, padding: '0 var(--s-3)',
                borderRadius: 999, border: '1px solid var(--line)',
                background: 'var(--surface)',
                fontSize: 'var(--t-label)', color: 'var(--muted)',
                marginBottom: 'var(--s-5)', alignSelf: 'flex-start',
              }}
            >
              Michigan DevFest 2026 · 3 businesses active
            </div>

            <h1
              style={{
                fontSize: 'var(--t-h1)', lineHeight: 1.04,
                letterSpacing: '-0.03em', fontWeight: 500,
                marginBottom: 'var(--s-5)',
              }}
            >
              Business resource network for Michigan
            </h1>

            <p
              style={{
                fontSize: 'var(--t-lead)', lineHeight: 1.5, color: 'var(--muted)',
                maxWidth: '44ch', marginBottom: 'var(--s-6)',
              }}
            >
              Post excess materials, join order pools, and share warehouse space. SupplyMash matches nearby businesses so waste becomes supply.
            </p>

            <div style={{ display: 'flex', gap: 'var(--s-3)', flexWrap: 'wrap' }}>
              <Link
                to="/register"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)',
                  height: 'var(--btn-h)', padding: '0 var(--s-5)',
                  borderRadius: 'var(--r-btn)', border: '1px solid transparent',
                  font: '500 var(--t-body)/1 var(--font-text)',
                  background: 'var(--action)', color: 'var(--action-ink)',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                Register your business →
              </Link>
              <Link
                to="/recycling"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)',
                  height: 'var(--btn-h)', padding: '0 var(--s-5)',
                  borderRadius: 'var(--r-btn)',
                  border: '1px solid var(--line-strong)',
                  font: '500 var(--t-body)/1 var(--font-text)',
                  background: 'var(--bg)', color: 'var(--ink)',
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
              >
                See open listings
              </Link>
            </div>

            {/* hero facts row */}
            <dl
              style={{
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--s-5) var(--gutter)', marginTop: 'auto',
              }}
            >
              {[
                { dt: 'Businesses', dd: stats.businesses.toString() },
                { dt: 'Active listings', dd: stats.activeListings.toString() },
                { dt: 'AI matches', dd: stats.matches.toString() },
              ].map(({ dt, dd }) => (
                <div key={dt} style={{ display: 'grid', gap: 'var(--s-1)' }}>
                  <dt style={{ fontSize: 'var(--t-small)', color: 'var(--muted)' }}>{dt}</dt>
                  <dd style={{ margin: 0, fontWeight: 500, fontSize: 'var(--t-stat)', letterSpacing: '-0.03em', lineHeight: 1 }}>{dd}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* right: app-frame — live listings preview */}
          <div
            style={{
              height: '100%',
              borderRadius: 'var(--r-lg)',
              border: '1px solid var(--line)',
              background: 'var(--surface)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* window chrome */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--s-2)',
                padding: 'var(--s-3) var(--s-4)',
                borderBottom: '1px solid var(--line)',
                background: 'var(--bg)',
                flexShrink: 0,
              }}
            >
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'color-mix(in oklab, var(--ink) 20%, transparent)', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'color-mix(in oklab, var(--ink) 20%, transparent)', display: 'inline-block' }} />
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'color-mix(in oklab, var(--ink) 20%, transparent)', display: 'inline-block' }} />
              <span style={{ flex: 1, textAlign: 'center', fontSize: 'var(--t-small)', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                supplymash.com/network
              </span>
            </div>

            {/* sidebar + content */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
              {/* sidebar */}
              <div
                style={{
                  width: 180, flexShrink: 0,
                  borderRight: '1px solid var(--line)',
                  background: 'var(--bg)',
                  padding: 'var(--s-4)',
                  display: 'flex', flexDirection: 'column', gap: 'var(--s-2)',
                }}
              >
                {[
                  { label: 'Network', active: true, dot: 'var(--accent)' },
                  { label: 'Exchange', active: false, dot: '#22c55e' },
                  { label: 'Order Pools', active: false, dot: '#f59e0b' },
                  { label: 'Warehouses', active: false, dot: '#a78bfa' },
                  { label: 'AI Matches', active: false, dot: '#ec4899' },
                ].map(({ label, active, dot }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--s-2)',
                      padding: '8px var(--s-3)', borderRadius: 'var(--r-sm)',
                      background: active ? 'var(--surface)' : 'transparent',
                      fontSize: 'var(--t-small)', fontWeight: active ? 500 : 400,
                      color: active ? 'var(--ink)' : 'var(--muted)',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
                    {label}
                  </div>
                ))}
              </div>

              {/* main pane */}
              <div style={{ flex: 1, overflow: 'auto', padding: 'var(--s-5)', display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                <p style={{ fontSize: 'var(--t-small)', fontWeight: 500, color: 'var(--muted)', marginBottom: 'var(--s-1)', letterSpacing: '0.01em' }}>
                  RECENT AI MATCHES
                </p>
                {recentMatches.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                    {[
                      { from: 'Great Lakes Lumber Co.', to: 'Sunrise Organic Farm', material: 'Wood chips', score: 94 },
                      { from: 'Motor City Builders', to: 'Great Lakes Lumber Co.', material: 'Scrap wood', score: 88 },
                    ].map((m, i) => (
                      <MatchRow key={i} {...m} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                    {recentMatches.map((m) => (
                      <MatchRow key={m.id} from={m.offeringBusiness} to={m.requestingBusiness} material={m.material} score={m.compatibilityScore} />
                    ))}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 'var(--s-3)',
                    padding: 'var(--s-4)',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid var(--line)',
                    background: 'color-mix(in oklab, var(--accent) 8%, var(--surface))',
                  }}
                >
                  <p style={{ fontSize: 'var(--t-small)', fontWeight: 500, color: 'var(--ink)', marginBottom: 'var(--s-1)' }}>Run AI matching</p>
                  <p style={{ fontSize: 'var(--t-small)', color: 'var(--muted)', marginBottom: 'var(--s-3)' }}>
                    Scan all listings and surface new connections.
                  </p>
                  {runResult && (
                    <p style={{ fontSize: 'var(--t-small)', color: '#22c55e', marginBottom: 'var(--s-3)' }}>✓ {runResult}</p>
                  )}
                  <button
                    onClick={handleRunMatching}
                    disabled={loading}
                    style={{
                      display: 'inline-flex', alignItems: 'center', height: 32,
                      padding: '0 var(--s-4)', borderRadius: 'var(--r-sm)',
                      border: '1px solid transparent',
                      font: '500 var(--t-small)/1 var(--font-text)',
                      background: 'var(--action)', color: 'var(--action-ink)',
                      opacity: loading ? 0.5 : 1, cursor: loading ? 'default' : 'pointer',
                    }}
                  >
                    {loading ? 'Matching…' : 'Run matching'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES: 3-column cards ─────────────────────────────────────────── */}
      <section
        id="features"
        style={{
          height: '100svh',
          padding: 'var(--padt) 0 var(--padb)',
          background: 'var(--surface)',
        }}
      >
        <div
          style={{
            width: 'min(100% - 2 * var(--gut), var(--container))',
            margin: '0 auto',
            height: '100%',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ marginBottom: 'var(--head-gap)' }}>
            <h2 style={{ fontSize: 'var(--t-h2)', fontWeight: 500, letterSpacing: '-0.025em', marginBottom: 'var(--s-4)' }}>
              Three ways to cut costs
            </h2>
            <p style={{ fontSize: 'var(--t-lead)', color: 'var(--muted)', maxWidth: '56ch' }}>
              Sign up once. SupplyMash connects you automatically to relevant businesses within your region.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              columnGap: 'var(--gutter)',
              rowGap: 'var(--card-gap)',
              flex: 1,
            }}
          >
            <FeatureCard
              number="01"
              title="Industrial Recycling Exchange"
              body="Post excess wood, metal, or plastic. AI scans for businesses that need exactly what you produce — turning waste into working capital."
              items={['Lumber scraps to farms', 'Scrap metal to manufacturers', 'Construction waste reused']}
              href="/recycling"
              cta="See open listings"
            />
            <FeatureCard
              number="02"
              title="Local Order Pooling"
              body="Combine orders with nearby businesses from the same supplier. Split the delivery fee and unlock better per-unit pricing."
              items={['Coffee shops + salons combine cleaning supplies', 'Restaurants pool bulk food', 'Farms share fertilizer runs']}
              href="/order-pooling"
              cta="Join a pool"
            />
            <FeatureCard
              number="03"
              title="Shared Micro-Warehouses"
              body="Access neighborhood storage hubs shared with other businesses — refrigerated or dry, by the square foot, month to month."
              items={['Refrigerated space for farms', 'Dry storage for retailers', 'Tool storage for contractors']}
              href="/warehouses"
              cta="Find storage"
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS: steps (dark-band) ─────────────────────────────────── */}
      <section
        id="how-it-works"
        className="ground-inverse"
        style={{
          height: '100svh',
          padding: 'var(--padt) 0 var(--padb)',
        }}
      >
        <div
          style={{
            width: 'min(100% - 2 * var(--gut), var(--container))',
            margin: '0 auto',
            height: '100%',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ marginBottom: 'var(--head-gap)' }}>
            <h2 style={{ fontSize: 'var(--t-h2)', fontWeight: 500, letterSpacing: '-0.025em', marginBottom: 'var(--s-4)', color: 'var(--ink)' }}>
              From sign-up to first deal in minutes
            </h2>
            <p style={{ fontSize: 'var(--t-lead)', color: 'var(--muted)', maxWidth: '52ch' }}>
              Three steps. No integration required.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              columnGap: 'var(--gutter)',
              flex: 1,
              alignContent: 'start',
            }}
          >
            {[
              {
                step: '1',
                title: 'Register your business',
                body: 'Tell us what you produce, what you need, and which Michigan programs interest you — exchange, pooling, or warehousing.',
              },
              {
                step: '2',
                title: 'Post a listing',
                body: 'List excess inventory or an open order. Specify material category, quantity, and your preferred price.',
              },
              {
                step: '3',
                title: 'Accept an AI match',
                body: 'Our matching engine runs hourly and notifies both parties. Confirm the deal inside SupplyMash — logistics handled between you.',
              },
            ].map(({ step, title, body }) => (
              <div
                key={step}
                style={{
                  display: 'flex', flexDirection: 'column', gap: 'var(--s-5)',
                  padding: 'var(--s-7)',
                  borderRadius: 'var(--r-lg)',
                  border: '1px solid var(--line)',
                  background: 'var(--surface)',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 'var(--r-md)',
                    background: 'var(--accent)', color: 'var(--accent-ink)',
                    font: '500 var(--t-body)/1 var(--font-text)',
                    letterSpacing: '-0.01em', flexShrink: 0,
                  }}
                >
                  {step}
                </span>
                <div>
                  <h3 style={{ fontSize: 'var(--t-h3)', fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 'var(--s-3)', color: 'var(--ink)' }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 'var(--t-body)', color: 'var(--muted)', lineHeight: 1.6, maxWidth: '36ch' }}>
                    {body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function MatchRow({ from, to, material, score }: { from: string; to: string; material: string; score: number }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--s-3) var(--s-4)',
        borderRadius: 'var(--r-md)',
        border: '1px solid var(--line)',
        background: 'var(--bg)',
        gap: 'var(--s-4)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 'var(--t-small)', fontWeight: 500, color: 'var(--ink)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {from} → {to}
        </p>
        <p style={{ fontSize: 'var(--t-small)', color: 'var(--muted)' }}>{material}</p>
      </div>
      <span
        style={{
          flexShrink: 0,
          padding: '3px 8px',
          borderRadius: 999,
          background: 'color-mix(in oklab, #22c55e 15%, transparent)',
          color: '#22c55e',
          fontSize: 'var(--t-label)',
          fontWeight: 500,
        }}
      >
        {score}%
      </span>
    </div>
  );
}

function FeatureCard({
  number, title, body, items, href, cta,
}: {
  number: string; title: string; body: string;
  items: string[]; href: string; cta: string;
}) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 0,
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--line)',
        background: 'var(--card)',
        padding: 'var(--card-pad)',
        transition: 'transform 180ms, box-shadow 180ms',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px color-mix(in oklab, var(--ink) 10%, transparent)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = '';
        (e.currentTarget as HTMLElement).style.boxShadow = '';
      }}
    >
      <span style={{ fontSize: 'var(--t-label)', fontWeight: 500, color: 'var(--accent)', letterSpacing: '0.02em', marginBottom: 'var(--s-5)' }}>
        {number}
      </span>
      <h3 style={{ fontSize: 'var(--t-h3)', fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 'var(--s-4)', color: 'var(--ink)' }}>
        {title}
      </h3>
      <p style={{ fontSize: 'var(--t-body)', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 'var(--s-5)' }}>
        {body}
      </p>
      <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-2)', marginBottom: 'var(--s-6)' }}>
        {items.map((item) => (
          <li
            key={item}
            style={{
              fontSize: 'var(--t-small)', color: 'var(--muted)',
              paddingLeft: 'var(--s-4)',
              position: 'relative',
            }}
          >
            <span style={{ position: 'absolute', left: 0, color: 'var(--accent)' }}>→</span>
            {item}
          </li>
        ))}
      </ul>
      <Link
        to={href}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)',
          marginTop: 'auto',
          font: '500 var(--t-small)/1 var(--font-text)',
          color: 'var(--ink)',
          textDecoration: 'underline',
          textDecorationColor: 'color-mix(in oklab, var(--ink) 20%, transparent)',
          textUnderlineOffset: 4,
          transition: 'text-decoration-color 150ms',
        }}
      >
        {cta} →
      </Link>
    </div>
  );
}
