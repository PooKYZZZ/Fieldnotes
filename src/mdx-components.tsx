import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { MarkdownPre } from "@/components/ui/markdown-content";
import { CommandExample } from "@/features/learning/components/command-example";
import { ConceptSection } from "@/features/learning/components/concept-section";
import { KnowledgeCheck } from "@/features/learning/components/knowledge-check";
import { LearningCallout } from "@/features/learning/components/learning-callout";
import { TechnicalFigure } from "@/features/learning/components/technical-figure";

const components = {
  pre: ({ children }: ComponentProps<"pre">) => <MarkdownPre data-copyable>{children}</MarkdownPre>,
  Callout: LearningCallout,
  CommandExample,
  ConceptSection,
  KnowledgeCheck,
  TechnicalFigure,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
