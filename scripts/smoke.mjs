// Node smoke test for the threadless wasm32-wasip1 binding path used by the training worker.
// Usage: node scripts/smoke.mjs
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

// Deterministic synthetic Anki-style revlog (300 cards x 8 reviews), no user data.
export function syntheticCsv() {
  let seed = 42
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
  const rows = ['card_id,review_time,review_rating,review_state,review_duration']
  const DAY = 86400000
  const start = Date.UTC(2024, 0, 1, 12)
  for (let c = 0; c < 300; c++) {
    let t = start + Math.floor(rnd() * 30) * DAY
    let ivl = 1
    let state = 0
    for (let r = 0; r < 8; r++) {
      const rating = rnd() < 0.85 ? (rnd() < 0.8 ? 3 : 4) : 1
      rows.push([1700000000000 + c, t, rating, state, 8000].join(','))
      state = rating === 1 && state === 2 ? 3 : state === 0 ? 1 : 2
      ivl = rating === 1 ? 1 : Math.max(1, Math.round(ivl * (rating === 4 ? 3 : 2.3)))
      t += ivl * DAY + Math.floor(rnd() * 3600000)
    }
  }
  return rows.join('\n') + '\n'
}

if (import.meta.main) {
  const pkg = '@open-spaced-repetition/binding-wasm32-wasip1'
  const { instantiate } = await import(`${pkg}/workerd`)
  const wasm = await readFile(new URL(import.meta.resolve(`${pkg}/wasm.wasm`)))
  const binding = await instantiate(WebAssembly.compile(wasm))

  const text = syntheticCsv()
  assert.equal(text.trim().split('\n').length, 2401)
  const csv = new TextEncoder().encode(text)

  // Same paired runs as types/training.ts trainingRuns.
  const runsByModel = {
    'FSRS-6': [{ enableShortTerm: true }, { enableShortTerm: false }],
    'FSRS-7': [
      { enableShortTerm: true, enableSchedPenalties: true },
      { enableShortTerm: true, enableSchedPenalties: false },
    ],
  }
  const weightCounts = { 'FSRS-6': 21, 'FSRS-7': 34 }

  for (const [modelVersion, runs] of Object.entries(runsByModel)) {
    const items = binding.convertCsvToFsrsItems(csv, 4, 'Asia/Shanghai', modelVersion)
    assert.equal(items.length, 2100, modelVersion)

    const pair = []
    for (const run of runs) {
      const label = `${modelVersion} ${JSON.stringify(run)}`
      let progressCalls = 0
      const parameters = await binding.computeParameters(items, {
        ...run,
        modelVersion,
        numRelearningSteps: 1,
        progress: () => {
          progressCalls++
        },
      })
      assert.equal(parameters.length, weightCounts[modelVersion], label)
      assert.ok(parameters.every(Number.isFinite), label)
      assert.ok(progressCalls > 0, label)
      console.log(`${label}: ${JSON.stringify(parameters)}`)
      pair.push(parameters)
    }
    // The toggled option must reach training.
    assert.notDeepEqual(pair[0], pair[1], modelVersion)
  }

  // The removed JS offset callback is no longer accepted as the 4th argument.
  assert.throws(() =>
    binding.convertCsvToFsrsItems(csv, 4, 'Asia/Shanghai', () => 0)
  )

  console.log('smoke ok: 2100 items, 21 FSRS-6 / 34 FSRS-7 weights per run')
}
