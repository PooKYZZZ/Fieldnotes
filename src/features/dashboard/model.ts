import { milestonesForProjects } from "@/content/project-milestones";
import type { ActivityTask, ModuleRecord, ModuleSummary, SmallProjectRecord } from "@/content/catalog";
import type { ProgressRecord, ProgressStatus } from "@/features/progress/model";

export type ModuleStatus = ProgressStatus | "not_started";
export type DashboardNextItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  href: string;
};
export type DashboardRecentItem = {
  id: string;
  title: string;
  detail: string;
  date: number;
  href: string;
};

export type DashboardModel = {
  statusByModule: Map<string, ModuleStatus>;
  completedModules: number;
  currentModule?: DashboardModule;
  currentModuleStatus?: ModuleStatus;
  currentActivity?: DashboardActivity;
  currentActivityStatus?: ProgressStatus;
  nextItems: DashboardNextItem[];
  recentItems: DashboardRecentItem[];
};

export type DashboardModule = ModuleSummary & Pick<ModuleRecord, "activityId">;
export type DashboardActivity = { id: string; moduleId: number; title: string; tasks: ActivityTask[] };
export type DashboardMajorProject = { id: string; title: string; details: Record<string, string> };
export type DashboardSmallProject = Pick<SmallProjectRecord, "id" | "title">;

const moduleKey = (id: number) => `M${String(id).padStart(2, "0")}`;
const moduleHref = (id: number) => `/modules/${String(id).padStart(2, "0")}`;

function makeNextItems(
  modules: DashboardModule[],
  activities: DashboardActivity[],
  majorProjects: DashboardMajorProject[],
  smallProjects: DashboardSmallProject[],
  records: ProgressRecord[],
  currentModule: DashboardModule | undefined,
  currentActivity: DashboardActivity | undefined,
): DashboardNextItem[] {
  const items: DashboardNextItem[] = [];
  const activityRecords = new Map(records.filter((record) => record.itemType === "activity").map((record) => [record.itemId, record]));
  const moduleRecords = new Map(records.filter((record) => record.itemType === "module").map((record) => [record.itemId, record]));
  const activity = currentActivity
    ?? (currentModule ? activities.find((item) => item.id === currentModule.activityId) : undefined);
  if (activity && activityRecords.get(activity.id)?.status !== "completed") {
    const moduleStatus = moduleRecords.get(moduleKey(activity.moduleId))?.status ?? "not_started";
    const activityStatus = activityRecords.get(activity.id)?.status;
    const eligible = moduleStatus !== "not_started" || activityStatus === "in_progress" || activityStatus === "needs_review";
    if (eligible) {
      for (const task of activity.tasks) {
        if (items.length >= 3) break;
        items.push({
          id: `${activity.id}-${task.kind}`,
          type: `${task.title} · Module ${String(activity.moduleId).padStart(2, "0")}`,
          title: task.content,
          detail: `${activity.id} · ${activity.title}`,
          href: `/activities/${activity.id}`,
        });
      }
    }
  }

  const projectById = new Map(majorProjects.map((project) => [project.id, project]));
  const milestones = new Map(milestonesForProjects(majorProjects).map((milestone) => [milestone.id, milestone]));
  const milestoneRecords = new Map(records.filter((record) => record.itemType === "milestone" && record.status === "completed").map((record) => [record.itemId, record]));
  const startedProjects = new Set(records
    .filter((record) => (record.itemType === "project" || record.itemType === "small_project") && ["in_progress", "needs_review"].includes(record.status))
    .map((record) => record.itemId));
  for (const record of records) {
    if (record.itemType === "milestone" && record.status === "completed") {
      const project = milestones.get(record.itemId);
      if (project) startedProjects.add(project.projectId);
    }
  }
  const projectIds = new Set([...majorProjects.map((project) => project.id), ...smallProjects.map((project) => project.id)]);
  const projectTasks: DashboardNextItem[] = [];
  for (const projectId of startedProjects) {
    if (!projectIds.has(projectId)) continue;
    const nextMilestone = [...milestones.entries()].find(([id, milestone]) => milestone.projectId === projectId && !milestoneRecords.has(id));
    if (!nextMilestone) continue;
    const [id, milestone] = nextMilestone;
    const project = projectById.get(projectId);
    if (!project) continue;
    projectTasks.push({
      id,
      type: `Project milestone · ${projectId}`,
      title: milestone.label,
      detail: project.title,
      href: `/projects/${projectId}`,
    });
  }
  return [...items, ...projectTasks].slice(0, 5);
}

