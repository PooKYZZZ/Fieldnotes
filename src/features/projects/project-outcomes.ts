export const buildOutcomes: Partial<Record<string, string>> = {
  P1: "A pipeline that builds, deploys, verifies, and rolls back a service.",
  P2: "A monitored service with alerting, a recovery drill, and a runbook.",
  P3: "An end-to-end delivery system with release controls and recovery evidence.",
  S01: "A command-line report that finds error patterns in sanitized logs.",
  S02: "A notebook of repeatable network checks and diagnostic evidence.",
  S03: "A read-only report that explains a service’s observed state.",
  S04: "A validator that flags common problems in Compose configuration.",
  S05: "A tool that verifies backup integrity and records the result.",
  S06: "A gallery of intentional CI failures with diagnosis and repair notes.",
  S07: "A probe that checks metrics and demonstrates an alert.",
  S08: "A read-only inventory report for reviewing Terraform cleanup.",
};
