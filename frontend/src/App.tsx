import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RecyclingExchange from './pages/RecyclingExchange';
import OrderPooling from './pages/OrderPooling';
import Warehouses from './pages/Warehouses';
import Register from './pages/Register';

export default function App() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white'
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
    }`;

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col" style={{ background: '#030712' }}>
        <nav className="border-b border-slate-800/60 sticky top-0 z-50" style={{ background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(12px)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-white tracking-tight">SupplyMash</span>
                <span className="hidden sm:block text-xs text-slate-500 border-l border-slate-700 pl-3">Michigan DevFest 2026</span>
              </div>
              <div className="flex items-center gap-1">
                <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/recycling" className={navLinkClass}>♻ Exchange</NavLink>
                <NavLink to="/order-pooling" className={navLinkClass}>📦 Pooling</NavLink>
                <NavLink to="/warehouses" className={navLinkClass}>🏭 Warehouses</NavLink>
                <NavLink to="/register" className={navLinkClass}>+ Register</NavLink>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recycling" element={<RecyclingExchange />} />
            <Route path="/order-pooling" element={<OrderPooling />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>

        <footer className="text-center text-xs text-slate-700 py-4 border-t border-slate-800/40">
          SupplyMash — Michigan DevFest Hackathon 2026
        </footer>
      </div>
    </BrowserRouter>
  );
}
