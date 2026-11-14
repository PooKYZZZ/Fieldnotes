import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetail } from "@/features/projects/project-detail";
import { majorProjects, smallProjects } from "@/content";

export const dynamicParams = false;

type ProjectPageProps = { params: Promise<{ id: string }> };

function findProject(id: string) {
  return majorProjects.find((item) => item.id === id) ?? smallProjects.find((item) => item.id === id);
}

export function generateStaticParams() {
  return [...majorProjects, ...smallProjects].map((project) => ({ id: project.id }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { id } = await params;
  const project = findProject(id);
  return { title: project ? `${project.id}: ${project.title}` : "Project" };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  const project = findProject(id);
  if (!project) notFound();
  return <ProjectDetail project={project} />;
}
