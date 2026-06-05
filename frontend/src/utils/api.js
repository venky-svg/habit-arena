// All API calls use relative paths — Vite proxies /api → http://habit-arena-backend.onrender.com in dev.
// In production (served by Express), the same relative URLs work natively.
const API_BASE = 'https://habit-arena-backend.onrender.com/api';

// Socket.IO also connects via the same origin in dev (Vite proxies /socket.io → port 5000)
export const SOCKET_URL = 'https://habit-arena-backend.onrender.com';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('habit_arena_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export const api = {
  get(endpoint, options) {
    return request(endpoint, { ...options, method: 'GET' });
  },
  post(endpoint, body, options) {
    return request(endpoint, { ...options, method: 'POST', body });
  },
  put(endpoint, body, options) {
    return request(endpoint, { ...options, method: 'PUT', body });
  },
  delete(endpoint, options) {
    return request(endpoint, { ...options, method: 'DELETE' });
  },
};
