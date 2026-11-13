'use client';
// Viewer persona ("viewing as"). There are no logins: the chosen business ID is
// sent as X-Business-Id on every API call. null means the SupplyMash operator view.
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'supplymash.persona';
const listeners = new Set<() => void>();
let current: string | null = null;
let loaded = false;

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try { current = window.localStorage.getItem(STORAGE_KEY) || null; } catch { current = null; }
}

export function getPersona(): string | null {
  load();
  return current;
}

export function setPersona(id: string | null) {
  load();
  if (id === current) return;
  current = id;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage unavailable: keep in memory only */ }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Current persona; null (operator) during server render. */
export function usePersona(): string | null {
  return useSyncExternalStore(subscribe, getPersona, () => null);
}
