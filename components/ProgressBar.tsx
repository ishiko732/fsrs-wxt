interface ProgressBarProps {
  progress: string // "current/total" format
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  const [current = 0, total = 0] = progress.split('/').map(Number)
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-[#71717A]">{progress}</span>
        <span className="text-xs font-medium text-[#18181B]">
          {percentage}%
        </span>
      </div>
      <div
        className="w-full h-2 rounded-full bg-[#F4F4F5] overflow-hidden"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Training progress: ${percentage}%`}
      >
        <div
          className="h-full rounded-full bg-[#18181B] transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
