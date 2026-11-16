// Loads the built unpacked extension in Chromium and trains a synthetic CSV through the popup UI
// with FSRS-6, then FSRS-7, then FSRS-6 again on the same popup and training worker.
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

  let workers = 0
  page.on('worker', () => workers++)

  await page.goto(`chrome-extension://${extensionId}/popup.html`)
  assert.equal(await page.evaluate(() => crossOriginIsolated), false)

  const model = page.getByLabel('Model', { exact: true })
  assert.equal(await model.inputValue(), 'FSRS-6', 'default model')
  await page.getByLabel('Timezone').selectOption('Asia/Shanghai')
  await page.setInputFiles('input[type=file]', csvPath)
  const optimize = page.getByRole('button', { name: 'Optimize Parameters' })
  const cards = page.locator('h2 + div.grid > div')
  const cardTexts = async () =>
    (await cards.allInnerTexts()).map((t) => t.replace(/\s+/g, ' '))

  const expected = {
    'FSRS-6': {
      count: 21,
      labels: ['Short-Term Enabled', 'Short-Term Disabled'],
    },
    'FSRS-7': {
      count: 34,
      labels: ['Sched Penalties Enabled', 'Sched Penalties Disabled'],
    },
  }
  const timings = []

  // FSRS-6 -> FSRS-7 -> FSRS-6 on one popup page, reusing one training worker.
  for (const modelVersion of ['FSRS-6', 'FSRS-7', 'FSRS-6']) {
    const { count, labels } = expected[modelVersion]
    const previous = await cardTexts()
    await model.selectOption(modelVersion)
    // Changing the selector must not relabel results trained earlier.
    assert.deepEqual(await cardTexts(), previous)

    await model.evaluate((select) => {
      globalThis.__modelDisabled = false
      new MutationObserver(() => {
        if (select.disabled) globalThis.__modelDisabled = true
      }).observe(select, { attributes: true })
    })
    const started = Date.now()
    await optimize.click()
    await page.waitForFunction(
      ({ modelVersion, count }) => {
        const texts = [
          ...document.querySelectorAll('h2 + div.grid > div'),
        ].map((card) => card.innerText)
        return (
          texts.length === 2 &&
          texts.every(
            (t) =>
              t.startsWith(modelVersion) &&
              t.includes(`Completed · ${count} weights`)
          ) &&
          [...document.querySelectorAll('button')].some(
            (b) => b.textContent === 'Optimize Parameters' && !b.disabled
          )
        )
      },
      { modelVersion, count },
      { timeout: 120000 }
    )
    timings.push(`${modelVersion} ${Date.now() - started}ms`)
    assert.equal(await page.evaluate(() => globalThis.__modelDisabled), true)
    assert.equal(await model.isDisabled(), false)

    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    assert.match(body, /Items Count 2,100/)
    assert.equal(await page.locator('.text-red-700').count(), 0)
    const texts = await cardTexts()
    for (const [i, label] of labels.entries()) {
      assert.ok(texts[i].includes(label), `${modelVersion}: ${texts[i]}`)
    }
    if (modelVersion === 'FSRS-7') {
      assert.ok(!texts.join(' ').includes('Short-Term'), texts.join(' | '))
    }

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
      assert.equal(weights.length, count, `${modelVersion} ${labels[i]}`)
      assert.ok(weights.every(Number.isFinite))
      await copyButtons[i].click()
      const copied = await page.evaluate(() => globalThis.__copied)
      assert.deepEqual(JSON.parse(copied), weights)
    }
    assert.notDeepEqual(lists[0], lists[1], modelVersion)
  }

  assert.equal(workers, 1, 'training worker reused across runs')
  assert.deepEqual(errors, [])
  console.log(
    `browser smoke ok: ${timings.join(', ')}, crossOriginIsolated=false, 1 worker`
  )
} finally {
  await context.close()
  await rm(tmp, { recursive: true, force: true })
}
