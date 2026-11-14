import type { Metadata } from "next";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import { majorProjects, projectMilestones, smallProjects } from "@/content";
import { ProjectOverview } from "@/features/projects/project-overview";

export const metadata: Metadata = { title: "Projects & portfolio" };

export default function ProjectsPage() {
  const majorProjectSummaries = majorProjects.map((project) => ({
    id: project.id,
    title: project.title,
    purpose: project.details.Purpose ?? project.details["Problem statement"] ?? "",
    milestones: projectMilestones
      .filter((milestone) => milestone.projectId === project.id)
      .map(({ id, label }) => ({ id, label })),
  }));
  const smallProjectSummaries = smallProjects.map(({ id, title, problem, relevantModules }) => ({ id, title, problem, relevantModules }));

  return <>
    <header className="page-header project-page-header">
      <div><p className="eyebrow">Portfolio workspace</p><h1>Projects &amp; builds</h1><p className="page-description">Apply skills across the roadmap, keep the work reproducible, and save evidence as you go. These project ideas come from your learning plan.</p></div>
      <a className="button button-outline header-action" href="/library/05_Projects_and_Portfolio.pdf" target="_blank" rel="noreferrer">Portfolio guide <ArrowRight size={14} aria-hidden="true" /></a>
    </header>

    <div className="project-principle"><ClipboardCheck size={20} aria-hidden="true" /><p><strong>A project is evidence, not just a checked box.</strong> Save a reproducible result, explain your choices, and note what you would improve. Completion states are self-reported and do not independently verify mastery.</p></div>

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
