import { useEffect, useState } from 'react';
import { orderPoolsApi, businessApi } from '../api';

type PoolMember = { businessId: string; businessName: string; itemDescription: string; quantity: number; unit: string };
type OrderPool = {
  id: string; title: string; supplier: string; category: string;
  members: PoolMember[]; status: string; deadline: string; estimatedSavings: number;
  location: { city: string; state: string };
};
type Business = { id: string; name: string };

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

  const statusColor = (s: string) => ({ open: 'bg-green-100 text-green-700', forming: 'bg-yellow-100 text-yellow-700', confirmed: 'bg-blue-100 text-blue-700', delivered: 'bg-gray-100 text-gray-600' }[s] ?? 'bg-gray-100 text-gray-500');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📦 Local Order Pooling</h1>
          <p className="text-gray-500 text-sm mt-1">Combine orders with nearby businesses to split delivery costs and unlock better pricing.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Create Pool
        </button>
      </div>

      {/* Create pool form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">Create Order Pool</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Pool Title</label>
              <input required value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Detroit cleaning supplies run" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
              <input required value={createForm.supplier} onChange={(e) => setCreateForm({ ...createForm, supplier: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Sysco, Costco Business" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input required value={createForm.category} onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. cleaning supplies" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Order Deadline</label>
              <input type="date" required value={createForm.deadline} onChange={(e) => setCreateForm({ ...createForm, deadline: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input required value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input required value={createForm.zipCode} onChange={(e) => setCreateForm({ ...createForm, zipCode: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">Create Pool</button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Join modal */}
      {joinPoolId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleJoin} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-gray-800 mb-4">Join Order Pool</h2>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Business</label>
                <select required value={joinForm.businessId} onChange={(e) => setJoinForm({ ...joinForm, businessId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">What do you need?</label>
                <input required value={joinForm.itemDescription} onChange={(e) => setJoinForm({ ...joinForm, itemDescription: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. 10 cases paper towels" /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" required value={joinForm.quantity} onChange={(e) => setJoinForm({ ...joinForm, quantity: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
                <div className="flex-1"><label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input value={joinForm.unit} onChange={(e) => setJoinForm({ ...joinForm, unit: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">Join Pool</button>
              <button type="button" onClick={() => setJoinPoolId(null)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Pool cards */}
      <div className="space-y-4">
        {pools.length === 0 && <p className="text-gray-400">No order pools yet. Create one to get started.</p>}
        {pools.map((pool) => (
          <div key={pool.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">{pool.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(pool.status)}`}>{pool.status}</span>
            </div>
            <div className="text-sm text-gray-500 mb-3 flex flex-wrap gap-4">
              <span>🏪 {pool.supplier}</span>
              <span>📂 {pool.category}</span>
              <span>📍 {pool.location.city}, {pool.location.state}</span>
              <span>⏰ Deadline: {pool.deadline}</span>
              {pool.estimatedSavings > 0 && <span className="text-green-700 font-medium">💰 Est. savings: ${pool.estimatedSavings}/member</span>}
            </div>
            <div className="text-sm text-gray-600 mb-3">
              <strong>{pool.members.length}</strong> member{pool.members.length !== 1 ? 's' : ''} joined
              {pool.members.length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {pool.members.map((m, i) => (
                    <li key={i} className="text-xs text-gray-500">• {m.businessName}: {m.quantity} {m.unit} of {m.itemDescription}</li>
                  ))}
                </ul>
              )}
            </div>
            {(pool.status === 'open' || pool.status === 'forming') && (
              <button onClick={() => setJoinPoolId(pool.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium">
                + Join Pool
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
