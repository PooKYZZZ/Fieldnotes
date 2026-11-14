import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, FileText } from "lucide-react";
import { projectMilestones, type MajorProjectRecord, type SmallProjectRecord } from "@/content";
import { MilestoneChecklist } from "@/features/projects/milestone-checklist";
import { ProgressEditor } from "@/features/progress/progress-editor";

type Project = MajorProjectRecord | SmallProjectRecord;

function isMajorProject(project: Project): project is MajorProjectRecord {
  return "details" in project;
}

function MajorProjectContent({ project }: { project: MajorProjectRecord }) {
  const milestones = projectMilestones.filter((milestone) => milestone.projectId === project.id);
  const detailEntries = Object.entries(project.details)
    .filter((entry): entry is [string, string] => entry[0] !== "Milestones" && typeof entry[1] === "string");

  return <>
    {detailEntries.map(([label, value]) => <section className="card lesson-section" key={label}><h2>{label}</h2><p style={{ whiteSpace: "pre-line", marginBottom: 0 }}>{value}</p></section>)}
    {milestones.length > 0 && <section className="card lesson-section"><h2>Project milestones</h2><p className="course-detail">Check a milestone after you can show its work. Your checklist is saved with this local project.</p><MilestoneChecklist projectId={project.id} milestones={milestones} /></section>}
    <section className="card lesson-section"><h2>Self-review rubric</h2><p>Score each criterion from 0 (not shown) to 2 (demonstrated). The maximum is 12; it is a personal reflection aid, not a certification.</p><div className="checklist-grid"><div className="checklist-item"><CheckCircle2 size={15} />Function: all acceptance paths pass</div><div className="checklist-item"><CheckCircle2 size={15} />Repeatability: clean setup is documented</div><div className="checklist-item"><CheckCircle2 size={15} />Security: controls are tested and bounded</div><div className="checklist-item"><CheckCircle2 size={15} />Reliability: rollback and restore are demonstrated</div><div className="checklist-item"><CheckCircle2 size={15} />Operations: alert and diagnosis evidence exist</div><div className="checklist-item"><CheckCircle2 size={15} />Understanding: trade-offs can be defended independently</div></div></section>
  </>;
}

function SmallProjectContent({ project }: { project: SmallProjectRecord }) {
  return <>
    <section className="card lesson-section"><h2><CheckCircle2 size={19} /> Project brief</h2><div className="lesson-meta"><div className="meta-item"><strong>Relevant modules</strong><span>{project.relevantModules}</span></div><div className="meta-item"><strong>Problem</strong><span>{project.problem}</span></div><div className="meta-item"><strong>Likely challenge</strong><span>{project.likelyChallenge}</span></div></div></section>
    <section className="card lesson-section"><h2>What to build</h2><p>{project.requirements}</p><h3>Deliverables</h3><p>{project.deliverables}</p><div className="callout-blue"><strong>Acceptance check:</strong> {project.acceptance}</div></section>
    {project.optionalExtension && <section className="card lesson-section"><h2>Optional extension</h2><p>{project.optionalExtension}</p><p className="course-detail">Technical reference: {project.technicalReference}</p></section>}
  </>;
}

export function ProjectDetail({ project }: { project: Project }) {
  const major = isMajorProject(project);
  const itemType = major ? "project" : "small_project";
  const description = major ? project.details.Purpose ?? project.details["Problem statement"] : project.problem;

  return <>
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/projects">Projects</Link><span aria-hidden="true">/</span><span>{project.id}</span></nav>
    <header className="page-header"><div><p className="eyebrow">{major ? "Major build" : "Small project"} · {project.id}</p><h1>{project.title}</h1><p className="page-description">{description}</p></div><a className="button button-outline header-action" href="/library/05_Projects_and_Portfolio.pdf" target="_blank" rel="noreferrer">Source brief <FileText size={14} /></a></header>
    <div className="lesson-layout">
      <div className="lesson-main">
        {major ? <MajorProjectContent project={project} /> : <SmallProjectContent project={project} />}
      </div>
      <aside className="lesson-aside">
        {major && <div className="notice"><CheckCircle2 size={15} /><p>Build for the smallest useful scope. Use synthetic data, keep credentials out of Git, restrict exposure, and document cleanup for any billable resources.</p></div>}
        {!major && <div className="card card-pad"><p className="eyebrow">Start with the outcome</p><p className="course-detail">Prove the acceptance test with known input and one controlled failure before adding optional features.</p><Link href="/activities" style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 11, fontSize: 11, fontWeight: 700 }}>Browse practice activities <ArrowRight size={13} /></Link></div>}
      </aside>
    </div>
    <ProgressEditor itemType={itemType} itemId={project.id} title="Project learning record" wide />
    <Link className="button button-outline" href="/projects"><ArrowLeft size={14} /> Back to projects</Link>
  </>;
}
