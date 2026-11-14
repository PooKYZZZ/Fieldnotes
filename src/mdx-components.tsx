import type { MDXComponents } from "mdx/types";
import { CommandExample } from "@/features/learning/components/command-example";
import { ConceptSection } from "@/features/learning/components/concept-section";
import { KnowledgeCheck } from "@/features/learning/components/knowledge-check";
import { LearningCallout } from "@/features/learning/components/learning-callout";
import { TechnicalFigure } from "@/features/learning/components/technical-figure";

const components = {
  Callout: LearningCallout,
  CommandExample,
  ConceptSection,
  KnowledgeCheck,
  TechnicalFigure,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
