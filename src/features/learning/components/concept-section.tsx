import type { ReactNode } from "react";

export function ConceptSection({ layout = "reading", children }: { layout?: "reading" | "split"; children: ReactNode }) {
  return <section className={`learning-concept learning-concept--${layout}`}>{children}</section>;
}
