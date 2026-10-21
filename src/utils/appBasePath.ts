/** Public URL prefix. Apache strips it before forwarding to the loopback backend. */
export function normalizeBasePath(value = '/'): string {
  const path = value.trim() || '/'
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]*$/u.test(path)) {
    throw new Error('Base path must be an absolute URL path, for example /codex/')
  }
  return path === '/' ? '/' : path.replace(/\/$/u, '') + '/'
}

export function appBasePath(): string {
  return normalizeBasePath(typeof window === 'undefined'
    ? process.env.CODEXUI_BASE_PATH || '/'
    : import.meta.env.BASE_URL || '/')
}

export function appPath(path: string, base = appBasePath()): string {
  const prefix = normalizeBasePath(base)
  if (!path.startsWith('/') || path.startsWith('//')) return path
  if (prefix === '/' || path.startsWith(prefix)) return path
  return prefix.slice(0, -1) + path
}
