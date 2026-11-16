import type { OptimizationResult } from '@/types/training'
import ProgressBar from './ProgressBar'
import ParameterOutput from './ParameterOutput'

interface ResultCardProps {
  result: OptimizationResult
  isProcessing: boolean
}

// Labels come from the trained run, not the current selector value.
function getOptionLabel(result: OptimizationResult) {
  if (result.modelVersion === 'FSRS-7') {
    return result.enableSchedPenalties
      ? 'Sched Penalties Enabled'
      : 'Sched Penalties Disabled'
  }
  return result.enableShortTerm ? 'Short-Term Enabled' : 'Short-Term Disabled'
}

export default function ResultCard({ result, isProcessing }: ResultCardProps) {
  return (
    <div className="rounded-lg border border-[#E4E4E7] p-3">
      <p className="text-[10px] font-medium text-[#71717A]">
        {result.modelVersion}
      </p>
      <h3 className="text-xs font-semibold text-[#18181B] mb-2">
        {getOptionLabel(result)}
      </h3>

      {/* Waiting state */}
      {!result.completed && isProcessing && result.progress === '0/0' && (
        <p className="text-xs text-[#71717A]">Waiting to start...</p>
      )}

      {/* Progress state */}
      {!result.completed && result.progress !== '0/0' && (
        <ProgressBar progress={result.progress} />
      )}

      {/* Completed state */}
      {result.completed && (
        <div>
          <p className="text-xs font-medium text-[#22C55E] mb-1">
            Completed · {result.parameters.length} weights
          </p>
          <ParameterOutput
            parameters={result.parameters}
            label="View Parameters"
          />
        </div>
      )}
    </div>
  )
}
