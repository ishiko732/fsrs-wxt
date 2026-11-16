import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import ConfigForm from '@/components/ConfigForm'
import ResultCard from '@/components/ResultCard'
import { useTraining } from '@/hooks/useTraining'
import type { ModelVersion, TrainingStats } from '@/types/training'
import popupIconUrl from '@/assets/popup-icon.svg?inline'

function StatsDisplay({ stats }: { stats: TrainingStats }) {
  if (!stats.parseTime) return null

  return (
    <div className="rounded-lg bg-[#F4F4F5] p-3 text-xs space-y-1">
      <div className="flex justify-between">
        <span className="text-[#71717A]">Parse Time</span>
        <span className="text-[#18181B] font-medium">{stats.parseTime}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-[#71717A]">Items Count</span>
        <span className="text-[#18181B] font-medium">
          {stats.fsrsItemsCount.toLocaleString()}
        </span>
      </div>
      {stats.trainingTime && (
        <div className="flex justify-between">
          <span className="text-[#71717A]">Training Time</span>
          <span className="text-[#18181B] font-medium">
            {stats.trainingTime}
          </span>
        </div>
      )}
    </div>
  )
}

function App() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [modelVersion, setModelVersion] = useState<ModelVersion>('FSRS-6')
  const [timezone, setTimezone] = useState<string>(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return 'Asia/Shanghai'
    }
  })
  const [nextDayStartsAt, setNextDayStartsAt] = useState(4)
  const [numRelearningSteps, setNumRelearningSteps] = useState(1)

  const { isProcessing, results, stats, error, startTraining } = useTraining()

  const handleStart = () => {
    if (!csvFile) return
    startTraining(
      csvFile,
      modelVersion,
      timezone,
      nextDayStartsAt,
      numRelearningSteps
    )
  }

  const handleFileSelect = (file: File) => {
    setCsvFile(file)
  }

  return (
    <div className="p-3 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <img
          src={popupIconUrl}
          alt=""
          aria-hidden="true"
          className="h-8 w-8 shrink-0"
        />
        <div>
          <h1 className="text-base font-semibold text-[#18181B]">
            FSRS Optimizer
          </h1>
          <p className="text-xs text-[#71717A] mt-0.5">
            Upload Anki review logs to optimize FSRS parameters
          </p>
        </div>
      </div>

      {/* File Upload */}
      <FileUpload
        onFileSelect={handleFileSelect}
        disabled={isProcessing}
        selectedFile={csvFile}
      />

      {/* Config */}
      <ConfigForm
        modelVersion={modelVersion}
        setModelVersion={setModelVersion}
        timezone={timezone}
        setTimezone={setTimezone}
        nextDayStartsAt={nextDayStartsAt}
        setNextDayStartsAt={setNextDayStartsAt}
        numRelearningSteps={numRelearningSteps}
        setNumRelearningSteps={setNumRelearningSteps}
        disabled={isProcessing}
      />

      {/* Start Button */}
      <button
        type="button"
        onClick={handleStart}
        disabled={!csvFile || isProcessing}
        className="
          w-full py-2 text-sm font-medium rounded-md border border-[#18181B]
          bg-white text-[#18181B]
          hover:bg-[#F4F4F5] active:bg-[#E4E4E7]
          disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B] focus-visible:ring-offset-2
        "
      >
        {isProcessing ? 'Processing...' : 'Optimize Parameters'}
      </button>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Stats */}
      <StatsDisplay stats={stats} />

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#18181B] mb-2">Results</h2>
          <div className="grid grid-cols-2 gap-2">
            {results.map((result, i) => (
              <ResultCard
                key={`${result.modelVersion}-${i}`}
                result={result}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      {results.length === 0 && !isProcessing && (
        <details className="rounded-lg border border-[#E4E4E7] p-3 group">
          <summary className="text-xs font-medium text-[#18181B] cursor-pointer list-none flex items-center gap-1">
            <span className="inline-block transition-transform duration-200 group-open:rotate-90">&#9654;</span>
            How to use
          </summary>
          <ol className="text-[11px] text-[#71717A] list-decimal list-inside space-y-1 mt-1.5">
            <li>
              Download{' '}
              <a
                href="https://github.com/open-spaced-repetition/fsrs-rs/files/15046782/revlog.csv"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[#18181B]"
              >
                sample CSV
              </a>
            </li>
            <li>Upload your Anki review log CSV file</li>
            <li>Choose a model, then configure timezone and settings</li>
            <li>Click &quot;Optimize Parameters&quot;</li>
          </ol>
        </details>
      )}
    </div>
  )
}

export default App
