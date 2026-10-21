const { chromium } = require('playwright')
const { mkdirSync, writeFileSync } = require('node:fs')
const { resolve } = require('node:path')

async function main() {
  const output = resolve('output/playwright')
  mkdirSync(output, { recursive: true })
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE })
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const errors = []
    const paths = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => paths.push(new URL(request.url()).pathname))
    await page.route('**/codex/codex-api/**', (route) => route.abort())
    await page.route('**/codex/codex-local-image?**', (route) => route.fulfill({
      contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jw1cAAAAASUVORK5CYII=', 'base64'),
    }))
    await page.goto('http://127.0.0.1:4173/codex/test/subpath-testchat.html')
    const marker = `PREFIX-TESTCHAT-${Date.now()}`
    await page.locator('#message').fill(`${marker}\n[README](/srv/Projects/TestChat/README.md)\n![preview](/srv/Projects/TestChat/image.png)`)
    await page.getByRole('button', { name: 'Send fixture message' }).click()
    await page.locator('a.message-file-link').first().waitFor()
    const link = await page.locator('a.message-file-link').first().evaluate((element) => ({
      href: element.getAttribute('href'), title: element.getAttribute('title'), text: element.textContent,
    }))
    const results = {
      marker,
      hrefOk: link.href === '/codex/codex-local-browse/srv/Projects/TestChat/README.md',
      titleOk: link.title === '/srv/Projects/TestChat/README.md',
      textOk: link.text.includes('README'),
      imageOk: (await page.locator('.conversation-root img').first().getAttribute('src')).startsWith('/codex/codex-local-image?'),
      errors, apiRequests: paths.filter((path) => path.includes('/codex-api/')),
    }
    for (const theme of ['light', 'dark']) {
      await page.evaluate((value) => document.documentElement.classList.toggle('dark', value === 'dark'), theme)
      await page.waitForTimeout(2200)
      await page.screenshot({ path: resolve(output, `testchat-apache-subpath-${theme}-cjs.png`), fullPage: true })
    }
    writeFileSync(resolve(output, 'testchat-apache-subpath-results.json'), JSON.stringify(results, null, 2))
    console.log(JSON.stringify(results))
    if (!results.hrefOk || !results.titleOk || !results.textOk || !results.imageOk || errors.length || results.apiRequests.length) process.exitCode = 1
  } finally { await browser.close() }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1 })
