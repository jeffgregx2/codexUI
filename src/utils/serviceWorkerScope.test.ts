import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

function worker() {
  const handlers: Record<string, (event: any) => void> = {}
  const deleted: string[] = []
  runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), {
    URL,
    self: {
      registration: { scope: 'https://example.test/codex/' },
      location: { origin: 'https://example.test' },
      addEventListener: (name: string, callback: (event: any) => void) => { handlers[name] = callback },
      skipWaiting() {}, clients: { claim() {} },
    },
    caches: {
      keys: async () => ['chlamyfp-cache', 'codexweb-shell:/codex/:v2', 'codexweb-shell:/other/:v2'],
      delete: async (name: string) => { deleted.push(name); return true },
    },
  })
  return { handlers, deleted }
}

describe('service worker subpath isolation', () => {
  it('only deletes older caches in its own namespace', async () => {
    const { handlers, deleted } = worker()
    let completion: Promise<unknown> | undefined
    handlers.activate({ waitUntil: (promise: Promise<unknown>) => { completion = promise } })
    await completion
    expect(deleted).toEqual(['codexweb-shell:/codex/:v2'])
  })
  it('does not intercept other sites, private APIs or local-file endpoints', () => {
    const { handlers } = worker()
    for (const path of ['/ChlamyFPv2/index.php', '/codex/codex-api/rpc', '/codex/codex-local-file?path=x']) {
      let intercepted = false
      handlers.fetch({
        request: { method: 'GET', url: 'https://example.test' + path, mode: 'navigate' },
        respondWith() { intercepted = true },
      })
      expect(intercepted).toBe(false)
    }
  })
})
