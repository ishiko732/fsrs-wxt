const offsetFormatterCache = new Map<string, Intl.DateTimeFormat>()
const timezoneOffsetPattern =
  /^GMT(?:(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?)?$/

export const getSupportedTimezones = Intl.supportedValuesOf('timeZone')

const supportedTimezoneSet = new Set(getSupportedTimezones)

function getOffsetFormatter(tz: string): Intl.DateTimeFormat {
  let formatter = offsetFormatterCache.get(tz)

  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    })
    offsetFormatterCache.set(tz, formatter)
  }

  return formatter
}

function parseTimezoneOffset(offsetText: string): number {
  const match = timezoneOffsetPattern.exec(offsetText)

  if (!match?.groups?.sign) {
    if (offsetText === 'GMT') {
      return 0
    }
    throw new Error(`Unexpected timezone offset: ${offsetText}`)
  }

  const sign = match.groups.sign === '+' ? 1 : -1
  const hours = Number(match.groups.hours ?? '0')
  const minutes = Number(match.groups.minutes ?? '0')

  return sign * (hours * 60 + minutes)
}

export function isSupportedTimezone(tz: string): boolean {
  return supportedTimezoneSet.has(tz)
}

export function getTimezoneOffset(ms: number, tz: string): number {
  try {
    const offsetText = getOffsetFormatter(tz)
      .formatToParts(new Date(ms))
      .find((part) => part.type === 'timeZoneName')?.value

    if (!offsetText) {
      throw new Error('Missing timeZoneName part')
    }

    return parseTimezoneOffset(offsetText)
  } catch (error) {
    throw new Error(
      `Failed to calculate timezone offset for: ${tz}. ${error instanceof Error ? error.message : String(error)}`
    )
  }
}
