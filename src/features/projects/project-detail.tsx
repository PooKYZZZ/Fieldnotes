import Link from "next/link";
import { projectMilestones, type MajorProjectRecord, type ProjectMilestone, type ProjectRecordBase, type SmallProjectRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ProjectMilestoneWorkbench } from "@/features/projects/milestone-checklist";
import { ProjectRecordReview } from "@/features/projects/project-record-review";
import { ProjectRecordProvider } from "@/features/projects/project-record-context";
import { ProjectFlowNav } from "@/features/projects/project-flow-nav";
import { ProjectModuleLinks } from "@/features/projects/project-module-links";
import { buildOutcomes } from "@/features/projects/project-outcomes";

type Project = MajorProjectRecord | SmallProjectRecord;

type ProjectSectionDefinition = { key: string; id: string; title: string };

const assignmentSections: ProjectSectionDefinition[] = [
  { key: "Scenario", id: "project-scenario", title: "The engineering assignment" },
  { key: "Why this matters", id: "project-why", title: "Why it matters" },
  { key: "Learning objectives", id: "project-outcomes", title: "What you will demonstrate" },
];

const designSections: ProjectSectionDefinition[] = [
  { key: "Prerequisites and setup", id: "project-prerequisites", title: "Before you begin" },
  { key: "Requirements and boundaries", id: "project-requirements", title: "What the system must do" },
  { key: "Architecture and decisions", id: "project-architecture", title: "Design the system" },
];

const reviewSections: ProjectSectionDefinition[] = [
  { key: "Verification plan", id: "project-verification", title: "Prove it works" },
  { key: "Acceptance criteria", id: "project-acceptance", title: "Definition of done" },
  { key: "Portfolio deliverables", id: "project-portfolio", title: "Prepare the handoff" },
  { key: "Stretch goals", id: "project-stretch", title: "After the core build" },
];

const buildSupportSections: ProjectSectionDefinition[] = [
  { key: "Troubleshooting", id: "project-troubleshooting", title: "When a check fails" },
  { key: "Technical references", id: "project-references", title: "Primary references" },
];

function isMajorProject(project: Project): project is MajorProjectRecord {
  return project.kind === "major";
}

function ProjectContent({ project, section }: { project: ProjectRecordBase; section: ProjectSectionDefinition }) {
  const content = project.details[section.key];
  if (!content) return null;
  return <section className="project-content-block" id={section.id} aria-labelledby={`${section.id}-title`}>
    <h3 id={`${section.id}-title`}>{section.title}</h3>
    <MarkdownContent>{content}</MarkdownContent>
  </section>;
}

function ProjectStage({ id, title, children, className = "" }: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`activity-stage project-stage ${className}`} id={id} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} tabIndex={-1}>{title}</h2>
    {children}
  </section>;
}

export function ProjectDetail({ project }: { project: Project }) {
  const major = isMajorProject(project);
  const itemType = major ? "project" : "small_project";
  const milestones = projectMilestones.filter((milestone: ProjectMilestone) => milestone.projectId === project.id);

  return <>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/projects">Projects &amp; builds</Link><span aria-hidden="true">/</span><span>{project.id}</span></nav>
    <div className="activity-lesson-shell project-experience">
      <header className="page-header activity-lesson-header project-detail-header">
        <div>
          <h1>{project.title}</h1>
          <div className="project-detail-meta"><span>{project.track}</span><span>{project.estimatedTime}</span><span>{milestones.length} checkpoints</span></div>
        </div>
        <ProjectModuleLinks reference={project.relevantModules} className="project-detail-modules" />
      </header>

      <ProjectRecordProvider projectId={project.id} projectType={itemType}><ProjectFlowNav stages={[
        {
          id: "project-assignment",
          label: "Overview",
          content: <ProjectStage id="project-assignment" title="Understand the assignment" className="project-assignment-stage">
            <div className="project-outcome-brief">
              {buildOutcomes[project.id] && <section aria-label="Build outcome"><h3>What you’ll build</h3><p>{buildOutcomes[project.id]}</p></section>}
              <ProjectContent project={project} section={{ key: "Portfolio deliverables", id: "project-evidence", title: "Evidence to prepare" }} />
            </div>
            <div className="project-brief-grid">
              {assignmentSections.map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
            </div>
          </ProjectStage>,
        },
        {
          id: "project-design",
          label: "Plan",
          content: <ProjectStage id="project-design" title="Prepare and make design decisions" className="project-design-stage">
            <div className="project-brief-grid">
              {designSections.map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
            </div>
          </ProjectStage>,
        },
        {
          id: "project-build",
          label: "Build",
          content: <ProjectStage id="project-build" title="Build in reviewable checkpoints" className="project-build-stage">
            <ProjectMilestoneWorkbench projectId={project.id} projectType={itemType} milestones={milestones} />
            <details className="project-supporting-details project-build-support">
              <summary>Need help while building? Open troubleshooting and reference links</summary>
              <div className="project-supporting-details-content">
                {buildSupportSections.map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
              </div>
            </details>
          </ProjectStage>,
        },
        {
          id: "project-review",
          label: "Review",
          content: <ProjectStage id="project-review" title="Review your work and prepare the handoff" className="project-review-stage">
            <ProjectRecordReview projectId={project.id} milestones={milestones} />
            {reviewSections.slice(0, 3).map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
            <details className="project-supporting-details">
              <summary>Open optional extensions and self-review</summary>
              <div className="project-supporting-details-content">
                {reviewSections.slice(3).map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
                {major && project.details["Self-review rubric"] && <ProjectContent project={project} section={{ key: "Self-review rubric", id: "project-self-review", title: "Reflect on your engineering judgment" }} />}
              </div>
            </details>
          </ProjectStage>,
        },
      ]} /></ProjectRecordProvider>
    </div>
  </>;
}
