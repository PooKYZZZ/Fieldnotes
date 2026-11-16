import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock3, GitBranch, Hammer, ShieldCheck } from "lucide-react";
import { projectMilestones, type MajorProjectRecord, type ProjectMilestone, type ProjectRecordBase, type SmallProjectRecord } from "@/content";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { MilestoneChecklist } from "@/features/projects/milestone-checklist";
import { ProgressEditor } from "@/features/progress/progress-editor";

type Project = MajorProjectRecord | SmallProjectRecord;

type ProjectSectionDefinition = { key: string; id: string; title: string; eyebrow: string };

const playbookSections: ProjectSectionDefinition[] = [
  { key: "Scenario", id: "project-brief", title: "The engineering assignment", eyebrow: "Scenario" },
  { key: "Why this matters", id: "project-why", title: "Why it matters", eyebrow: "Real-world value" },
  { key: "Learning objectives", id: "project-outcomes", title: "Skills you will demonstrate", eyebrow: "Learning outcomes" },
  { key: "Prerequisites and setup", id: "project-prerequisites", title: "Before you begin", eyebrow: "Prerequisites and environment" },
  { key: "Requirements and boundaries", id: "project-requirements", title: "What the system must do", eyebrow: "Requirements and guardrails" },
  { key: "Architecture and decisions", id: "project-architecture", title: "Design the system", eyebrow: "Architecture and trade-offs" },
];

const handoffSections: ProjectSectionDefinition[] = [
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

function ProjectSection({ project, section }: { project: ProjectRecordBase; section: ProjectSectionDefinition }) {
  const content = project.details[section.key];
  if (!content) return null;
  return <section className="project-playbook-section" id={section.id} aria-labelledby={`${section.id}-title`}>
    <p className="eyebrow">{section.eyebrow}</p>
    <h2 id={`${section.id}-title`}>{section.title}</h2>
    <MarkdownContent>{content}</MarkdownContent>
  </section>;
}

function ProjectFlowNav() {
  return <nav className="project-flow-nav" aria-label="Project guide sections">
    <a href="#project-brief"><span>01</span>Assignment</a>
    <a href="#project-architecture"><span>02</span>Design</a>
    <a href="#project-milestones"><span>03</span>Build plan</a>
    <a href="#project-verification"><span>04</span>Verify</a>
    <a href="#project-portfolio"><span>05</span>Handoff</a>
    <a href="#project-record"><span>06</span>Save progress</a>
  </nav>;
}

function ProjectGuideRail({ milestones, tools }: { milestones: { id: string; label: string }[]; tools: string[] }) {
  return <aside className="project-guide-rail" aria-label="Project guide">
    <div className="project-guide-card">
      <p className="eyebrow"><BookOpen size={13} aria-hidden="true" /> Project map</p>
      <p className="project-guide-intro">Work from the problem to a reviewable result. Make one technical decision at each stage and keep evidence as you go.</p>
      <nav className="project-guide-links" aria-label="Jump to a project section">
        <a href="#project-brief">Understand the assignment</a>
        <a href="#project-architecture">Choose the design</a>
        <a href="#project-milestones">Build in checkpoints <span>{milestones.length}</span></a>
        <a href="#project-verification">Test the result</a>
        <a href="#project-portfolio">Prepare the handoff</a>
      </nav>
    </div>
    <div className="project-guide-card project-guide-card--tools">
      <p className="eyebrow"><Hammer size={13} aria-hidden="true" /> Suggested tools</p>
      <ul>{tools.map((tool) => <li key={tool}>{tool}</li>)}</ul>
      <a className="project-guide-record-link" href="#project-record">Save a project note <ArrowDown size={13} aria-hidden="true" /></a>
    </div>
    <div className="project-guide-note">
      <ShieldCheck size={16} aria-hidden="true" />
      <p>Use synthetic data and a disposable environment. Keep secrets out of Git, logs, screenshots, and saved notes.</p>
    </div>
  </aside>;
}

function ProjectMilestoneSection({ milestones }: { milestones: ProjectMilestone[] }) {
  return <section className="project-playbook-section project-milestone-section" id="project-milestones" aria-labelledby="project-milestones-title">
    <div className="project-section-title-row">
      <div><p className="eyebrow">Build in reviewable increments</p><h2 id="project-milestones-title">Project milestones</h2></div>
      <span className="project-milestone-count">{milestones.length} checkpoints</span>
    </div>
    <p className="project-section-lead">Each checkpoint names the goal, work, evidence, and a test for deciding whether to continue. Mark it complete after you can show the evidence; progress is self-reported.</p>
    <MilestoneChecklist milestones={milestones} />
  </section>;
}

function projectMilestonesForProject(projectId: string) {
  return projectMilestones.filter((milestone) => milestone.projectId === projectId);
}

export function ProjectDetail({ project }: { project: Project }) {
  const major = isMajorProject(project);
  const itemType = major ? "project" : "small_project";
  const milestones = projectMilestonesForProject(project.id);
  const navigationMilestones = milestones.map(({ id, label }) => ({ id, label }));

  return <>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/projects">Projects &amp; builds</Link><span aria-hidden="true">/</span><span>{project.id}</span></nav>
    <header className="page-header project-detail-header">
      <div>
        <p className="eyebrow">{project.track} · {project.id}</p>
        <h1>{project.title}</h1>
        <p className="page-description">Move from a defined operational problem to a tested, documented handoff. Choose an approach, explain the trade-offs, and show the evidence behind your result.</p>
        <div className="project-detail-meta">
          <span><Clock3 size={14} aria-hidden="true" />{project.estimatedTime} · learner-paced</span>
          <span><GitBranch size={14} aria-hidden="true" />Modules {project.relevantModules}</span>
          <span><CheckCircle2 size={14} aria-hidden="true" />{milestones.length} reviewable checkpoints</span>
        </div>
      </div>
      <Link className="button button-primary project-header-action" href="#project-record">Record project work <ArrowRight size={15} aria-hidden="true" /></Link>
    </header>

    <ProjectFlowNav />

    <div className="project-playbook-layout">
      <main className="project-playbook-main">
        {playbookSections.map((section) => <ProjectSection key={section.key} project={project} section={section} />)}
        <ProjectMilestoneSection milestones={milestones} />
        {handoffSections.map((section) => <ProjectSection key={section.key} project={project} section={section} />)}
        {major && project.details["Self-review rubric"] && <ProjectSection project={project} section={{ key: "Self-review rubric", id: "project-self-review", title: "Reflect on your engineering judgment", eyebrow: "Self-review" }} />}
      </main>
      <ProjectGuideRail milestones={navigationMilestones} tools={project.tools} />
    </div>

    <section className="project-record-section" id="project-record" aria-labelledby="project-record-title">
      <div className="project-record-heading">
        <div><p className="eyebrow">Your saved project record</p><h2 id="project-record-title">Capture the work you can show</h2><p>Save partial work, decisions, test results, and a repository link. Completion remains your self-report.</p></div>
        <Link href="/progress?type=project" className="project-record-history">View progress notebook <ArrowRight size={14} aria-hidden="true" /></Link>
      </div>
      <ProgressEditor itemType={itemType} itemId={project.id} title="Project learning record" wide />
    </section>

    <nav className="project-detail-footer" aria-label="Project navigation">
      <Link className="button button-outline" href="/projects"><ArrowLeft size={14} aria-hidden="true" /> Back to Projects &amp; builds</Link>
      <Link className="project-next-action" href="#project-brief">Return to the assignment <ArrowDown size={14} aria-hidden="true" /></Link>
    </nav>
  </>;
}
