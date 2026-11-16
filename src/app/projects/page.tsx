import type { Metadata } from "next";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { majorProjects, projectMilestones, smallProjects } from "@/content";
import { ProjectOverview } from "@/features/projects/project-overview";

export const metadata: Metadata = { title: "Projects & portfolio" };

export default function ProjectsPage() {
  const majorProjectSummaries = majorProjects.map((project) => ({
    id: project.id,
    title: project.title,
    purpose: project.details.Scenario,
    track: project.track,
    estimatedTime: project.estimatedTime,
    relevantModules: project.relevantModules,
    tools: project.tools,
    milestones: projectMilestones
      .filter((milestone) => milestone.projectId === project.id)
      .map(({ id, label }) => ({ id, label })),
  }));
  const smallProjectSummaries = smallProjects.map((project) => ({
    id: project.id,
    title: project.title,
    problem: project.details.Scenario,
    track: project.track,
    estimatedTime: project.estimatedTime,
    relevantModules: project.relevantModules,
    tools: project.tools,
    milestones: projectMilestones
      .filter((milestone) => milestone.projectId === project.id)
      .map(({ id, label }) => ({ id, label })),
  }));

  return <>
    <header className="page-header project-page-header">
      <div><p className="eyebrow">Portfolio workspace</p><h1>Projects &amp; builds</h1><p className="page-description">Choose a focused build to make one operational tool, or take on a major project that combines delivery, reliability, security, and recovery.</p></div>
      <a className="button button-outline header-action" href="/library/05_Projects_and_Portfolio.pdf" target="_blank" rel="noreferrer">Portfolio guide <ArrowRight size={14} aria-hidden="true" /></a>
    </header>

    <div className="project-principle"><ClipboardCheck size={20} aria-hidden="true" /><p><strong>Build in reviewable steps.</strong> Each brief moves from an engineering scenario through technical decisions, checkpoints, verification, and a portfolio handoff. Progress is self-reported; use the evidence to explain what you actually tested.</p></div>

    <ProjectOverview majorProjects={majorProjectSummaries} smallProjects={smallProjectSummaries} />

    <section className="portfolio-standard" aria-labelledby="portfolio-standard-title">
      <div><p className="eyebrow">A useful handoff checklist</p><h2 id="portfolio-standard-title">Make the result easy to review</h2><p>A small project is stronger when another person can run it and understand its boundaries.</p></div>
      <ul>
        <li><strong>README:</strong> problem, setup, architecture, limitations, and a reproducible demo.</li>
        <li><strong>Verification:</strong> tests, one intentional failure, and the evidence that confirms the fix.</li>
        <li><strong>Operations:</strong> release, monitoring, recovery, and cleanup notes.</li>
        <li><strong>Ownership:</strong> explain your work and disclose tool-assisted parts honestly.</li>
      </ul>
    </section>
  </>;
}
