export const a01TaskIds = [
  "confirm-account",
  "choose-process",
  "compare-proc",
  "check-systemd",
  "explain-boundary",
] as const;

export type A01TaskId = (typeof a01TaskIds)[number];
