import { useId } from 'react'
import { getSupportedTimezones } from '@/lib/timezone'

interface ConfigFormProps {
  timezone: string
  setTimezone: (tz: string) => void
  nextDayStartsAt: number
  setNextDayStartsAt: (hour: number) => void
  numRelearningSteps: number
  setNumRelearningSteps: (steps: number) => void
  disabled: boolean
}

const timezones = getSupportedTimezones

export default function ConfigForm({
  timezone,
  setTimezone,
  nextDayStartsAt,
  setNextDayStartsAt,
  numRelearningSteps,
  setNumRelearningSteps,
  disabled,
}: ConfigFormProps) {
  const tzId = useId()
  const nextDayId = useId()
  const relearningId = useId()

  const labelClass = 'block text-xs font-medium text-[#71717A] mb-1'
  const inputClass = `
    w-full text-sm text-[#18181B] border border-[#E4E4E7] rounded-md
    bg-white px-2.5 py-1.5
    focus:outline-none focus-visible:ring-2 focus-visible:ring-[#18181B] focus-visible:ring-offset-1
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={tzId} className={labelClass}>
          Timezone
        </label>
        <select
          id={tzId}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          disabled={disabled}
          className={inputClass}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={nextDayId} className={labelClass}>
            Next Day Starts At
          </label>
          <input
            type="number"
            id={nextDayId}
            value={nextDayStartsAt}
            onChange={(e) =>
              setNextDayStartsAt(Number(e.target.value) || nextDayStartsAt)
            }
            disabled={disabled}
            min={0}
            max={23}
            className={inputClass}
          />
          <p className="mt-0.5 text-[10px] text-[#A1A1AA]">Hour (0-23)</p>
        </div>

        <div>
          <label htmlFor={relearningId} className={labelClass}>
            Relearning Steps
          </label>
          <input
            type="number"
            id={relearningId}
            value={numRelearningSteps}
            onChange={(e) => setNumRelearningSteps(Number(e.target.value))}
            disabled={disabled}
            min={0}
            max={10}
            className={inputClass}
          />
          <p className="mt-0.5 text-[10px] text-[#A1A1AA]">Steps (0-10)</p>
        </div>
      </div>
    </div>
  )
}
