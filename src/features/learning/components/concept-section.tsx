import type { ReactNode } from "react";

export function ConceptSection({ layout = "reading", children }: { layout?: "reading" | "split" | "paired"; children: ReactNode }) {
  return <section className={`learning-concept learning-concept--${layout}`}>{children}</section>;
}
