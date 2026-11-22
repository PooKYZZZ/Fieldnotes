import { isValidDateTimestamp } from "@/features/progress/timestamp";

export function formatSavedDate(timestamp: number, options: Intl.DateTimeFormatOptions): { text: string; dateTime?: string } {
  if (!isValidDateTimestamp(timestamp)) return { text: "Saved date unavailable" };
  const date = new Date(timestamp);
  return {
    text: new Intl.DateTimeFormat(undefined, options).format(date),
    dateTime: date.toISOString(),
  };
}
