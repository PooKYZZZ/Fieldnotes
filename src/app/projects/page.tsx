import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { majorProjects, projectMilestones, smallProjects, type ProjectRecordBase } from "@/content";
import { ProjectOverview } from "@/features/projects/project-overview";
import { buildOutcomes } from "@/features/projects/project-outcomes";

export const metadata: Metadata = { title: "Projects & portfolio" };

function summarizeProject(project: ProjectRecordBase) {
  return {
    id: project.id,
    title: project.title,
    outcome: buildOutcomes[project.id],
    track: project.track,
    estimatedTime: project.estimatedTime,
    relevantModules: project.relevantModules,
    milestones: projectMilestones
      .filter((milestone) => milestone.projectId === project.id)
      .map(({ id, label }) => ({ id, label })),
  };
}

export default function ProjectsPage() {
  return <>
    <header className="page-header project-page-header">
      <div><h1>Projects &amp; builds</h1><p className="page-description">Build an operational tool or combine delivery, monitoring, and recovery in a portfolio project.</p></div>
      <a className="button button-outline header-action" href="/library/05_Projects_and_Portfolio.pdf" target="_blank" rel="noreferrer">Portfolio guide <ArrowRight size={14} aria-hidden="true" /></a>
    </header>

    <ProjectOverview majorProjects={majorProjects.map(summarizeProject)} smallProjects={smallProjects.map(summarizeProject)} />

    <section className="portfolio-standard" aria-labelledby="portfolio-standard-title">
      <div><h2 id="portfolio-standard-title">Make the result easy to review</h2><p>Give the next engineer enough context to run your work and understand its boundaries.</p></div>
      <ul>
        <li><strong>README:</strong> problem, setup, architecture, limitations, and a reproducible demo.</li>
        <li><strong>Verification:</strong> tests, one intentional failure, and the evidence that confirms the fix.</li>
        <li><strong>Operations:</strong> release, monitoring, recovery, and cleanup notes.</li>
        <li><strong>Ownership:</strong> explain your work and disclose tool-assisted parts honestly.</li>
      </ul>
    </section>
  </>;
}
