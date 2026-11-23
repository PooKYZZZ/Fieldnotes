import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { ProgressBackup } from "@/features/progress/progress-backup";
import { ProgressNotebook, type NotebookItem } from "@/features/progress/progress-notebook";
import { activities, majorProjects, modules, projectMilestones, smallProjects, troubleshooting } from "@/content";
import { a01Tasks } from "@/features/activities/a01-task-catalog";
import { moduleDefinitions } from "@/content/curriculum/modules/definitions";

export const metadata: Metadata = { title: "Progress notebook" };

export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
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
    ...troubleshooting.map((item) => {
      const href = `/activities#troubleshooting-${item.id.toLowerCase()}`;
      return { itemType: "troubleshooting" as const, itemId: item.id, label: `${item.id} · ${item.title}`, href, editHref: href, editLabel: "Open scenario", kind: "Troubleshooting" };
    }),
    ...smallProjects.map((item) => {
      const href = `/projects/${item.id}`;
      const checkpointTasks = projectMilestones.filter((milestone) => milestone.projectId === item.id).map(({ id, label }) => ({ id, title: label }));
      return { itemType: "small_project" as const, itemId: item.id, label: `${item.id} · ${item.title}`, href, editHref: `${href}#project-build`, kind: "Small project", checkpointTasks };
    }),
    ...majorProjects.map((item) => {
      const href = `/projects/${item.id}`;
      const checkpointTasks = projectMilestones.filter((milestone) => milestone.projectId === item.id).map(({ id, label }) => ({ id, title: label }));
      return { itemType: "project" as const, itemId: item.id, label: `${item.id} · ${item.title}`, href, editHref: `${href}#project-build`, kind: "Major project", checkpointTasks };
    }),
    ...projectMilestones.map((item) => ({ itemType: "milestone" as const, itemId: item.id, label: `${item.id} · ${item.label}`, href: `/projects/${item.projectId}`, editHref: `/projects/${item.projectId}#milestone-${item.id}`, editLabel: "Open milestone", kind: "Project milestone" })),
  ];

  return <>
    <header className="page-header progress-page-header">
      <div><h1>Progress notebook</h1><p className="page-description">Find the notes, observations, and project checkpoints saved to your account.</p></div>
    </header>
    <div className="progress-privacy-note"><ShieldCheck size={16} aria-hidden="true" /><p>Save only sanitized evidence. Omit credentials, private addresses, work data, and personal information.</p></div>
    <div className="progress-workspace">
      <ProgressNotebook items={items} initialTypeFilter={params.type === "project" ? "project" : "all"} />
      <ProgressBackup />
    </div>
  </>;
}
