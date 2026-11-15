import type { A01TaskId } from "@/content/a01-task-ids";

export const a01Tasks = [
  {
    id: "confirm-account",
    title: "Confirm your account",
    prompt: "Record the numeric UID used for this investigation and how it will scope your process search. Keep your account name only if it helps interpret the result.",
  },
  {
    id: "choose-process",
    title: "Choose a process you own",
    prompt: "Record one familiar process and its sanitized row values. Compare them with your prediction about what might change in another snapshot.",
  },
  {
    id: "compare-proc",
    title: "Compare the process with /proc",
    prompt: "Observed: which fields agreed, changed, or were unavailable? Interpretation: what does that suggest? Limitation: what does it not establish? Include one descriptor role, not its private target path.",
  },
  {
    id: "check-systemd",
    title: "Check its systemd unit",
    prompt: "Record the unit type and name, or the exact limitation. Explain what that relationship suggests; a scope or no mapping is not proof that the process failed.",
  },
  {
    id: "explain-boundary",
    title: "Explain what the evidence supports",
    prompt: "Use your earlier observations to write a concise conclusion for the teammate: what the evidence supports, one thing it cannot prove, and a useful next check.",
  },
] as const satisfies readonly { id: A01TaskId; title: string; prompt: string }[];

export type A01TaskSelection = A01TaskId | "legacy";
