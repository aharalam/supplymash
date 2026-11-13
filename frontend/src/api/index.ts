import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const businessApi = {
  list: () => api.get('/businesses').then((r) => r.data),
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