function makeRecentItems(records: ProgressRecord[], modules: DashboardModule[], activities: DashboardActivity[], projects: DashboardMajorProject[], smallProjects: DashboardSmallProject[]): DashboardRecentItem[] {
  const milestones = new Map(milestonesForProjects(projects).map((milestone) => [milestone.id, milestone]));
  const labels = new Map<string, { title: string; href: string; type: string }>();
  for (const learningModule of modules) labels.set(`module:${moduleKey(learningModule.id)}`, { title: learningModule.title, href: moduleHref(learningModule.id), type: "Module" });
  for (const activity of activities) labels.set(`activity:${activity.id}`, { title: activity.title, href: `/activities/${activity.id}`, type: "Activity" });
  for (const project of projects) labels.set(`project:${project.id}`, { title: project.title, href: `/projects/${project.id}`, type: "Project" });
  for (const project of smallProjects) labels.set(`small_project:${project.id}`, { title: project.title, href: `/projects/${project.id}`, type: "Project" });
  for (const [id, milestone] of milestones) labels.set(`milestone:${id}`, { title: milestone.label, href: `/projects/${milestone.projectId}`, type: "Milestone" });

  return records
    .filter((record) => record.status !== "not_started" || Boolean(record.notes.trim() || record.evidence.trim() || record.repositoryUrl.trim()))
    .map((record) => {
      const item = labels.get(`${record.itemType}:${record.itemId}`);
      if (!item) return undefined;
      const action = record.itemType === "milestone" && record.status === "completed"
        ? "Milestone completed"
        : record.status === "completed"
          ? `${item.type} marked complete`
          : record.status === "needs_review"
            ? `${item.type} marked for review`
            : "Learning notes updated";
      return {
        id: `${record.itemType}:${record.itemId}`,
        title: item.title,
        detail: action,
        date: record.updatedAt,
        href: item.href,
      };
    })
    .filter((item): item is DashboardRecentItem => Boolean(item))
    .sort((left, right) => right.date - left.date)
    .slice(0, 4);
}

export function buildDashboardModel(
  modules: DashboardModule[],
  activities: DashboardActivity[],
  majorProjects: DashboardMajorProject[],
  smallProjects: DashboardSmallProject[],
  records: ProgressRecord[],
): DashboardModel {
  const moduleRecords = new Map(records.filter((record) => record.itemType === "module").map((record) => [record.itemId, record]));
  const statusByModule = new Map(modules.map((module) => [moduleKey(module.id), moduleRecords.get(moduleKey(module.id))?.status ?? "not_started"]));
  const completedModules = [...statusByModule.values()].filter((status) => status === "completed").length;
  const activeModuleRecords = records
    .filter((record) => record.itemType === "module" && (record.status === "in_progress" || record.status === "needs_review"))
    .map((record) => ({ kind: "module" as const, itemId: record.itemId, status: record.status, updatedAt: record.updatedAt }));
  const activeActivityRecords = records
    .filter((record) => record.itemType === "activity" && (record.status === "in_progress" || record.status === "needs_review"))
    .map((record) => ({ kind: "activity" as const, itemId: record.itemId, status: record.status, updatedAt: record.updatedAt }));
  const activeTarget = [...activeModuleRecords, ...activeActivityRecords].sort((left, right) => right.updatedAt - left.updatedAt)[0];
  const currentActivity = activeTarget?.kind === "activity" ? activities.find((activity) => activity.id === activeTarget.itemId) : undefined;
  const currentActivityStatus = activeTarget?.kind === "activity" ? activeTarget.status : undefined;
  const targetModuleId = currentActivity?.moduleId
    ?? Number(activeTarget?.itemId.replace(/^M/, ""));
  const currentModule = (activeTarget
    ? modules.find((module) => module.id === targetModuleId)
    : undefined)
    ?? modules.find((module) => statusByModule.get(moduleKey(module.id)) !== "completed");
  const currentModuleStatus = currentModule ? statusByModule.get(moduleKey(currentModule.id)) : undefined;

  return {
    statusByModule,
    completedModules,
    currentModule,
    currentModuleStatus,
    currentActivity,
    currentActivityStatus,
    nextItems: makeNextItems(modules, activities, majorProjects, smallProjects, records, currentModule, currentActivity),
    recentItems: makeRecentItems(records, modules, activities, majorProjects, smallProjects),
  };
}

export function statusForModule(model: DashboardModel, moduleId: number): ModuleStatus {
  return model.statusByModule.get(moduleKey(moduleId)) ?? "not_started";
}
