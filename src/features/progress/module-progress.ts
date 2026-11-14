import type { ProgressStatus } from "@/features/progress/model";

export type ModuleStepProgress = {
  completedSteps: number;
  totalSteps: number;
  percent: number;
};

/**
 * Module completion is one saved learning record; each linked activity is another.
 * The count reflects explicit saved choices, not lesson views or verified mastery.
 */
export function summarizeModuleProgress(
  moduleStatus: ProgressStatus | undefined,
  activityCount: number,
  completedActivityCount: number,
): ModuleStepProgress {
  const safeActivityCount = Math.max(0, Math.floor(activityCount));
  const safeCompletedActivityCount = Math.min(
    safeActivityCount,
    Math.max(0, Math.floor(completedActivityCount)),
  );
  const totalSteps = 1 + safeActivityCount;
  const completedSteps = Number(moduleStatus === "completed") + safeCompletedActivityCount;

  return {
    completedSteps,
    totalSteps,
    percent: Math.round((completedSteps / totalSteps) * 100),
  };
}
