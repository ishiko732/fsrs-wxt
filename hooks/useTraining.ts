import { useState, useCallback, useRef } from 'react'
import * as Comlink from 'comlink'
import {
  trainingRuns,
  type ModelVersion,
  type OptimizationResult,
  type TrainingStats,
} from '@/types/training'
import type { TrainingApi } from '@/workers/training.worker'
import TrainingWorker from '@/workers/training.worker?worker'
import trainingWorkerUrl from '@/workers/training.worker?worker&url'

// In dev the worker script lives on the Vite server, and an extension page
// cannot start a cross-origin worker directly (Chrome for Testing 156 crashes
// the page). Load it from a same-origin module worker instead.
function createTrainingWorker() {
  if (!import.meta.env.DEV) return new TrainingWorker()
  const source = `import ${JSON.stringify(trainingWorkerUrl)}`
  const blob = new Blob([source], { type: 'text/javascript' })
  return new Worker(URL.createObjectURL(blob), { type: 'module' })
}

export function useTraining() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<OptimizationResult[]>([])
  const [stats, setStats] = useState<TrainingStats>({
    parseTime: '',
    trainingTime: '',
    fsrsItemsCount: 0,
  })
  const [error, setError] = useState<string | null>(null)
  const apiRef = useRef<Comlink.Remote<TrainingApi> | null>(null)

  const startTraining = useCallback(
    async (
      file: File,
      modelVersion: ModelVersion,
      timezone: string,
      nextDayStartsAt: number,
      numRelearningSteps: number
    ) => {
      setIsProcessing(true)
      setError(null)
      setResults(
        trainingRuns[modelVersion].map((run) => ({
          ...run,
          parameters: [],
          progress: '0/0',
          completed: false,
        }))
      )
      setStats({ parseTime: '', trainingTime: '', fsrsItemsCount: 0 })

      try {
        // Reuse Comlink proxy across calls (WASM init is expensive)
        if (!apiRef.current) {
          apiRef.current = Comlink.wrap<TrainingApi>(createTrainingWorker())
        }

        const fileBuffer = await file.arrayBuffer()

        const trainingTime = await apiRef.current.train(
          fileBuffer,
          modelVersion,
          timezone,
          nextDayStartsAt,
          numRelearningSteps,
          Comlink.proxy({
            onParseComplete(parseTime: string, fsrsItemsCount: number) {
              setStats((prev) => ({ ...prev, parseTime, fsrsItemsCount }))
            },
            onProgress(runIndex: number, current: number, total: number) {
              setResults((prev) =>
                prev.map((r, i) =>
                  i === runIndex ? { ...r, progress: `${current}/${total}` } : r
                )
              )
            },
            onTrainingComplete(runIndex: number, parameters: number[]) {
              setResults((prev) =>
                prev.map((r, i) =>
                  i === runIndex ? { ...r, parameters, completed: true } : r
                )
              )
            },
          })
        )

        setStats((prev) => ({ ...prev, trainingTime }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        console.error('Training error:', err)
      } finally {
        setIsProcessing(false)
      }
    },
    []
  )

  return { isProcessing, results, stats, error, startTraining }
}
