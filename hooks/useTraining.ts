import { useState, useCallback, useRef } from 'react'
import * as Comlink from 'comlink'
import type { OptimizationResult, TrainingStats } from '@/types/training'
import type { TrainingApi } from '@/workers/training.worker'
import TrainingWorker from '@/workers/training.worker?worker'

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
      timezone: string,
      nextDayStartsAt: number,
      numRelearningSteps: number
    ) => {
      setIsProcessing(true)
      setError(null)
      setResults([
        { enableShortTerm: true, parameters: [], progress: '0/0', completed: false },
        { enableShortTerm: false, parameters: [], progress: '0/0', completed: false },
      ])
      setStats({ parseTime: '', trainingTime: '', fsrsItemsCount: 0 })

      try {
        // Reuse Comlink proxy across calls (WASM init is expensive)
        if (!apiRef.current) {
          apiRef.current = Comlink.wrap<TrainingApi>(new TrainingWorker())
        }

        const fileBuffer = await file.arrayBuffer()

        const trainingTime = await apiRef.current.train(
          fileBuffer,
          timezone,
          nextDayStartsAt,
          numRelearningSteps,
          Comlink.proxy({
            onParseComplete(parseTime: string, fsrsItemsCount: number) {
              setStats((prev) => ({ ...prev, parseTime, fsrsItemsCount }))
            },
            onProgress(enableShortTerm: boolean, current: number, total: number) {
              setResults((prev) =>
                prev.map((r) =>
                  r.enableShortTerm === enableShortTerm
                    ? { ...r, progress: `${current}/${total}` }
                    : r
                )
              )
            },
            onTrainingComplete(enableShortTerm: boolean, parameters: number[]) {
              setResults((prev) =>
                prev.map((r) =>
                  r.enableShortTerm === enableShortTerm
                    ? { ...r, parameters, completed: true }
                    : r
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
