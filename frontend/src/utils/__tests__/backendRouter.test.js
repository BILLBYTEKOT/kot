import { parseBackendPool, pickBackendUrl, buildApiUrl, rewriteRequestUrl } from '../backendRouter';

const ORIGINAL_BACKEND_URLS = process.env.REACT_APP_BACKEND_URLS;

describe('backendRouter', () => {
  beforeEach(() => {
    process.env.REACT_APP_BACKEND_URLS = 'https://a.onrender.com, https://b.onrender.com, https://c.onrender.com';
  });

  afterEach(() => {
    if (ORIGINAL_BACKEND_URLS === undefined) {
      delete process.env.REACT_APP_BACKEND_URLS;
    } else {
      process.env.REACT_APP_BACKEND_URLS = ORIGINAL_BACKEND_URLS;
    }
  });

  it('parses a comma-separated backend pool and trims whitespace', () => {
    expect(parseBackendPool('https://a.onrender.com, https://b.onrender.com, https://c.onrender.com')).toEqual([
      'https://a.onrender.com',
      'https://b.onrender.com',
      'https://c.onrender.com'
    ]);
  });

  it('round-robins across a backend pool', () => {
    const pool = [
      'https://a.onrender.com',
      'https://b.onrender.com',
      'https://c.onrender.com'
    ];

    expect(pickBackendUrl(pool, 0)).toBe('https://a.onrender.com');
    expect(pickBackendUrl(pool, 1)).toBe('https://b.onrender.com');
    expect(pickBackendUrl(pool, 2)).toBe('https://c.onrender.com');
    expect(pickBackendUrl(pool, 3)).toBe('https://a.onrender.com');
  });

  it('builds the API url without duplicate slashes', () => {
    expect(buildApiUrl('https://a.onrender.com', '/super-admin/login')).toBe('https://a.onrender.com/api/super-admin/login');
  });

  it('preserves query strings when rewriting a request to the backend pool', () => {
    expect(rewriteRequestUrl('/api/super-admin/users?skip=0&limit=20')).toMatch(/^https:\/\/.*\/api\/super-admin\/users\?skip=0&limit=20$/);
  });
});
