// Training worker — runs WASM optimizer in a dedicated worker thread.
// Exposed via Comlink for direct async function calls from main thread.

import * as Comlink from 'comlink'
import { getOptimizer } from '@/lib/optimizer'
import { isSupportedTimezone } from '@/lib/timezone'

// Pinned so output stays 21 FSRS-6 weights; the binding defaults to FSRS-7.
const modelVersion = 'FSRS-6'

// ── Callbacks passed from main thread via Comlink.proxy() ───────────

export interface TrainingCallbacks {
  onParseComplete: (parseTime: string, fsrsItemsCount: number) => void
  onProgress: (enableShortTerm: boolean, current: number, total: number) => void
  onTrainingComplete: (enableShortTerm: boolean, parameters: number[]) => void
}

// ── Exposed API ─────────────────────────────────────────────────────

const api = {
  async train(
    fileBuffer: ArrayBuffer,
    timezone: string,
    nextDayStartsAt: number,
    numRelearningSteps: number,
    callbacks: TrainingCallbacks
  ): Promise<string> {
    const optimizer = await getOptimizer()

    if (!isSupportedTimezone(timezone)) {
      throw new Error(`Unsupported timezone: ${timezone}`)
    }

    // Parse CSV
    const parseStart = performance.now()
    const buffer = new Uint8Array(fileBuffer)
    const fsrsItems = optimizer.convertCsvToFsrsItems(
      buffer,
      nextDayStartsAt,
      timezone,
      modelVersion
    )
    const parseTime = `${(performance.now() - parseStart).toFixed(2)}ms`
    callbacks.onParseComplete(parseTime, fsrsItems.length)

    // Train sequentially; the threadless binding blocks this worker while training
    const trainingStart = performance.now()

    for (const enableShortTerm of [true, false]) {
      const parameters = await optimizer.computeParameters(fsrsItems, {
        enableShortTerm,
        numRelearningSteps,
        modelVersion,
        progress: (current: number, total: number) => {
          callbacks.onProgress(enableShortTerm, current, total)
        },
      })
      callbacks.onTrainingComplete(enableShortTerm, parameters)
    }

    return `${(performance.now() - trainingStart).toFixed(2)}ms`
  },
}

export type TrainingApi = typeof api

Comlink.expose(api)
