import axios from 'axios';
import { getPersona } from '../persona';
import type {
  BusinessSummary, ClosePoolResponse, CreateOrderResponse, Metrics, OrderWithPool,
  PoolOperatorView, PoolView, ScrapOffer, Supplier,
} from './types';

const api = axios.create({ baseURL: '/api' });

// Viewer header: business view when a persona is chosen, operator view otherwise.
api.interceptors.request.use((c) => {
  const businessId = getPersona();
  if (businessId) c.headers['X-Business-Id'] = businessId;
  return c;
});

/** The API's `{ error }` message, or a readable fallback. */
export function apiError(err: unknown, fallback = 'The request could not be completed. Check your connection and try again.'): string {
  if (axios.isAxiosError(err)) {
    const message = (err.response?.data as { error?: unknown } | undefined)?.error;
    if (typeof message === 'string' && message) return message;
    if (err.response?.status === 404) return 'Not found. This action may not be available yet.';
  }
  return fallback;
}

export const businessApi = {
  list: () => api.get('/businesses').then((r) => r.data),
  summaries: (): Promise<BusinessSummary[]> => api.get('/businesses').then((r) => r.data),
  get: (id: string) => api.get(`/businesses/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/businesses', data).then((r) => r.data),
};

export const listingsApi = {
  list: (params?: Record<string, string>) => api.get('/listings', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/listings/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/listings', data).then((r) => r.data),
};

export const orderPoolsApi = {
  list: (params?: Record<string, string>) => api.get('/order-pools', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/order-pools/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/order-pools', data).then((r) => r.data),
  join: (id: string, data: unknown) => api.post(`/order-pools/${id}/join`, data).then((r) => r.data),
};

export const warehousesApi = {
  list: (params?: Record<string, string>) => api.get('/warehouses', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/warehouses/${id}`).then((r) => r.data),
  create: (data: unknown) => api.post('/warehouses', data).then((r) => r.data),
  join: (id: string, data: unknown) => api.post(`/warehouses/${id}/join`, data).then((r) => r.data),
};

export const matchesApi = {
  list: () => api.get('/matches').then((r) => r.data),
  run: () => api.post('/matches/run').then((r) => r.data),
  respond: (id: string, status: string) => api.put(`/matches/${id}/respond`, { status }).then((r) => r.data),
};

// ── Order-first API (spec §9) ─────────────────────────────────────────────────

export const suppliersApi = {
  list: (): Promise<Supplier[]> => api.get('/suppliers').then((r) => r.data),
};

export const ordersApi = {
  create: (data: { businessId: string; supplierId: string; text: string }): Promise<CreateOrderResponse> =>
    api.post('/orders', data).then((r) => r.data),
  /** Requires a persona. */
  mine: (): Promise<OrderWithPool[]> => api.get('/orders').then((r) => r.data),
};

export const poolsApi = {
  /** Viewer-safe pools for the current persona. */
  listForViewer: (): Promise<PoolView[]> => api.get('/pools').then((r) => r.data),
  /** Operator view: only meaningful with no persona. */
  listForOperator: (): Promise<PoolOperatorView[]> => api.get('/pools').then((r) => r.data),
  close: (id: string): Promise<ClosePoolResponse> => api.post(`/pools/${id}/close`).then((r) => r.data),
};

export const scrapOffersApi = {
  /** Requires a persona (400 otherwise). */
  list: (): Promise<ScrapOffer[]> => api.get('/scrap-offers').then((r) => r.data),
  respond: (matchId: string, status: 'accepted' | 'declined') =>
    api.put(`/matches/${matchId}/respond`, { status }).then((r) => r.data),
};

export const metricsApi = {
  get: (): Promise<Metrics> => api.get('/metrics').then((r) => r.data),
};

export const demoApi = {
  reset: (): Promise<{ ok: true }> => api.post('/demo/reset').then((r) => r.data),
};
