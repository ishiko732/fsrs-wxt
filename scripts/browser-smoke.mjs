// Loads the built unpacked extension in Chromium and trains a synthetic CSV through the popup UI.
// Playwright is not a project dependency; point at an existing install:
//   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core \
//   CHROMIUM="/path/to/Google Chrome for Testing" \
//   node scripts/browser-smoke.mjs [.output/chrome-mv3]
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { syntheticCsv } from './smoke.mjs'

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_CORE ?? 'playwright-core'
)
const extensionPath = resolve(process.argv[2] ?? '.output/chrome-mv3')
// Unpacked extension id: sha256 of the absolute path, first 32 hex digits mapped to a-p.
const extensionId = [
  ...createHash('sha256').update(extensionPath).digest('hex').slice(0, 32),
]
  .map((c) => String.fromCharCode(97 + parseInt(c, 16)))
  .join('')

const tmp = await mkdtemp(join(tmpdir(), 'fsrs-browser-smoke-'))
const csvPath = join(tmp, 'synthetic-revlog.csv')
await writeFile(csvPath, syntheticCsv())

const context = await chromium.launchPersistentContext(join(tmp, 'profile'), {
  executablePath: process.env.CHROMIUM,
  headless: true,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
})

try {
  const page = await context.newPage()
  const errors = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  // Capture copied text without relying on clipboard permissions.
  await page.addInitScript(() => {
    Clipboard.prototype.writeText = async (text) => {
      globalThis.__copied = text
    }
  })

  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  assert.equal(await page.evaluate(() => crossOriginIsolated), false)

  await page.selectOption('select', 'Asia/Shanghai')
  await page.setInputFiles('input[type=file]', csvPath)
  const optimize = page.getByRole('button', { name: 'Optimize Parameters' })
  const started = Date.now()
  await optimize.click()
  await page.getByText('View Parameters').nth(1).waitFor({ timeout: 120000 })
  await optimize.waitFor({ timeout: 120000 })
  const elapsed = Date.now() - started

  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
  assert.match(body, /Items Count 2,100/)
  assert.match(body, /Short-Term Enabled/)
  assert.match(body, /Short-Term Disabled/)
  assert.equal(await page.locator('.text-red-700').count(), 0)

  for (const button of await page.getByText('View Parameters').all()) {
    await button.click()
  }
  const lists = await page
    .locator('ol.font-mono')
    .evaluateAll((ols) =>
      ols.map((ol) =>
        [...ol.querySelectorAll('li span:last-child')].map((s) =>
          Number(s.textContent)
        )
      )
    )
  assert.equal(lists.length, 2)

  const copyButtons = await page.getByRole('button', { name: 'Copy' }).all()
  for (const [i, weights] of lists.entries()) {
    assert.equal(weights.length, 21)
    assert.ok(weights.every(Number.isFinite))
    await copyButtons[i].click()
    const copied = await page.evaluate(() => globalThis.__copied)
    assert.deepEqual(JSON.parse(copied), weights)
  }

  assert.deepEqual(errors, [])
  console.log(
    `browser smoke ok: ${elapsed}ms, crossOriginIsolated=false, weights ${lists.map((l) => l.length).join('/')}`
  )
} finally {
  await context.close()
  await rm(tmp, { recursive: true, force: true })
}
