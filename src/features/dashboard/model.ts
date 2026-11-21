import { milestonesForProjects } from "@/content/project-milestones";
import type { ModuleRecord, ModuleSummary, SmallProjectRecord } from "@/content/catalog";
import type { ProgressSummary, ProgressStatus } from "@/features/progress/model";

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
  completedActivities: number;
  totalActivities: number;
  completedModules: number;
  currentModule?: DashboardModule;
  currentModuleStatus?: ModuleStatus;
  currentLesson?: DashboardModule["lessons"][number] & { moduleId: number };
  currentLessonStatus?: ProgressStatus;
  currentActivity?: DashboardActivity;
  currentActivityStatus?: ProgressStatus;
  currentProject?: DashboardResumeProject;
  nextItems: DashboardNextItem[];
  recentItems: DashboardRecentItem[];
};

export type DashboardModule = ModuleSummary & Pick<ModuleRecord, "activityId">;
export type DashboardActivity = { id: string; moduleId: number; title: string };
export type DashboardProject = { id: string; title: string; details: Record<string, string> };
export type DashboardMajorProject = DashboardProject;
export type DashboardSmallProject = Pick<SmallProjectRecord, "id" | "title" | "details">;
export type DashboardResumeProject = DashboardProject & {
  itemType: "project" | "small_project";
  status?: ProgressStatus;
  checkpoint?: { id: string; label: string };
  completedCheckpointCount: number;
  totalCheckpointCount: number;
  hasSavedDraft: boolean;
};

const moduleKey = (id: number) => `M${String(id).padStart(2, "0")}`;
const moduleHref = (id: number) => `/modules/${String(id).padStart(2, "0")}`;

function makeNextItems(
  modules: DashboardModule[],
  activities: DashboardActivity[],
  majorProjects: DashboardMajorProject[],
  smallProjects: DashboardSmallProject[],
  records: ProgressSummary[],
  currentModule: DashboardModule | undefined,
  currentActivity: DashboardActivity | undefined,
  currentLesson: (DashboardModule["lessons"][number] & { moduleId: number }) | undefined,
  currentProjectId?: string,
): DashboardNextItem[] {
  const items: DashboardNextItem[] = [];
  const lessonRecords = new Map(records.filter((record) => record.itemType === "lesson").map((record) => [record.itemId, record]));
  const activityRecords = new Map(records.filter((record) => record.itemType === "activity").map((record) => [record.itemId, record]));
  const hasSavedWork = records.some((record) => record.status !== "not_started" || record.hasContent);

  // The first-time learner already has a clear primary action. Suggest a later
  // step only after the learner has saved meaningful work, and never repeat the
  // primary lesson or activity link.
  if (hasSavedWork && currentLesson && currentModule) {
    const lessonIndex = currentModule.lessons.findIndex((lesson) => lesson.id === currentLesson.id);
    const followingLesson = currentModule.lessons
      .slice(lessonIndex + 1)
      .find((lesson) => lessonRecords.get(lesson.id)?.status !== "completed");
    if (followingLesson) {
      items.push({
        id: followingLesson.id,
        type: `Next lesson · Module ${String(currentModule.id).padStart(2, "0")}`,
        title: followingLesson.title,
        detail: currentModule.title,
        href: `/modules/${String(currentModule.id).padStart(2, "0")}/lessons/${followingLesson.id.toLowerCase()}`,
      });
    } else {
      const moduleActivity = activities.find((activity) => activity.id === currentModule.activityId);
      if (moduleActivity && activityRecords.get(moduleActivity.id)?.status !== "completed") {
        items.push({
          id: moduleActivity.id,
          type: `Practical activity · Module ${String(currentModule.id).padStart(2, "0")}`,
          title: moduleActivity.title,
          detail: "Apply the ideas from this module",
          href: `/activities/${moduleActivity.id}`,
        });
      }
    }
  } else if (hasSavedWork && currentActivity) {
    const followingModule = modules.find((module) => module.id > currentActivity.moduleId
      && module.lessons.some((lesson) => lessonRecords.get(lesson.id)?.status !== "completed"));
    const followingLesson = followingModule?.lessons.find((lesson) => lessonRecords.get(lesson.id)?.status !== "completed");
    if (followingModule && followingLesson) {
      items.push({
        id: followingLesson.id,
        type: `Continue to Module ${String(followingModule.id).padStart(2, "0")}`,
        title: followingLesson.title,
        detail: followingModule.title,
        href: `/modules/${String(followingModule.id).padStart(2, "0")}/lessons/${followingLesson.id.toLowerCase()}`,
      });
    }
  }

  const allProjects = [...majorProjects, ...smallProjects];
  const projectById = new Map(allProjects.map((project) => [project.id, project]));
  const milestones = new Map(milestonesForProjects(allProjects).map((milestone) => [milestone.id, milestone]));
  const milestoneRecords = new Map(records.filter((record) => record.itemType === "milestone" && record.status === "completed").map((record) => [record.itemId, record]));
  const startedProjects = new Set(records
    .filter((record) => (record.itemType === "project" || record.itemType === "small_project")
      && (["in_progress", "needs_review"].includes(record.status)
        || (record.status === "not_started" && record.hasContent)))
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
    if (projectId === currentProjectId) continue;
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
      href: `/projects/${projectId}#milestone-${id}`,
    });
  }
  const primaryHref = currentLesson
    ? `/modules/${String(currentLesson.moduleId).padStart(2, "0")}/lessons/${currentLesson.id.toLowerCase()}`
    : currentActivity ? `/activities/${currentActivity.id}` : undefined;
  return [...items, ...projectTasks]
    .filter((item) => item.href !== primaryHref)
    .slice(0, 3);
}

