// Training worker — runs WASM optimizer in a dedicated worker thread.
// Exposed via Comlink for direct async function calls from main thread.

import * as Comlink from 'comlink'
import { getOptimizer } from '@/lib/optimizer'
import { isSupportedTimezone } from '@/lib/timezone'
import { trainingRuns, type ModelVersion } from '@/types/training'

// ── Callbacks passed from main thread via Comlink.proxy() ───────────

export interface TrainingCallbacks {
  onParseComplete: (parseTime: string, fsrsItemsCount: number) => void
  // runIndex is the position in trainingRuns[modelVersion]
  onProgress: (runIndex: number, current: number, total: number) => void
  onTrainingComplete: (runIndex: number, parameters: number[]) => void
}

// ── Exposed API ─────────────────────────────────────────────────────

const api = {
  async train(
    fileBuffer: ArrayBuffer,
    modelVersion: ModelVersion,
    timezone: string,
    nextDayStartsAt: number,
    numRelearningSteps: number,
    callbacks: TrainingCallbacks
  ): Promise<string> {
    const optimizer = await getOptimizer()

    if (!isSupportedTimezone(timezone)) {
      throw new Error(`Unsupported timezone: ${timezone}`)
    }

    const runs = trainingRuns[modelVersion]
    if (!runs) {
      throw new Error(`Unsupported model version: ${modelVersion}`)
    }

    // Parse CSV with the same model version used for training
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

    for (const [runIndex, run] of runs.entries()) {
      const parameters = await optimizer.computeParameters(fsrsItems, {
        ...run,
        numRelearningSteps,
        progress: (current: number, total: number) => {
          callbacks.onProgress(runIndex, current, total)
        },
      })
      callbacks.onTrainingComplete(runIndex, parameters)
    }

    return `${(performance.now() - trainingStart).toFixed(2)}ms`
  },
}

export type TrainingApi = typeof api

Comlink.expose(api)
