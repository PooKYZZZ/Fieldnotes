import "server-only";

import { activities, majorProjects, modules, projectMilestones, smallProjects } from "@/content/catalog";
import { a01Tasks } from "@/features/activities/a01-task-catalog";
import type { DashboardActivity, DashboardMajorProject, DashboardModule, DashboardSmallProject } from "@/features/dashboard/model";

function preview(text: string, maxLength = 180): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export function getDashboardContent(): {
  modules: DashboardModule[];
  activities: DashboardActivity[];
  majorProjects: DashboardMajorProject[];
  smallProjects: DashboardSmallProject[];
} {
  const milestonesByProject = new Map<string, { id: string; label: string }[]>();
  for (const { projectId, id, label } of projectMilestones) {
    const milestones = milestonesByProject.get(projectId) ?? [];
    milestones.push({ id, label });
    milestonesByProject.set(projectId, milestones);
  }

  return {
    modules: modules.map(({ id, title, phase, level, intro, activityId, lessons }) => ({
      id,
      title,
      phase,
      level,
      intro: preview(intro),
      activityId,
      lessons: lessons.map(({ id: lessonId, title: lessonTitle }) => ({ id: lessonId, title: lessonTitle })),
    })),
    activities: activities.map(({ id, moduleId, title, investigationTasks }) => ({
      id, moduleId, title,
      resumeTasks: (id === "A01" ? a01Tasks : investigationTasks)?.map(({ id, title }) => ({ id, title })),
    })),
    majorProjects: majorProjects.map(({ id, title }) => ({
      id,
      title,
      milestones: milestonesByProject.get(id) ?? [],
    })),
    smallProjects: smallProjects.map(({ id, title }) => ({
      id,
      title,
      milestones: milestonesByProject.get(id) ?? [],
    })),
  };
}
