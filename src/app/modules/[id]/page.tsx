import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ModuleLesson } from "@/features/roadmap/module-lesson";
import { activities, modules } from "@/content";

export const dynamicParams = false;

type ModulePageProps = { params: Promise<{ id: string }> };

function findModule(routeId: string) {
  return modules.find((item) => String(item.id).padStart(2, "0") === routeId);
}

export function generateStaticParams() {
  return modules.map((item) => ({ id: String(item.id).padStart(2, "0") }));
}

export async function generateMetadata({ params }: ModulePageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: findModule(id)?.title ?? "Module" };
}

export default async function ModulePage({ params }: ModulePageProps) {
  const { id } = await params;
  const learningModule = findModule(id);
  if (!learningModule) notFound();

  const activity = activities.find((item) => item.id === learningModule.activityId);
  return <ModuleLesson learningModule={learningModule} activity={activity} />;
}
