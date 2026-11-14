import type { MajorProjectRecord } from "@/content/catalog";

export type ProjectMilestone = { id: string; projectId: string; label: string };

export function milestonesForProjects(projects: MajorProjectRecord[]): ProjectMilestone[] {
  return projects.flatMap((project) => {
    const source = project.details.Milestones ?? "";
    return [...source.matchAll(/((?:P\d+\.\d+|C\d+))\s+([^;]+)/g)].map((match) => ({
      id: match[1],
      projectId: project.id,
      label: match[2].trim().replace(/[.]$/, ""),
    }));
  });
}
