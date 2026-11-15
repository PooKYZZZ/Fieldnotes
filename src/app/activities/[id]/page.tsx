import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActivityLesson } from "@/features/activities/activity-lesson";
import { activities } from "@/content";

export const dynamicParams = false;

type ActivityPageProps = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return activities.map((activity) => ({ id: activity.id }));
}

export async function generateMetadata({ params }: ActivityPageProps): Promise<Metadata> {
  const { id } = await params;
  const activity = activities.find((item) => item.id === id);
  return { title: activity ? `${activity.id}: ${activity.title}` : "Activity" };
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const { id } = await params;
  const activity = activities.find((item) => item.id === id);
  if (!activity) notFound();

  const activityIndex = activities.findIndex((item) => item.id === activity.id);
  const previousActivity = activities[activityIndex - 1];
  const nextActivity = activities[activityIndex + 1];
  return <ActivityLesson activity={activity} previousActivity={previousActivity} nextActivity={nextActivity} />;
}
