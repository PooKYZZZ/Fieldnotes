export const maxProgressClockSkewMs = 24 * 60 * 60 * 1000;
export const maxPersistedProgressFutureHeadroomMs = 1000;
export const maxDateTimestampMs = 8.64e15;

export function isValidProgressTimestamp(value: number, now = Date.now()): boolean {
  return Number.isSafeInteger(value)
    && value >= 0
    && value <= maxDateTimestampMs
    && value <= Math.min(maxDateTimestampMs, now + maxProgressClockSkewMs);
}

export function isValidDateTimestamp(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= maxDateTimestampMs;
}

export function isValidPersistedProgressTimestamp(value: number, now = Date.now()): boolean {
  return isValidDateTimestamp(value)
    && value <= Math.min(maxDateTimestampMs, now + maxProgressClockSkewMs + maxPersistedProgressFutureHeadroomMs);
}
