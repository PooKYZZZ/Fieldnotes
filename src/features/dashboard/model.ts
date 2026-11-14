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
  statusByLesson: Map<string, ProgressStatus>;
  lessonProgressByModule: Map<string, { completed: number; total: number }>;
  completedLessons: number;
  totalLessons: number;
  completedModules: number;
  currentModule?: DashboardModule;
  currentModuleStatus?: ModuleStatus;
  currentLesson?: DashboardModule["lessons"][number] & { moduleId: number };
  currentLessonStatus?: ProgressStatus;
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
  preferredLesson: (DashboardModule["lessons"][number] & { moduleId: number }) | undefined,
): DashboardNextItem[] {
  const items: DashboardNextItem[] = [];
  const lessonRecords = new Map(records.filter((record) => record.itemType === "lesson").map((record) => [record.itemId, record]));
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

  // Lesson completion is a learner-managed progress marker, not evidence of mastery.
  const nextLesson = preferredLesson
    ? { lesson: preferredLesson, module: modules.find((item) => item.id === preferredLesson.moduleId) }
    : modules.flatMap((module) => module.lessons.map((lesson) => ({ lesson, module })))
      .find(({ lesson }) => lessonRecords.get(lesson.id)?.status !== "completed");
  if (nextLesson?.module) {
    const { lesson, module } = nextLesson;
    items.unshift({
      id: lesson.id,
      type: `Lesson · Module ${String(module.id).padStart(2, "0")}`,
      title: lesson.title,
      detail: `${lessonRecords.get(lesson.id)?.status ? `${lessonRecords.get(lesson.id)?.status.replace("_", " ")} · ` : ""}${module.title}`,
      href: `/modules/${String(module.id).padStart(2, "0")}/lessons/${lesson.id.toLowerCase()}`,
    });
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
  for (const learningModule of modules) for (const lesson of learningModule.lessons) labels.set(`lesson:${lesson.id}`, {
    title: lesson.title,
    href: `/modules/${String(learningModule.id).padStart(2, "0")}/lessons/${lesson.id.toLowerCase()}`,
    type: "Lesson",
  });
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
  const activeLessonRecords = records
    .filter((record) => record.itemType === "lesson" && (record.status === "in_progress" || record.status === "needs_review"))
    .map((record) => ({ kind: "lesson" as const, itemId: record.itemId, status: record.status, updatedAt: record.updatedAt }));
  const mostRecentActiveTarget = [...activeModuleRecords, ...activeActivityRecords].sort((left, right) => right.updatedAt - left.updatedAt)[0];
  const currentActivityRecord = activeActivityRecords.sort((left, right) => right.updatedAt - left.updatedAt)[0];
  const currentActivity = currentActivityRecord ? activities.find((activity) => activity.id === currentActivityRecord.itemId) : undefined;
  const currentActivityStatus = currentActivityRecord?.status;
  const lessonById = new Map(modules.flatMap((module) => module.lessons.map((lesson) => [lesson.id, { ...lesson, moduleId: module.id }] as const)));
  const statusByLesson = new Map(records.filter((record) => record.itemType === "lesson").map((record) => [record.itemId, record.status]));
  const completedLessons = modules.flatMap((module) => module.lessons).filter((lesson) => statusByLesson.get(lesson.id) === "completed").length;
  const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);
  const lessonProgressByModule = new Map(modules.map((module) => [moduleKey(module.id), {
    completed: module.lessons.filter((lesson) => statusByLesson.get(lesson.id) === "completed").length,
    total: module.lessons.length,
  }]));
  const activeLessonRecord = activeLessonRecords.sort((left, right) => right.updatedAt - left.updatedAt)[0];
  const activeLesson = activeLessonRecord ? lessonById.get(activeLessonRecord.itemId) : undefined;
  const nextLesson = modules.flatMap((module) => module.lessons.map((lesson) => ({ ...lesson, moduleId: module.id })))
    .find((lesson) => statusByLesson.get(lesson.id) !== "completed");
  const activeWorkModuleId = mostRecentActiveTarget?.kind === "activity"
    ? activities.find((activity) => activity.id === mostRecentActiveTarget.itemId)?.moduleId
    : Number(mostRecentActiveTarget?.itemId.replace(/^M/, ""));
  const candidateModule = activeLesson
    ? modules.find((module) => module.id === activeLesson.moduleId)
    : mostRecentActiveTarget
      ? modules.find((module) => module.id === activeWorkModuleId)
      : nextLesson ? modules.find((module) => module.id === nextLesson.moduleId) : undefined;
  const currentModule = candidateModule
    ?? modules.find((module) => statusByModule.get(moduleKey(module.id)) !== "completed");
  const nextLessonInModule = currentModule?.lessons.find((lesson) => statusByLesson.get(lesson.id) !== "completed");
  const currentLesson = activeLesson
    ?? (currentModule && nextLessonInModule ? { ...nextLessonInModule, moduleId: currentModule.id } : undefined)
    ?? (mostRecentActiveTarget ? undefined : nextLesson);
  const currentLessonStatus = activeLesson
    ? activeLessonRecord?.status
    : currentLesson ? statusByLesson.get(currentLesson.id) : undefined;
  const currentModuleStatus = currentModule ? statusByModule.get(moduleKey(currentModule.id)) : undefined;

  return {
    statusByModule,
    statusByLesson,
    lessonProgressByModule,
    completedLessons,
    totalLessons,
    completedModules,
    currentModule,
    currentModuleStatus,
    currentLesson,
    currentLessonStatus,
    currentActivity,
    currentActivityStatus,
    nextItems: makeNextItems(modules, activities, majorProjects, smallProjects, records, currentModule, currentActivity, currentLesson),
    recentItems: makeRecentItems(records, modules, activities, majorProjects, smallProjects),
  };
}

export function statusForModule(model: DashboardModel, moduleId: number): ModuleStatus {
  return model.statusByModule.get(moduleKey(moduleId)) ?? "not_started";
}
