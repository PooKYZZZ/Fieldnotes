export function moduleRoute(moduleId: number): string {
  return `/modules/${String(moduleId).padStart(2, "0")}`;
}

export function lessonRoute(moduleId: number, lessonId: string): string {
  return `${moduleRoute(moduleId)}/lessons/${lessonId.toLowerCase()}`;
}
