import axios from 'axios';

// In dev: Vite proxies /api → localhost:5000 (vite.config.js)
// In prod: VITE_API_BASE_URL points to the deployed backend e.g. https://aura-gym-api.vercel.app/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

// Attach Clerk JWT to every request.
// The token setter is called from App.jsx after Clerk loads.
let _getToken = null;
export function setTokenGetter(fn) { _getToken = fn; }

api.interceptors.request.use(async (config) => {
  if (_getToken) {
    const token = await _getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
