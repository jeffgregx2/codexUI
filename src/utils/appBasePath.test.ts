import { afterEach, describe, expect, it, vi } from 'vitest'
import { appPath, normalizeBasePath } from './appBasePath'

afterEach(() => vi.unstubAllEnvs())
describe('deployment URL prefix', () => {
  it('keeps existing root deployments unchanged', () => {
    expect(appPath('/codex-api/rpc', '/')).toBe('/codex-api/rpc')
  })
  it('normalizes a prefix and preserves encoded path/query/hash', () => {
    expect(normalizeBasePath('/codex')).toBe('/codex/')
    expect(appPath('/codex-local-browse/srv/a%20b?x=1#/t', '/codex/'))
      .toBe('/codex/codex-local-browse/srv/a%20b?x=1#/t')
    expect(appPath('/', '/codex/')).toBe('/codex/')
  })
  it('does not double-prefix or rewrite external URLs', () => {
    expect(appPath('/codex/codex-api/rpc', '/codex/')).toBe('/codex/codex-api/rpc')
    expect(appPath('https://example.test/a', '/codex/')).toBe('https://example.test/a')
    expect(appPath('//example.test/a', '/codex/')).toBe('//example.test/a')
  })
  it('rejects unsafe base paths', () => {
    for (const path of ['//elsewhere', '/a/../b', '/a?x=1', 'https://example.test']) {
      expect(() => normalizeBasePath(path)).toThrow()
    }
  })
  it('uses the configured public prefix in server code', () => {
    vi.stubEnv('CODEXUI_BASE_PATH', '/codex/')
    expect(appPath('/codex-api/rpc')).toBe('/codex/codex-api/rpc')
  })
})
