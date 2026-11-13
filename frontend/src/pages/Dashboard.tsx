import { useEffect, useState, useCallback } from 'react';
import { businessApi, listingsApi, matchesApi } from '../api';
import NetworkGraph, { type NetworkNode, type NetworkEdge } from '../components/NetworkGraph';

interface Stats {
  businesses: number;
  activeListings: number;
  matches: number;
}

// Deterministic positions arranged in a loose circle for N nodes
function layoutPositions(count: number): [number, number, number][] {
  const positions: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = 3.5 + (i % 2) * 1.2;
    positions.push([
      Math.cos(angle) * r,
      (i % 3) * 0.6 - 0.6,
      Math.sin(angle) * r,
    ]);
  }
  return positions;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ businesses: 0, activeListings: 0, matches: 0 });
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [edges, setEdges] = useState<NetworkEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);

  const loadAll = useCallback(() => {
    Promise.all([businessApi.list(), listingsApi.list(), matchesApi.list()]).then(
      ([businesses, listings, matches]) => {
        setStats({
          businesses: businesses.length,
          activeListings: listings.length,
          matches: matches.length,
        });

        // Build graph nodes from businesses
        const positions = layoutPositions(businesses.length);
        const graphNodes: NetworkNode[] = businesses.map(
          (b: { id: string; name: string; type: NetworkNode['type']; enrolledFeatures: string[] }, i: number) => ({
            id: b.id,
            label: b.name,
            type: b.type,
            position: positions[i],
            features: b.enrolledFeatures,
          }),
        );
        setNodes(graphNodes);

        // Build graph edges from matches
        const graphEdges: NetworkEdge[] = matches.map(
          (m: { id: string; offeringListingId: string; requestingListingId: string; material: string; compatibilityScore: number; status: string }) => {
            // Find business IDs from listing IDs
            const offerListing = listings.find((l: { id: string; businessId: string }) => l.id === m.offeringListingId);
            const reqListing = listings.find((l: { id: string; businessId: string }) => l.id === m.requestingListingId);
            return {
              id: m.id,
              from: offerListing?.businessId ?? '',
              to: reqListing?.businessId ?? '',
              material: m.material,
              score: m.compatibilityScore,
              status: m.status,
            };
          },
        ).filter((e: NetworkEdge) => e.from && e.to);
        setEdges(graphEdges);
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
    <div className="space-y-8">
      {/* Hero title */}
      <div className="text-center pt-2">
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
          Supply Network
        </h1>
        <p className="text-slate-400 text-base max-w-lg mx-auto">
          Live map of Michigan businesses exchanging resources, pooling orders, and sharing storage.
        </p>
      </div>

      {/* 3D Network graph */}
      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl" style={{ height: 460 }}>
        <NetworkGraph
          nodes={nodes}
          edges={edges}
          onNodeClick={(n) => setSelectedNode(selectedNode?.id === n.id ? null : n)}
        />
      </div>

      {/* Selected node info */}
      {selectedNode && (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold">{selectedNode.label}</p>
            <p className="text-slate-400 text-sm capitalize mt-0.5">
              {selectedNode.type} · enrolled in {selectedNode.features.length} program{selectedNode.features.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-slate-300 text-xl leading-none">×</button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Businesses" value={stats.businesses} accent="#38bdf8" />
        <StatCard label="Active Listings" value={stats.activeListings} accent="#4ade80" />
        <StatCard label="Matches" value={stats.matches} accent="#c084fc" />
      </div>

      {/* Features + AI trigger */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          emoji="♻️"
          title="Recycling Exchange"
          desc="Post excess materials. AI surfaces businesses that need exactly what you produce."
          accent="#f97316"
        />
        <FeatureCard
          emoji="📦"
          title="Order Pooling"
          desc="Combine orders with nearby businesses from the same supplier to slash delivery fees."
          accent="#38bdf8"
        />
        <FeatureCard
          emoji="🏭"
          title="Micro-Warehouses"
          desc="Share neighborhood storage hubs — refrigerated space available for farms and restaurants."
          accent="#4ade80"
        />
      </div>

      {/* AI matching CTA */}
      <div className="bg-gradient-to-r from-indigo-950 to-slate-900 border border-indigo-800/50 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold text-lg mb-1">Run AI Matching</h2>
          <p className="text-slate-400 text-sm">
            Find compatible resource exchanges and watch new edges appear in the network above.
          </p>
          {runResult && (
            <p className="mt-2 text-sm font-medium text-emerald-400">✓ {runResult}</p>
          )}
        </div>
        <button
          onClick={handleRunMatching}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap text-sm"
        >
          {loading ? 'Matching…' : '▶ Run Matching'}
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="text-4xl font-bold mb-1" style={{ color: accent }}>{value}</div>
      <div className="text-slate-400 text-sm font-medium">{label}</div>
    </div>
  );
}

function FeatureCard({ emoji, title, desc, accent }: { emoji: string; title: string; desc: string; accent: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-600 transition-colors">
      <div className="text-2xl mb-3">{emoji}</div>
      <h3 className="font-semibold mb-1.5" style={{ color: accent }}>{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
