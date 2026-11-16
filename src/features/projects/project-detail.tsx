import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, CheckCircle2, Clock3, GitBranch } from "lucide-react";
import { projectMilestones, type MajorProjectRecord, type ProjectMilestone, type ProjectRecordBase, type SmallProjectRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { ProjectMilestoneWorkbench } from "@/features/projects/milestone-checklist";
import { ProjectRecordReview } from "@/features/projects/project-record-review";

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

function ProjectFlowNav() {
  return <nav className="activity-workflow-nav project-workflow-nav" aria-label="Project stages">
    <a href="#project-assignment"><span>01</span><strong>Understand</strong></a>
    <a href="#project-design"><span>02</span><strong>Prepare &amp; design</strong></a>
    <a href="#project-build"><span>03</span><strong>Build &amp; verify</strong></a>
    <a href="#project-review"><span>04</span><strong>Review &amp; hand off</strong></a>
  </nav>;
}

function ProjectStage({ id, title, eyebrow, children, className = "" }: {
  id: string;
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`activity-stage project-stage ${className}`} id={id} aria-labelledby={`${id}-title`}>
    <p className="eyebrow">{eyebrow}</p>
    <h2 id={`${id}-title`}>{title}</h2>
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
        <ProjectStage id="project-assignment" title="Understand the assignment" eyebrow="01 · Problem and outcome" className="project-assignment-stage">
          {assignmentSections.map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
        </ProjectStage>

        <ProjectStage id="project-design" title="Prepare and make design decisions" eyebrow="02 · Setup and system design" className="project-design-stage">
          {designSections.map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
        </ProjectStage>

        <ProjectStage id="project-build" title="Build in reviewable checkpoints" eyebrow="03 · Implement and record" className="project-build-stage">
          <p className="project-stage-intro">Choose a checkpoint to see its working instructions. Keep the project notebook open beside the work; it saves one shared project record.</p>
          <ProjectMilestoneWorkbench projectId={project.id} projectType={itemType} milestones={milestones} />
        </ProjectStage>

        <ProjectStage id="project-review" title="Review the result and prepare the handoff" eyebrow="04 · Verify, reflect, and share" className="project-review-stage">
          {reviewSections.map((section) => <ProjectContent key={section.key} project={project} section={section} />)}
          {major && project.details["Self-review rubric"] && <ProjectContent project={project} section={{ key: "Self-review rubric", id: "project-self-review", title: "Reflect on your engineering judgment", eyebrow: "Self-review" }} />}
          <ProjectRecordReview projectId={project.id} projectType={itemType} milestones={milestones} />
        </ProjectStage>
      </div>

      <nav className="project-detail-footer" aria-label="Project navigation">
        <Link className="button button-outline" href="/projects"><ArrowLeft size={14} aria-hidden="true" /> Back to Projects &amp; builds</Link>
        <Link className="project-next-action" href="#project-assignment">Return to the assignment <ArrowDown size={14} aria-hidden="true" /></Link>
      </nav>
    </div>
  </>;
}
