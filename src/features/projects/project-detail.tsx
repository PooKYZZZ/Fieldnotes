import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock3, GitBranch } from "lucide-react";
import { projectMilestones, type MajorProjectRecord, type ProjectMilestone, type ProjectRecordBase, type SmallProjectRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ProjectMilestoneWorkbench } from "@/features/projects/milestone-checklist";
import { ProjectRecordReview } from "@/features/projects/project-record-review";
import { ProjectFlowNav } from "@/features/projects/project-flow-nav";

type Project = MajorProjectRecord | SmallProjectRecord;

type ProjectSectionDefinition = { key: string; id: string; title: string; eyebrow: string };

const assignmentSections: ProjectSectionDefinition[] = [
  { key: "Scenario", id: "project-scenario", title: "The engineering assignment", eyebrow: "Scenario" },
  { key: "Why this matters", id: "project-why", title: "Why it matters", eyebrow: "Real-world value" },
  { key: "Learning objectives", id: "project-outcomes", title: "What you will demonstrate", eyebrow: "Learning outcomes" },
];

const designSections: ProjectSectionDefinition[] = [
  { key: "Prerequisites and setup", id: "project-prerequisites", title: "Before you begin", eyebrow: "Prerequisites and environment" },
  { key: "Requirements and boundaries", id: "project-requirements", title: "What the system must do", eyebrow: "Requirements and guardrails" },
  { key: "Architecture and decisions", id: "project-architecture", title: "Design the system", eyebrow: "Architecture and trade-offs" },
];

const reviewSections: ProjectSectionDefinition[] = [
  { key: "Verification plan", id: "project-verification", title: "Prove it works", eyebrow: "Verification plan" },
  { key: "Acceptance criteria", id: "project-acceptance", title: "Definition of done", eyebrow: "Acceptance criteria" },
  { key: "Troubleshooting", id: "project-troubleshooting", title: "When a check fails", eyebrow: "Troubleshooting" },
  { key: "Portfolio deliverables", id: "project-portfolio", title: "Prepare the handoff", eyebrow: "Portfolio and documentation" },
  { key: "Stretch goals", id: "project-stretch", title: "After the core build", eyebrow: "Optional extensions" },
  { key: "Technical references", id: "project-references", title: "Primary references", eyebrow: "Documentation to consult" },
];

function isMajorProject(project: Project): project is MajorProjectRecord {
  return project.kind === "major";
}

function ProjectContent({ project, section }: { project: ProjectRecordBase; section: ProjectSectionDefinition }) {
  const content = project.details[section.key];
  if (!content) return null;
  return <section className="project-content-block" id={section.id} aria-labelledby={`${section.id}-title`}>
    <p className="eyebrow">{section.eyebrow}</p>
    <h3 id={`${section.id}-title`}>{section.title}</h3>
    <MarkdownContent>{content}</MarkdownContent>
  </section>;
}

function ProjectStage({ id, title, eyebrow, children, className = "", previous, next }: {
  id: string;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
  previous?: { href: string; label: string };
  next?: { href: string; label: string };
}) {
  return <section className={`activity-stage project-stage ${className}`} id={id} aria-labelledby={`${id}-title`}>
    <p className="eyebrow">{eyebrow}</p>
    <h2 id={`${id}-title`}>{title}</h2>
    {children}
    {(previous || next) && <nav className="project-stage-actions" aria-label={`${title} navigation`}>
      {previous ? <Link className="button button-outline" href={previous.href}><ArrowLeft size={14} aria-hidden="true" />{previous.label}</Link> : <span />}
      {next && <Link className="button button-primary" href={next.href}>{next.label}<ArrowRight size={14} aria-hidden="true" /></Link>}
    </nav>}
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
          <p className="eyebrow">{project.track} · {project.id}</p>
          <h1>{project.title}</h1>
          <div className="project-detail-meta">
            <span><Clock3 size={14} aria-hidden="true" />{project.estimatedTime} · learner-paced</span>
            <span><GitBranch size={14} aria-hidden="true" />Modules {project.relevantModules}</span>
            <span><CheckCircle2 size={14} aria-hidden="true" />{milestones.length} build checkpoints</span>
          </div>
        </div>
        <Link className="button button-primary project-header-action" href="#project-assignment">Read the assignment <ArrowRight size={15} aria-hidden="true" /></Link>
      </header>

      <ProjectFlowNav />

      <div className="project-experience-content">
      <ProjectStage id="project-assignment" title="Understand the assignment" eyebrow="01 · Problem and outcome" className="project-assignment-stage" next={{ href: "#project-design", label: "Prepare and design" }}>
          {assignmentSections.map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
        </ProjectStage>

      <ProjectStage id="project-design" title="Prepare and make design decisions" eyebrow="02 · Setup and system design" className="project-design-stage" previous={{ href: "#project-assignment", label: "Back to assignment" }} next={{ href: "#project-build", label: "Start the build" }}>
          {designSections.map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
        </ProjectStage>

      <ProjectStage id="project-build" title="Build in reviewable checkpoints" eyebrow="03 · Implement and record" className="project-build-stage" previous={{ href: "#project-design", label: "Back to design" }} next={{ href: "#project-review", label: "Review your work" }}>
          <p className="project-stage-intro">Choose a checkpoint to see its working instructions. Keep the project notebook open beside the work; it saves one shared project record.</p>
          <ProjectMilestoneWorkbench projectId={project.id} projectType={itemType} milestones={milestones} />
        </ProjectStage>

      <ProjectStage id="project-review" title="Review the result and prepare the handoff" eyebrow="04 · Verify, reflect, and share" className="project-review-stage" previous={{ href: "#project-build", label: "Back to the build" }}>
          <ProjectRecordReview projectId={project.id} projectType={itemType} milestones={milestones} />
          {reviewSections.map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
          {major && project.details["Self-review rubric"] && <ProjectContent project={project} section={{ key: "Self-review rubric", id: "project-self-review", title: "Reflect on your engineering judgment", eyebrow: "Self-review" }} />}
        </ProjectStage>
      </div>

      <nav className="project-detail-footer" aria-label="Project navigation">
        <Link className="button button-outline" href="/projects"><ArrowLeft size={14} aria-hidden="true" /> Back to Projects &amp; builds</Link>
        <Link className="project-next-action" href="#project-build">Return to build checkpoints <ArrowRight size={14} aria-hidden="true" /></Link>
      </nav>
    </div>
  </>;
}