function makeRecentItems(records: ProgressSummary[], modules: DashboardModule[], activities: DashboardActivity[], projects: DashboardMajorProject[], smallProjects: DashboardSmallProject[], excludedRecord?: string): DashboardRecentItem[] {
  const milestones = new Map(milestonesForProjects([...projects, ...smallProjects]).map((milestone) => [milestone.id, milestone]));
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
    .filter((record) => `${record.itemType}:${record.itemId}` !== excludedRecord)
    .filter((record) => record.status !== "not_started" || record.hasContent)
    .map((record) => {
      const item = labels.get(`${record.itemType}:${record.itemId}`)
        ?? (record.itemType === "troubleshooting" ? {
          title: `Troubleshooting scenario ${record.itemId}`,
          href: `/activities#troubleshooting-${record.itemId.toLowerCase()}`,
          type: "Troubleshooting",
        } : undefined);
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
  records: ProgressSummary[],
): DashboardModel {
  const moduleRecords = new Map(records.filter((record) => record.itemType === "module").map((record) => [record.itemId, record]));
  const statusByModule = new Map(modules.map((module) => [moduleKey(module.id), moduleRecords.get(moduleKey(module.id))?.status ?? "not_started"]));
  const completedModules = [...statusByModule.values()].filter((status) => status === "completed").length;
  const activityRecords = new Map(records.filter((record) => record.itemType === "activity").map((record) => [record.itemId, record]));
  const lessonById = new Map(modules.flatMap((module) => module.lessons.map((lesson) => [lesson.id, { ...lesson, moduleId: module.id }] as const)));
  const statusByLesson = new Map(records.filter((record) => record.itemType === "lesson").map((record) => [record.itemId, record.status]));
  const completedLessons = modules.flatMap((module) => module.lessons).filter((lesson) => statusByLesson.get(lesson.id) === "completed").length;
  const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);
  const completedActivities = activities.filter((activity) => activityRecords.get(activity.id)?.status === "completed").length;
  const lessonProgressByModule = new Map(modules.map((module) => [moduleKey(module.id), {
    completed: module.lessons.filter((lesson) => statusByLesson.get(lesson.id) === "completed").length,
    total: module.lessons.length,
  }]));
  const activeTargets = records
    .filter((record) => record.status === "in_progress" || record.status === "needs_review"
      || (record.status === "not_started" && record.hasContent))
    .filter((record) => record.itemType === "module" || record.itemType === "lesson" || record.itemType === "activity")
    .sort((left, right) => right.updatedAt - left.updatedAt);
  const mostRecentActiveTarget = activeTargets[0];
  const activeLesson = mostRecentActiveTarget?.itemType === "lesson" ? lessonById.get(mostRecentActiveTarget.itemId) : undefined;
  const activeActivity = mostRecentActiveTarget?.itemType === "activity"
    ? activities.find((activity) => activity.id === mostRecentActiveTarget.itemId)
    : undefined;
  const activeModuleId = mostRecentActiveTarget?.itemType === "module"
    ? Number(mostRecentActiveTarget.itemId.replace(/^M/, ""))
    : activeLesson?.moduleId ?? activeActivity?.moduleId;
  const plannedModule = modules.find((module) => {
    const hasUnfinishedLesson = module.lessons.some((lesson) => statusByLesson.get(lesson.id) !== "completed");
    const pairedActivity = activities.find((activity) => activity.id === module.activityId);
    const hasUnfinishedPairedActivity = pairedActivity && activityRecords.get(pairedActivity.id)?.status !== "completed";
    return hasUnfinishedLesson || hasUnfinishedPairedActivity;
  });
  const candidateModule = activeModuleId
    ? modules.find((module) => module.id === activeModuleId)
    : plannedModule;
  const unfinishedActivity = activities.find((activity) => activityRecords.get(activity.id)?.status !== "completed");
  const currentModule = candidateModule
    ?? (unfinishedActivity ? modules.find((module) => module.id === unfinishedActivity.moduleId) : undefined);
  const nextLessonInModule = currentModule?.lessons.find((lesson) => statusByLesson.get(lesson.id) !== "completed");
  const currentLesson = activeLesson
    ?? (activeActivity ? undefined : nextLessonInModule ? { ...nextLessonInModule, moduleId: currentModule!.id } : undefined);
  const recommendedActivity = !currentLesson && !activeActivity && currentModule
    ? activities.find((activity) => activity.id === currentModule.activityId && activityRecords.get(activity.id)?.status !== "completed")
    : undefined;
  const currentActivity = activeActivity ?? recommendedActivity;
  const currentActivityRecord = currentActivity ? activityRecords.get(currentActivity.id) : undefined;
  const currentActivityStatus = currentActivityRecord?.status ?? (recommendedActivity ? "not_started" : undefined);
  const currentLessonRecord = currentLesson ? records.find((record) => record.itemType === "lesson" && record.itemId === currentLesson.id) : undefined;
  const currentLessonStatus = currentLessonRecord?.status;
  const currentModuleStatus = currentModule ? statusByModule.get(moduleKey(currentModule.id)) : undefined;

  const allProjects: DashboardProject[] = [...majorProjects, ...smallProjects];
  const projectMilestones = milestonesForProjects(allProjects);
  const projectTypes = new Map([
    ...majorProjects.map((project) => [project.id, "project"] as const),
    ...smallProjects.map((project) => [project.id, "small_project"] as const),
  ]);
  const completedMilestoneRecords = records.filter((record) => record.itemType === "milestone" && record.status === "completed");
  const completedMilestoneIds = new Set(completedMilestoneRecords.map((record) => record.itemId));
  const projectResumeCandidates = allProjects.flatMap((project) => {
    const itemType = projectTypes.get(project.id);
    if (!itemType) return [];
    const record = records.find((candidate) => candidate.itemType === itemType && candidate.itemId === project.id);
    if (record?.status === "completed") return [];
    const milestones = projectMilestones.filter((milestone) => milestone.projectId === project.id);
    const projectMilestoneIds = new Set(milestones.map((milestone) => milestone.id));
    const projectCompletionRecords = completedMilestoneRecords.filter((milestone) => projectMilestoneIds.has(milestone.itemId));
    const hasSavedDraft = Boolean(record?.hasContent);
    const explicitlyActive = record?.status === "in_progress" || record?.status === "needs_review";
    if (!explicitlyActive && !hasSavedDraft && projectCompletionRecords.length === 0) return [];
    const updatedAt = Math.max(record?.updatedAt ?? 0, ...projectCompletionRecords.map((milestone) => milestone.updatedAt));
    return [{
      ...project,
      itemType,
      status: record?.status,
      checkpoint: milestones.find((milestone) => !completedMilestoneIds.has(milestone.id)),
      completedCheckpointCount: projectCompletionRecords.length,
      totalCheckpointCount: milestones.length,
      hasSavedDraft,
      updatedAt,
    }];
  }).sort((left, right) => right.updatedAt - left.updatedAt);
  const latestProject = projectResumeCandidates[0];
  const latestLearningUpdate = mostRecentActiveTarget?.updatedAt ?? 0;
  const currentProject = latestProject && latestProject.updatedAt >= latestLearningUpdate
    ? latestProject
    : undefined;

  const excludedRecentRecord = currentProject
    ? `${currentProject.itemType}:${currentProject.id}`
    : mostRecentActiveTarget ? `${mostRecentActiveTarget.itemType}:${mostRecentActiveTarget.itemId}` : undefined;

  return {
    statusByModule,
    statusByLesson,
    lessonProgressByModule,
    completedLessons,
    totalLessons,
    completedActivities,
    totalActivities: activities.length,
    completedModules,
    currentModule,
    currentModuleStatus,
    currentLesson,
    currentLessonStatus,
    currentActivity,
    currentActivityStatus,
    currentProject,
    nextItems: makeNextItems(modules, activities, majorProjects, smallProjects, records, currentModule, currentActivity, currentLesson, currentProject?.id),
    recentItems: makeRecentItems(records, modules, activities, majorProjects, smallProjects, excludedRecentRecord),
  };
}

export function statusForModule(model: DashboardModel, moduleId: number): ModuleStatus {
  return model.statusByModule.get(moduleKey(moduleId)) ?? "not_started";
}
