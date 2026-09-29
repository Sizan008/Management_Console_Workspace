export function buildBaseUrl(host: string, path = '', port?: number): string {
  // Ensure host has protocol (required for URL parsing)
  const normalizedHost = /^https?:\/\//i.test(host) ? host : `http://${host}`;
  const u = new URL(normalizedHost);

  if (port !== undefined && port !== null) {
    u.port = String(port);
  }

  // Safe join for path parts
  const clean = (s: string) => s.replace(/^\/+|\/+$/g, '');
  const prefix = clean(u.pathname || '');
  const suffix = clean(path || '');
  const joined = [prefix, suffix].filter(Boolean).join('/');

  u.pathname = joined ? `/${joined}/` : '/';
  // Return with single trailing slash (nice for concatenation)
  return u.toString().replace(/(?<!:)\/\/+/g, '/') // collapse accidental doubles (not after http:)
    .replace(/\/+$/, '/') ;
}

export function joinEndpoint(base: string, endpoint: string): string {
  const b = base.replace(/\/+$/, '');
  const e = endpoint.replace(/^\/+/, '');
  return `${b}/${e}`;
}
