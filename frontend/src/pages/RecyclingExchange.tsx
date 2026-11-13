import { useEffect, useState } from 'react';
import { listingsApi, matchesApi, businessApi } from '../api';

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

export default function RecyclingExchange() {
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
      ([l, m, b]) => { setListings(l); setMatches(m); setBusinesses(b); },
    );

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await listingsApi.create({
      ...form,
      quantity: Number(form.quantity),
      pricePerUnit: Number(form.pricePerUnit),
    });
    setShowForm(false);
    load();
  };

  const handleAccept = async (match: Match) => {
    await matchesApi.respond(match.id, 'accepted');
    load();
  };

  const materialLabel = (cat: string) =>
    cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">♻️ Industrial Recycling Exchange</h1>
          <p className="text-gray-500 text-sm mt-1">Post excess materials or request raw inputs — AI matches compatible businesses.</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + New Listing
        </button>
      </div>

      {/* New listing form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Create a Listing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business</label>
              <select required value={form.businessId} onChange={(e) => setForm({ ...form, businessId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select…</option>
                {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="offering">Offering (I have excess)</option>
                <option value="requesting">Requesting (I need this)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Category</label>
              <select value={form.materialCategory} onChange={(e) => setForm({ ...form, materialCategory: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['wood_lumber', 'metal_scrap', 'plastic', 'cardboard_paper', 'food_byproduct', 'textile', 'other'].map((c) => (
                  <option key={c} value={c}>{materialLabel(c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Excess wood chips — 2 tons/week" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input type="number" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="lbs, tons, pallets…" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">Post Listing</button>
            <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Listings grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {listings.length === 0 && <p className="text-gray-400 col-span-2">No active listings yet.</p>}
        {listings.map((l) => (
          <div key={l.id} className={`bg-white border rounded-xl p-4 shadow-sm ${l.type === 'offering' ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-blue-500'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${l.type === 'offering' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {l.type === 'offering' ? '↑ Offering' : '↓ Requesting'}
              </span>
              <span className="text-xs text-gray-400">{materialLabel(l.materialCategory)}</span>
            </div>
            <h3 className="font-semibold text-gray-800 mt-2">{l.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{l.description}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span>📍 {l.location.city}, {l.location.state}</span>
              <span>⚖️ {l.quantity} {l.unit}</span>
              <span className={`ml-auto px-2 py-0.5 rounded-full font-medium ${l.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {l.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* AI Matches */}
      {matches.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">🤖 AI-Suggested Matches</h2>
          <div className="space-y-4">
            {matches.map((m) => (
              <div key={m.id} className="bg-white border border-yellow-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800">{m.offeringBusiness} → {m.requestingBusiness}</span>
                  <span className="text-sm font-bold text-green-700">Score: {m.compatibilityScore}%</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{m.aiReasoning}</p>
                <div className="flex gap-2">
                  {m.status === 'pending' && (
                    <button onClick={() => handleAccept(m)}
                      className="bg-green-700 hover:bg-green-800 text-white text-sm px-3 py-1.5 rounded-lg font-medium">
                      ✅ Accept Match
                    </button>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${m.status === 'accepted' ? 'bg-green-100 text-green-700' : m.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    {m.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
