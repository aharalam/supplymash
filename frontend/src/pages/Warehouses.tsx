import { useEffect, useState } from 'react';
import { warehousesApi, businessApi } from '../api';

type WarehouseMember = { businessId: string; businessName: string; sqFtLeased: number; leaseStartDate: string; leaseEndDate: string };
type Warehouse = {
  id: string; name: string; totalSqFt: number; availableSqFt: number;
  features: string[]; pricePerSqFtPerMonth: number; members: WarehouseMember[];
  status: string; location: { city: string; state: string };
};
type Business = { id: string; name: string };

export default function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [joinWarehouseId, setJoinWarehouseId] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState({ name: '', city: '', state: 'MI', zipCode: '', totalSqFt: '', pricePerSqFtPerMonth: '2.50', features: [] as string[] });
  const [joinForm, setJoinForm] = useState({ businessId: '', sqFtLeased: '', leaseStartDate: '', leaseEndDate: '' });

  const featureOptions = ['refrigerated', 'climate_controlled', 'heavy_equipment', 'drive_in'];

  const load = () =>
    Promise.all([warehousesApi.list(), businessApi.list()]).then(([w, b]) => { setWarehouses(w); setBusinesses(b); });

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await warehousesApi.create({
      name: createForm.name, totalSqFt: Number(createForm.totalSqFt),
      pricePerSqFtPerMonth: Number(createForm.pricePerSqFtPerMonth),
      features: createForm.features,
      location: { city: createForm.city, state: createForm.state, zipCode: createForm.zipCode },
    });
    setShowCreate(false);
    load();
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinWarehouseId) return;
    await warehousesApi.join(joinWarehouseId, { ...joinForm, sqFtLeased: Number(joinForm.sqFtLeased) });
    setJoinWarehouseId(null);
    load();
  };

  const toggleFeature = (f: string) =>
    setCreateForm((prev) => ({
      ...prev,
      features: prev.features.includes(f) ? prev.features.filter((x) => x !== f) : [...prev.features, f],
    }));

  const statusColor = (s: string) => ({ available: 'bg-green-100 text-green-700', partial: 'bg-yellow-100 text-yellow-700', full: 'bg-red-100 text-red-700' }[s] ?? 'bg-gray-100 text-gray-500');

  const featureLabel = (f: string) => f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🏭 Shared Micro-Warehouses</h1>
          <p className="text-gray-500 text-sm mt-1">Rent shared neighborhood storage — affordable for small businesses, farms, and contractors.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + List Warehouse
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="font-semibold text-gray-700 mb-4">List a Warehouse</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input required value={createForm.city} onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
              <input required value={createForm.zipCode} onChange={(e) => setCreateForm({ ...createForm, zipCode: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Sq Ft</label>
              <input type="number" required value={createForm.totalSqFt} onChange={(e) => setCreateForm({ ...createForm, totalSqFt: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Price / sq ft / month ($)</label>
              <input type="number" step="0.01" value={createForm.pricePerSqFtPerMonth} onChange={(e) => setCreateForm({ ...createForm, pricePerSqFtPerMonth: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Features</label>
              <div className="flex flex-wrap gap-2">
                {featureOptions.map((f) => (
                  <label key={f} className="flex items-center gap-1 text-sm">
                    <input type="checkbox" checked={createForm.features.includes(f)} onChange={() => toggleFeature(f)} className="rounded" />
                    {featureLabel(f)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">List Warehouse</button>
            <button type="button" onClick={() => setShowCreate(false)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
          </div>
        </form>
      )}

      {/* Join modal */}
      {joinWarehouseId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <form onSubmit={handleJoin} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-gray-800 mb-4">Rent Storage Space</h2>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Business</label>
                <select required value={joinForm.businessId} onChange={(e) => setJoinForm({ ...joinForm, businessId: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select…</option>
                  {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Square Feet Needed</label>
                <input type="number" required value={joinForm.sqFtLeased} onChange={(e) => setJoinForm({ ...joinForm, sqFtLeased: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Lease Start</label>
                <input type="date" required value={joinForm.leaseStartDate} onChange={(e) => setJoinForm({ ...joinForm, leaseStartDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Lease End</label>
                <input type="date" required value={joinForm.leaseEndDate} onChange={(e) => setJoinForm({ ...joinForm, leaseEndDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-lg text-sm font-medium">Confirm Lease</button>
              <button type="button" onClick={() => setJoinWarehouseId(null)} className="border px-4 py-2 rounded-lg text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Warehouse cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {warehouses.length === 0 && <p className="text-gray-400 col-span-2">No warehouses listed yet.</p>}
        {warehouses.map((w) => (
          <div key={w.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">{w.name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(w.status)}`}>{w.status}</span>
            </div>
            <div className="text-sm text-gray-500 mb-3 flex flex-wrap gap-4">
              <span>📍 {w.location.city}, {w.location.state}</span>
              <span>📐 {w.availableSqFt.toLocaleString()} / {w.totalSqFt.toLocaleString()} sq ft available</span>
              <span>💵 ${w.pricePerSqFtPerMonth}/sq ft/mo</span>
            </div>
            {w.features.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {w.features.map((f) => <span key={f} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{featureLabel(f)}</span>)}
              </div>
            )}
            <div className="text-sm text-gray-600 mb-3">
              <strong>{w.members.length}</strong> tenant{w.members.length !== 1 ? 's' : ''}
            </div>
            {w.status !== 'full' && (
              <button onClick={() => setJoinWarehouseId(w.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium">
                📋 Rent Space
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
