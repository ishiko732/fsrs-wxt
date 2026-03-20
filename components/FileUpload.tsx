import { useCallback, useRef, useState } from 'react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  disabled: boolean
  selectedFile: File | null
}

const MAX_FILE_SIZE_MB = 100

export default function FileUpload({
  onFileSelect,
  disabled,
  selectedFile,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`File size exceeds ${MAX_FILE_SIZE_MB}MB.`)
        return
      }
      if (!file.name.endsWith('.csv')) {
        alert('Please select a CSV file.')
        return
      }
      onFileSelect(file)
    },
    [onFileSelect]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  return (
    <div>
      <div
        className={`
          rounded-lg border-2 border-dashed p-4 text-center cursor-pointer transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed border-[#E4E4E7]' : ''}
          ${isDragging ? 'border-[#18181B] bg-[#F4F4F5]' : 'border-[#E4E4E7] hover:border-[#A1A1AA]'}
        `}
        onClick={() => !disabled && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) inputRef.current?.click()
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
          aria-hidden="true"
        />
        <p className="text-sm text-[#71717A]">
          {selectedFile
            ? selectedFile.name
            : 'Drop CSV file here or click to browse'}
        </p>
        {selectedFile && (
          <p className="text-xs text-[#A1A1AA] mt-1">
            {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        )}
      </div>
    </div>
  )
}
