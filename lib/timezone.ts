export const getSupportedTimezones = Intl.supportedValuesOf('timeZone')

const supportedTimezoneSet = new Set(getSupportedTimezones)

export function isSupportedTimezone(tz: string): boolean {
  return supportedTimezoneSet.has(tz)
}
