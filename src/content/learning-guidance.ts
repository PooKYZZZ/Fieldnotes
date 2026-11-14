export const learningCycle = [
  { title: "Investigate", detail: "Read trusted documentation and predict what you expect to happen." },
  { title: "Build", detail: "Implement one small piece yourself, preferably in an isolated local lab." },
  { title: "Break safely", detail: "Introduce a controlled fault and collect evidence before changing anything." },
  { title: "Explain", detail: "Record what happened, why, how the fix was verified, and what remains uncertain." },
  { title: "Return", detail: "Revisit earlier topics and test recall without relying on notes." },
] as const;

export type CareerPriorityReference =
  | { type: "module"; id: number }
  | { type: "activity"; id: string }
  | { type: "troubleshooting"; id: string }
  | { type: "project"; id: string };

export const careerPriorities: { detail: string; related: CareerPriorityReference[] }[] = [
  {
    detail: "Linux operations and networking: diagnose a service, DNS, and permission issue in a disposable VM.",
    related: [{ type: "module", id: 3 }, { type: "activity", id: "A03" }, { type: "troubleshooting", id: "T03" }, { type: "project", id: "S02" }],
  },
  {
    detail: "Bash/Python and Git: publish a useful small script with tests, graceful failures, and a clear README.",
    related: [{ type: "module", id: 6 }, { type: "module", id: 7 }, { type: "activity", id: "A07" }],
  },
  {
    detail: "Web runtime and Docker: run an API behind NGINX and document ports, health checks, and persistent state.",
    related: [{ type: "module", id: 8 }, { type: "activity", id: "A08" }, { type: "project", id: "S04" }],
  },
  {
    detail: "CI and release basics: demonstrate a workflow failure, the fix, and a verified rollback.",
    related: [{ type: "module", id: 10 }, { type: "module", id: 11 }, { type: "troubleshooting", id: "T05" }, { type: "project", id: "S06" }],
  },
  {
    detail: "Cloud literacy: explain core Azure concepts and shared responsibility; use a student VM only after checking cost and eligibility.",
    related: [{ type: "module", id: 12 }, { type: "activity", id: "A12" }, { type: "project", id: "S08" }],
  },
  {
    detail: "Career evidence: write honest results-focused project bullets and prepare a short architecture walkthrough.",
    related: [{ type: "project", id: "P1" }, { type: "project", id: "P3" }],
  },
  {
    detail: "Applications: apply selectively and keep the learning roadmap flexible; the dated 2027 plan is not a deadline.",
    related: [],
  },
];

export const aiLearningModes = [
  { title: "Independent practice", detail: "Attempt fundamentals first with official docs. Record your prediction and the evidence that surprised you." },
  { title: "AI as a tutor", detail: "Ask for hints, questions, counterexamples, and review of your reasoning before asking for a finished answer." },
  { title: "AI as an engineering assistant", detail: "Inspect generated work, explain its execution and permissions, test failure paths, and verify security and cost consequences." },
] as const;
