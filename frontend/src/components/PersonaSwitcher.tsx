'use client';
import { useEffect, useState } from 'react';
import { businessApi } from '../api';
import type { BusinessSummary } from '../api/types';
import { getPersona, setPersona, usePersona } from '../persona';

const OPERATOR = '';

export default function PersonaSwitcher() {
  const persona = usePersona();
  const [businesses, setBusinesses] = useState<BusinessSummary[] | null>(null);

  useEffect(() => {
    let live = true;
    businessApi.summaries()
      .then((list) => {
        if (!live) return;
        setBusinesses(list);
        // Seed IDs can change on backend restart; drop a persona that no longer exists.
        const stored = getPersona();
        if (stored && !list.some((b) => b.id === stored)) setPersona(null);
      })
      .catch(() => { if (live) setBusinesses([]); });
    return () => { live = false; };
  }, []);

  const known = businesses?.some((b) => b.id === persona);

  return (
    <label className="persona-switcher">
      <span>Viewing as</span>
      <select
        value={persona ?? OPERATOR}
        onChange={(e) => setPersona(e.target.value || null)}
        aria-label="Viewing as"
      >
        <option value={OPERATOR}>SupplyMash operator</option>
        {persona && businesses && !known && <option value={persona}>Loading business…</option>}
        {businesses?.map((b) => (
          <option key={b.id} value={b.id}>{b.name} · {b.location.city}</option>
        ))}
      </select>
    </label>
  );
}
