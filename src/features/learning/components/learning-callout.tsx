import type { ReactNode } from "react";

export function LearningCallout({ title, tone = "note", children }: {
  title: string;
  tone?: "note" | "safety";
  children: ReactNode;
}) {
  return (
    <aside className={`learning-callout learning-callout--${tone}`} aria-label={tone === "safety" ? "Safety boundary" : "Learning note"}>
      <h4>{title}</h4>
      <div>{children}</div>
    </aside>
  );
}
