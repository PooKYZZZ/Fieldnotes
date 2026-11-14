import "server-only";

import { activities, majorProjects, modules, smallProjects } from "@/content/catalog";
import type { ActivityTask } from "@/content/catalog";
import type { DashboardActivity, DashboardMajorProject, DashboardModule, DashboardSmallProject } from "@/features/dashboard/model";

function preview(text: string, maxLength = 180): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function previewTask(task: ActivityTask): ActivityTask {
  return { ...task, content: preview(task.content) };
}

export function getDashboardContent(): {
  modules: DashboardModule[];
  activities: DashboardActivity[];
  majorProjects: DashboardMajorProject[];
  smallProjects: DashboardSmallProject[];
} {
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
    activities: activities.map(({ id, moduleId, title, tasks }) => ({
      id,
      moduleId,
      title,
      tasks: tasks.map(previewTask),
    })),
    majorProjects: majorProjects.map(({ id, title, details }) => ({
      id,
      title,
      details: { Milestones: details.Milestones ?? "" },
    })),
    smallProjects: smallProjects.map(({ id, title }) => ({ id, title })),
  };
}
