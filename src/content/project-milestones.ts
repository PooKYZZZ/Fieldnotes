import type { ProjectRecordBase } from "@/content/catalog";

export type ProjectMilestone = {
  id: string;
  projectId: string;
  label: string;
  guidance: string;
  hints: ProjectMilestoneHint[];
};

export type ProjectMilestoneHint = {
  title: string;
  content: string;
};

export function milestonesForProjects(projects: Pick<ProjectRecordBase, "id" | "details">[]): ProjectMilestone[] {
  return projects.flatMap((project) => {
    const source = project.details["Build milestones"] ?? project.details.Milestones ?? "";
    const sections = source.split(/^###\s+(.+?)\s*$/m);
    const milestones: ProjectMilestone[] = [];

    for (let index = 1; index < sections.length; index += 2) {
      const heading = sections[index].trim();
      const match = heading.match(/^((?:S\d{2}|P\d+)\.\d+|C\d+)\s+[—–-]\s+(.+)$/);
      const rawGuidance = sections[index + 1]?.trim() ?? "";
      const hintSections = rawGuidance.split(/^####\s+Hint\s+\d+\s+[—–-]\s+(.+?)\s*$/m);
      const hints: ProjectMilestoneHint[] = [];
      for (let hintIndex = 1; hintIndex + 1 < hintSections.length; hintIndex += 2) {
        const title = hintSections[hintIndex]?.trim();
        const content = hintSections[hintIndex + 1]?.trim();
        if (title && content) hints.push({ title, content });
      }
      const guidance = hintSections[0]?.trim() ?? "";
      if (!match || !guidance) continue;
      milestones.push({ id: match[1], projectId: project.id, label: match[2].trim(), guidance, hints });
    }

    return milestones;
  });
}
