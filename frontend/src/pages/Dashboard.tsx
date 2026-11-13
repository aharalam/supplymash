import { useEffect, useState } from 'react';
import { businessApi, listingsApi, matchesApi } from '../api';

interface Stats {
  businesses: number;
  activeListings: number;
  matches: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ businesses: 0, activeListings: 0, matches: 0 });
  const [runResult, setRunResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([businessApi.list(), listingsApi.list(), matchesApi.list()]).then(
      ([businesses, listings, matches]) => {
        setStats({
          businesses: businesses.length,
          activeListings: listings.length,
          matches: matches.length,
        });
      },
    );
  }, [runResult]);

  const handleRunMatching = async () => {
    setLoading(true);
    try {
      const result = await matchesApi.run();
      setRunResult(`Found ${result.matched} new match${result.matched !== 1 ? 'es' : ''}!`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-2">SupplyMash Dashboard</h1>
      <p className="text-gray-500 mb-8">
        Connect Michigan businesses to share resources, reduce waste, and cut delivery costs.
      </p>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <StatCard label="Registered Businesses" value={stats.businesses} color="blue" />
        <StatCard label="Active Listings" value={stats.activeListings} color="green" />
        <StatCard label="Total Matches" value={stats.matches} color="purple" />
      </div>

      {/* Features overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <FeatureCard
          emoji="♻️"
          title="Industrial Recycling Exchange"
          desc="Post excess materials or find raw inputs. AI automatically identifies compatible businesses to propose trades."
        />
        <FeatureCard
          emoji="📦"
          title="Local Order Pooling"
          desc="Combine orders with nearby businesses. Share delivery costs from the same supplier and unlock bulk pricing."
        />
        <FeatureCard
          emoji="🏭"
          title="Shared Micro-Warehouses"
          desc="Rent shared storage space in neighborhood hubs. Refrigerated options available for farms and restaurants."
        />
      </div>

      {/* AI Matching CTA */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-green-800 mb-1">AI Resource Matching</h2>
          <p className="text-sm text-green-700">
            Run the matching engine to find compatible resource exchanges between registered businesses.
          </p>
          {runResult && <p className="mt-2 text-sm font-medium text-green-900">✅ {runResult}</p>}
        </div>
        <button
          onClick={handleRunMatching}
          disabled={loading}
          className="bg-green-700 hover:bg-green-800 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {loading ? 'Running…' : '▶ Run Matching'}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  return (
    <div className={`rounded-xl border p-6 ${colorMap[color]}`}>
      <div className="text-4xl font-bold">{value}</div>
      <div className="text-sm mt-1 font-medium">{label}</div>
    </div>
  );
}

function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}
