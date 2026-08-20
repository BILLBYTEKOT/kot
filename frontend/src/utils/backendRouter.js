const DEFAULT_BACKEND_POOL = [
  'http://127.0.0.1:10000',
  'http://127.0.0.1:10000',
  'http://127.0.0.1:10000',
  'http://127.0.0.1:10000'
];

let requestSequence = 0;

const normalizeBackendBase = (value) => {
  if (!value) return '';
  return String(value).trim().replace(/\/+$/, '');
};

export const parseBackendPool = (rawValue) => {
  if (!rawValue) return [];
  const normalized = String(rawValue)
    .split(',')
    .map((item) => normalizeBackendBase(item))
    .filter(Boolean);

  return normalized.length ? normalized : [];
};

export const getBackendPool = () => {
  const configured = parseBackendPool(process.env.REACT_APP_BACKEND_URLS || process.env.REACT_APP_BACKEND_URL);
  if (configured.length > 0) return configured;

  const fallback = parseBackendPool(process.env.REACT_APP_RENDER_BACKEND_POOL);
  if (fallback.length > 0) return fallback;

  return DEFAULT_BACKEND_POOL;
};

export const pickBackendUrl = (pool, index = 0) => {
  if (!Array.isArray(pool) || pool.length === 0) return '';
  return pool[index % pool.length];
};

export const buildApiUrl = (baseUrl, path = '') => {
  const cleanedBase = normalizeBackendBase(baseUrl);
  const cleanedPath = String(path || '').trim();
  if (!cleanedBase) return cleanedPath;
  if (!cleanedPath) return `${cleanedBase}/api`;
  return `${cleanedBase}/api${cleanedPath.startsWith('/') ? cleanedPath : `/${cleanedPath}`}`;
};

export const resolveBackendUrl = (requestIndex = 0) => {
  const pool = getBackendPool();
  return pickBackendUrl(pool, requestIndex);
};

export const getApiBaseUrl = (requestIndex = 0) => {
  const backendUrl = resolveBackendUrl(requestIndex);
  return buildApiUrl(backendUrl);
};

export const rewriteRequestUrl = (targetUrl) => {
  const pool = getBackendPool();
  if (!Array.isArray(pool) || pool.length === 0) return targetUrl;

  const backendUrl = pickBackendUrl(pool, requestSequence++);
  if (!backendUrl) return targetUrl;

  const url = new URL(targetUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  const path = url.pathname.replace(/^\/api/, '');
  const search = url.search || '';
  const hash = url.hash || '';
  return `${backendUrl}/api${path}${search}${hash}`;
};

export default {
  parseBackendPool,
  getBackendPool,
  pickBackendUrl,
  buildApiUrl,
  resolveBackendUrl,
  getApiBaseUrl,
  rewriteRequestUrl
};
