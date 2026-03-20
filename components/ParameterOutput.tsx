import { useState } from 'react'

interface ParameterOutputProps {
  parameters: number[]
  label: string
}

export default function ParameterOutput({
  parameters,
  label,
}: ParameterOutputProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyText = JSON.stringify(parameters)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = copyText
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs text-[#71717A] hover:text-[#18181B] bg-[#F4F4F5] rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B] focus-visible:ring-offset-1"
          aria-expanded={isExpanded}
        >
          <span
            className="inline-block transition-transform duration-200"
            style={{
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            ▶
          </span>
          {label}
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="px-2 py-0.5 text-[10px] rounded border border-[#E4E4E7] bg-white text-[#71717A] hover:text-[#18181B] hover:border-[#18181B] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-1.5">
          <ol className="text-[11px] font-mono bg-[#F4F4F5] rounded-md p-2 list-none m-0 max-h-48 overflow-y-auto">
            {parameters.map((val, i) => (
              <li
                key={i}
                className="flex justify-between py-px text-[#18181B] border-b border-[#E4E4E7] last:border-b-0"
              >
                <span className="text-[#A1A1AA] select-none shrink-0 w-5 text-right mr-2">
                  {i + 1}
                </span>
                <span className="text-right">{val}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
