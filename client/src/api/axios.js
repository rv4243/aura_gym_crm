import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

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
