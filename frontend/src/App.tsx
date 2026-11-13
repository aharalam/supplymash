import { BrowserRouter, Routes, Route, NavLink, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RecyclingExchange from './pages/RecyclingExchange';
import OrderPooling from './pages/OrderPooling';
import Warehouses from './pages/Warehouses';
import Register from './pages/Register';

export default function App() {
  return (
    <BrowserRouter>
      {/* nav-centre: words centred, logo left, main action right */}
      <header
        className="nav"
        style={{
          position: 'fixed', inset: '0 0 auto 0', zIndex: 50,
          height: 'var(--nav)',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div
          className="nav__bar"
          style={{
            width: 'min(100% - 2 * var(--gut), var(--container))',
            margin: '0 auto',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* wordmark */}
          <Link
            to="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)',
              font: '500 22px/1 var(--font-display)',
              letterSpacing: '-0.02em', flexShrink: 0, color: 'var(--ink)',
            }}
          >
            SupplyMash
          </Link>

          {/* centre words */}
          <nav
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--s-6)',
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            }}
          >
            {[
              { to: '/', label: 'Network' },
              { to: '/recycling', label: 'Exchange' },
              { to: '/order-pooling', label: 'Pooling' },
              { to: '/warehouses', label: 'Warehouses' },
            ].map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                style={({ isActive }) => ({
                  font: '500 15px/1 var(--font-text)',
                  color: isActive ? 'var(--ink)' : 'var(--muted)',
                  transition: 'color 150ms',
                  textDecoration: 'none',
                  letterSpacing: '0',
                  paddingBottom: isActive ? '2px' : '0',
                  borderBottom: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* main action */}
          <Link
            to="/register"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              height: 'var(--btn-h)', padding: '0 var(--s-5)',
              borderRadius: 'var(--r-btn)', border: '1px solid transparent',
              font: '500 var(--t-body)/1 var(--font-text)',
              background: 'var(--action)', color: 'var(--action-ink)',
              whiteSpace: 'nowrap', textDecoration: 'none',
              transition: 'background var(--dur) var(--ease)',
              flexShrink: 0,
            }}
          >
            Register business
          </Link>
        </div>
      </header>

      <main id="top" style={{ minHeight: '100svh' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/recycling" element={<RecyclingExchange />} />
          <Route path="/order-pooling" element={<OrderPooling />} />
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>

      {/* footer-dark */}
      <footer
        style={{
          background: 'var(--p-inv-bg)',
          color: 'var(--p-inv-ink)',
          borderTop: '1px solid color-mix(in oklab, var(--p-inv-ink) 11%, transparent)',
          padding: 'var(--s-9) 0 var(--s-7)',
        }}
      >
        <div
          style={{
            width: 'min(100% - 2 * var(--gut), var(--container))',
            margin: '0 auto',
          }}
        >
          {/* close-type: h2, line, then big button across the wrap */}
          <div style={{ marginBottom: 'var(--s-9)' }}>
            <h2
              style={{
                fontSize: 'var(--t-h2)', fontWeight: 500, letterSpacing: '-0.025em',
                lineHeight: 1.1, marginBottom: 'var(--s-5)',
                color: 'var(--p-inv-ink)',
              }}
            >
              Connect your business to Michigan's supply network.
            </h2>
            <p style={{ color: 'color-mix(in oklab, var(--p-inv-ink) 65%, transparent)', fontSize: 'var(--t-lead)', maxWidth: '56ch', marginBottom: 'var(--s-6)' }}>
              Post excess materials, join order pools, and share warehouse space with nearby businesses. No fees until you close a deal.
            </p>
            <Link
              to="/register"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--s-2)',
                height: 'var(--btn-h)', padding: '0 var(--s-5)',
                borderRadius: 'var(--r-btn)', border: '1px solid transparent',
                font: '500 var(--t-body)/1 var(--font-text)',
                background: 'var(--p-inv-action)', color: 'var(--p-inv-action-ink)',
                textDecoration: 'none',
                transition: 'background var(--dur) var(--ease)',
              }}
            >
              Register your business →
            </Link>
          </div>

          {/* footer columns + legal */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 'var(--s-7) var(--s-8)',
              paddingTop: 'var(--s-7)',
              borderTop: '1px solid color-mix(in oklab, var(--p-inv-ink) 11%, transparent)',
            }}
          >
            <div>
              <p style={{ font: '500 15px/1 var(--font-text)', letterSpacing: '-0.01em', color: 'var(--p-inv-ink)', marginBottom: 'var(--s-4)' }}>SupplyMash</p>
              <p style={{ fontSize: 'var(--t-small)', color: 'color-mix(in oklab, var(--p-inv-ink) 55%, transparent)', lineHeight: 1.6 }}>
                Resource sharing for Michigan businesses.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 'var(--t-label)', fontWeight: 500, color: 'color-mix(in oklab, var(--p-inv-ink) 50%, transparent)', marginBottom: 'var(--s-3)', letterSpacing: '0.01em' }}>Platform</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                {[
                  { to: '/recycling', label: 'Recycling Exchange' },
                  { to: '/order-pooling', label: 'Order Pooling' },
                  { to: '/warehouses', label: 'Warehouses' },
                ].map(({ to, label }) => (
                  <li key={to}>
                    <Link to={to} style={{ fontSize: 'var(--t-small)', color: 'color-mix(in oklab, var(--p-inv-ink) 65%, transparent)', transition: 'color 150ms' }}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: 'var(--t-label)', fontWeight: 500, color: 'color-mix(in oklab, var(--p-inv-ink) 50%, transparent)', marginBottom: 'var(--s-3)', letterSpacing: '0.01em' }}>Company</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-3)' }}>
                <li><Link to="/register" style={{ fontSize: 'var(--t-small)', color: 'color-mix(in oklab, var(--p-inv-ink) 65%, transparent)' }}>Join</Link></li>
              </ul>
            </div>
          </div>

          <p style={{ fontSize: 'var(--t-small)', color: 'color-mix(in oklab, var(--p-inv-ink) 40%, transparent)', marginTop: 'var(--s-7)' }}>
            © 2026 SupplyMash · Michigan DevFest Hackathon
          </p>
        </div>
      </footer>
    </BrowserRouter>
  );
}
