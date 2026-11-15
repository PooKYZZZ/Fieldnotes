import type { Metadata } from "next";
import { NotebookPen, ShieldCheck } from "lucide-react";
import { ProgressBackup } from "@/features/progress/progress-backup";
import { ProgressNotebook, type NotebookItem } from "@/features/progress/progress-notebook";
import { activities, majorProjects, modules, projectMilestones, smallProjects } from "@/content";
import { a01Tasks } from "@/features/activities/a01-task-catalog";
import { moduleDefinitions } from "@/content/curriculum/modules/definitions";

export const metadata: Metadata = { title: "Progress notebook" };

export default function ProgressPage() {
  const items: NotebookItem[] = [
    ...modules.map((item) => {
      const itemId = `M${String(item.id).padStart(2, "0")}`;
      const href = `/modules/${String(item.id).padStart(2, "0")}`;
      return { itemType: "module" as const, itemId, label: `Module ${String(item.id).padStart(2, "0")} · ${item.title}`, href, editHref: `${href}#progress-editor-${itemId}`, kind: "Module" };
    }),
    ...moduleDefinitions.flatMap((module) => module.lessons.map((lesson, index) => {
      const moduleId = String(module.id).padStart(2, "0");
      const lessonNumber = String(index + 1).padStart(2, "0");
      const href = `/modules/${moduleId}/lessons/${lesson.id.toLowerCase()}`;
      return { itemType: "lesson" as const, itemId: lesson.id, label: `Module ${moduleId} · Lesson ${lessonNumber} · ${lesson.title}`, href, kind: "Lesson" };
    })),
    ...activities.map((item) => {
      const href = `/activities/${item.id}`;
      const investigationTasks = item.id === "A01" ? a01Tasks : item.investigationTasks ?? [];
      return { itemType: "activity" as const, itemId: item.id, label: `${item.id} · ${item.title}`, href, editHref: `${href}#progress-editor-${item.id}`, kind: "Activity", investigationTasks: investigationTasks.map(({ id, title }) => ({ id, title })) };
    }),
    ...smallProjects.map((item) => {
      const href = `/projects/${item.id}`;
      return { itemType: "small_project" as const, itemId: item.id, label: `${item.id} · ${item.title}`, href, editHref: `${href}#progress-editor-${item.id}`, kind: "Small project" };
    }),
    ...majorProjects.map((item) => {
      const href = `/projects/${item.id}`;
      return { itemType: "project" as const, itemId: item.id, label: `${item.id} · ${item.title}`, href, editHref: `${href}#progress-editor-${item.id}`, kind: "Major project" };
    }),
    ...projectMilestones.map((item) => ({ itemType: "milestone" as const, itemId: item.id, label: `${item.id} · ${item.label}`, href: `/projects/${item.projectId}`, editHref: `/projects/${item.projectId}#milestone-${item.id}`, editLabel: "Open milestone", kind: "Project milestone" })),
  ];

  return <>
    <header className="page-header progress-page-header">
      <div><p className="eyebrow">Your learning record</p><h1><NotebookPen size={27} aria-hidden="true" /> Progress notebook</h1><p className="page-description">Keep concise notes about what you practiced and the evidence you can reproduce. Records stay in this app’s local SQLite database.</p></div>
    </header>
    <div className="progress-privacy-note"><ShieldCheck size={18} aria-hidden="true" /><p>Save sanitized evidence, not secrets. Keep passwords, access tokens, private addresses, work data, and personal information out of notes and screenshots.</p></div>
    <div className="progress-workspace">
      <ProgressNotebook items={items} />
      <aside className="progress-backup-rail" aria-label="Progress data tools"><ProgressBackup /></aside>
    </div>
  </>;
}
