import type { OptimizationResult } from '@/types/training'
import ProgressBar from './ProgressBar'
import ParameterOutput from './ParameterOutput'

interface ResultCardProps {
  result: OptimizationResult
  isProcessing: boolean
}

export default function ResultCard({ result, isProcessing }: ResultCardProps) {
  const label = result.enableShortTerm
    ? 'Short-Term Enabled'
    : 'Short-Term Disabled'

  return (
    <div className="rounded-lg border border-[#E4E4E7] p-3">
      <h3 className="text-xs font-semibold text-[#18181B] mb-2">{label}</h3>

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
          <p className="text-xs font-medium text-[#18181B] mb-1">Completed</p>
          <ParameterOutput
            parameters={result.parameters}
            label="View Parameters"
          />
        </div>
      )}
    </div>
  )
}
