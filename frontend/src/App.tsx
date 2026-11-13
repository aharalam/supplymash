import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RecyclingExchange from './pages/RecyclingExchange';
import OrderPooling from './pages/OrderPooling';
import Warehouses from './pages/Warehouses';
import Register from './pages/Register';

export default function App() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
        ? 'bg-green-700 text-white'
        : 'text-green-100 hover:bg-green-700 hover:text-white'
    }`;

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Nav */}
        <nav className="bg-green-800 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white tracking-tight">SupplyMash</span>
                <span className="text-green-300 text-sm hidden sm:inline">— Connect. Share. Save.</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                <NavLink to="/" end className={navLinkClass}>Dashboard</NavLink>
                <NavLink to="/recycling" className={navLinkClass}>♻ Exchange</NavLink>
                <NavLink to="/order-pooling" className={navLinkClass}>📦 Order Pooling</NavLink>
                <NavLink to="/warehouses" className={navLinkClass}>🏭 Warehouses</NavLink>
                <NavLink to="/register" className={navLinkClass}>+ Register</NavLink>
              </div>
            </div>
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recycling" element={<RecyclingExchange />} />
            <Route path="/order-pooling" element={<OrderPooling />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>

        <footer className="text-center text-sm text-gray-400 py-4 border-t">
          SupplyMash — Michigan DevFest Hackathon 2026
        </footer>
      </div>
    </BrowserRouter>
  );
}
