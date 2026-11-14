export const curriculumPhaseNames = [
  "Foundations",
  "Infrastructure & Cloud",
  "Operations & Security",
] as const;

export type CurriculumPhase = (typeof curriculumPhaseNames)[number];
