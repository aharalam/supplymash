import { useState } from 'react';
import { businessApi } from '../api';
import { useNavigate } from 'react-router-dom';

type Feature = 'recycling_exchange' | 'order_pooling' | 'micro_warehouse';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', type: 'factory', city: '', state: 'MI', zipCode: '',
    contactEmail: '', description: '',
    enrolledFeatures: [] as Feature[],
  });
  const [success, setSuccess] = useState(false);

  const featureOptions: { value: Feature; label: string; desc: string }[] = [
    { value: 'recycling_exchange', label: '♻️ Industrial Recycling Exchange', desc: 'Post excess materials and find raw inputs from nearby businesses.' },
    { value: 'order_pooling', label: '📦 Local Order Pooling', desc: 'Combine orders to share delivery costs and unlock better pricing.' },
    { value: 'micro_warehouse', label: '🏭 Shared Micro-Warehouses', desc: 'Access affordable shared storage in your neighborhood.' },
  ];

  const toggleFeature = (f: Feature) =>
    setForm((prev) => ({
      ...prev,
      enrolledFeatures: prev.enrolledFeatures.includes(f)
        ? prev.enrolledFeatures.filter((x) => x !== f)
        : [...prev.enrolledFeatures, f],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await businessApi.create({
      name: form.name, type: form.type,
      location: { city: form.city, state: form.state, zipCode: form.zipCode },
      contactEmail: form.contactEmail, description: form.description,
      enrolledFeatures: form.enrolledFeatures,
    });
    setSuccess(true);
    setTimeout(() => navigate('/'), 2000);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-700 mb-2">You're registered!</h2>
        <p className="text-gray-500">Redirecting to dashboard…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Register Your Business</h1>
      <p className="text-gray-500 text-sm mb-8">Join SupplyMash to start saving on resources, deliveries, and storage.</p>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm space-y-6">
        {/* Business info */}
        <div>
          <h2 className="font-semibold text-gray-700 mb-4">Business Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Great Lakes Lumber Co." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type *</label>
              <select required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {['factory', 'farm', 'construction', 'restaurant', 'retailer', 'manufacturer', 'other'].map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
              <input required type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
              <input required value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Briefly describe your business and what materials/resources you typically have or need." />
            </div>
          </div>
        </div>

        {/* Feature enrollment */}
        <div>
          <h2 className="font-semibold text-gray-700 mb-1">Select Features</h2>
          <p className="text-sm text-gray-500 mb-4">Choose which SupplyMash programs to enroll in. You can join all three.</p>
          <div className="space-y-3">
            {featureOptions.map((f) => (
              <label key={f.value} className={`flex items-start gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${form.enrolledFeatures.includes(f.value) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="checkbox" checked={form.enrolledFeatures.includes(f.value)} onChange={() => toggleFeature(f.value)} className="mt-0.5 rounded" />
                <div>
                  <div className="font-medium text-gray-800 text-sm">{f.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{f.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button type="submit"
          className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold py-3 rounded-xl transition-colors">
          Register Business
        </button>
      </form>
    </div>
  );
}
