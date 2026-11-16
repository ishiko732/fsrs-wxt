// Shared types for FSRS training functionality

export type ModelVersion = 'FSRS-6' | 'FSRS-7'

// Options for one training run; spread directly into computeParameters.
export interface TrainingRun {
  modelVersion: ModelVersion
  enableShortTerm: boolean
  // FSRS-7 only; FSRS-6 ignores it.
  enableSchedPenalties?: boolean
}

// Paired comparison per model: FSRS-6 toggles short-term memory, FSRS-7
// keeps short-term enabled and toggles scheduling penalties.
export const trainingRuns: Record<ModelVersion, TrainingRun[]> = {
  'FSRS-6': [
    { modelVersion: 'FSRS-6', enableShortTerm: true },
    { modelVersion: 'FSRS-6', enableShortTerm: false },
  ],
  'FSRS-7': [
    { modelVersion: 'FSRS-7', enableShortTerm: true, enableSchedPenalties: true },
    { modelVersion: 'FSRS-7', enableShortTerm: true, enableSchedPenalties: false },
  ],
}

export interface OptimizationResult extends TrainingRun {
  parameters: number[]
  progress: string
  completed: boolean
}

export interface TrainingStats {
  parseTime: string
  trainingTime: string
  fsrsItemsCount: number
}
