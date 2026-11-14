import type { ModuleRecord } from "@/content";
import IncidentResponseLesson, { lessonId as incidentResponseId, lessonTitle as incidentResponseTitle } from "@/content/curriculum/modules/23/lessons/01-incident-response.mdx";
import BackupObjectivesLesson, { lessonId as backupObjectivesId, lessonTitle as backupObjectivesTitle } from "@/content/curriculum/modules/23/lessons/02-backups-and-objectives.mdx";
import RestoreVerificationLesson, { lessonId as restoreVerificationId, lessonTitle as restoreVerificationTitle } from "@/content/curriculum/modules/23/lessons/03-restore-verification.mdx";
import { ModuleLessons, type MdxLessonContent } from "@/features/roadmap/module-lessons";

const lessonContent: MdxLessonContent[] = [
  { id: incidentResponseId, title: incidentResponseTitle, Component: IncidentResponseLesson },
  { id: backupObjectivesId, title: backupObjectivesTitle, Component: BackupObjectivesLesson },
  { id: restoreVerificationId, title: restoreVerificationTitle, Component: RestoreVerificationLesson },
];

export function Module23Lessons({ lessons, showHeading = true }: { lessons: ModuleRecord["lessons"]; showHeading?: boolean }) {
  return <ModuleLessons lessons={lessons} content={lessonContent} showHeading={showHeading} />;
}
