import type { A01TaskId } from "@/content/a01-task-ids";

export const a01Tasks = [
  {
    id: "confirm-account",
    title: "Confirm your account",
    prompt: "Record the numeric UID used for this investigation. Keep your account name only if it helps you interpret the result.",
  },
  {
    id: "choose-process",
    title: "Choose a process you own",
    prompt: "Before running the command, predict which values might change in another snapshot. Then record one familiar process and its sanitized row values.",
  },
  {
    id: "compare-proc",
    title: "Compare the process with /proc",
    prompt: "Record which fields agree, what changed or was unavailable, and one descriptor's role. Do not save private paths.",
  },
  {
    id: "check-systemd",
    title: "Check its systemd unit",
    prompt: "Record the unit type and name, or what prevented a result. A scope or no unit is a finding, not proof that the process failed.",
  },
  {
    id: "explain-boundary",
    title: "Explain what the evidence supports",
    prompt: "Connect one observation to the system-call diagram. State what it supports and one thing it cannot prove.",
  },
] as const satisfies readonly { id: A01TaskId; title: string; prompt: string }[];

export type A01TaskSelection = A01TaskId | "legacy";
