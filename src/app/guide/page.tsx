import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BrainCircuit, BriefcaseBusiness, CheckCircle2, Sparkles } from "lucide-react";
import { activities, aiLearningModes, careerPriorities, majorProjects, modules, smallProjects, troubleshooting } from "@/content";
import type { CareerPriorityReference } from "@/content/learning-guidance";

export const metadata: Metadata = { title: "Career & AI guide" };

function resolvePriorityReference(reference: CareerPriorityReference): { href: string; label: string } | undefined {
  if (reference.type === "module") {
    const item = modules.find((module) => module.id === reference.id);
    return item ? { href: `/modules/${String(item.id).padStart(2, "0")}`, label: `Module ${String(item.id).padStart(2, "0")} · ${item.title}` } : undefined;
  }
  if (reference.type === "activity") {
    const item = activities.find((activity) => activity.id === reference.id);
    return item ? { href: `/activities/${item.id}`, label: `${item.id} · ${item.title}` } : undefined;
  }
  if (reference.type === "troubleshooting") {
    const item = troubleshooting.find((scenario) => scenario.id === reference.id);
    return item ? { href: `/activities#troubleshooting-${item.id.toLowerCase()}`, label: `${item.id} · ${item.title}` } : undefined;
  }
  const item = majorProjects.find((project) => project.id === reference.id) ?? smallProjects.find((project) => project.id === reference.id);
  return item ? { href: `/projects/${item.id}`, label: `${item.id} · ${item.title}` } : undefined;
}

export default function GuidePage() {
  return <>
    <header className="page-header"><div><p className="eyebrow">A practical companion</p><h1>Career & AI guide</h1><p className="page-description">Use the learning path to build honest, reproducible evidence. The dated job-search notes are flexible guidance, not a promise about hiring outcomes or a deadline to finish every module.</p></div><a className="button button-outline header-action" href="/library/06_Career_and_AI_Guide.pdf" target="_blank" rel="noreferrer">Open original guide <ArrowRight size={14} /></a></header>
    <section className="card lesson-section"><h2><BriefcaseBusiness size={19} /> Entry points to explore</h2><p>The source guide suggests DevOps/cloud engineering as a direction, with adjacent paths through cloud operations, junior Linux or systems administration, infrastructure support, build/release work, and backend roles with deployment responsibilities. Refresh actual job descriptions when you apply; one posting is not the whole market.</p><div className="callout-blue"><strong>Evidence beats a tool list.</strong> Explain what you built, what constraints mattered, and how you verified the result. Do not claim performance or reliability gains without measurements.</div></section>
    <section><div className="section-heading"><div><h2>Flexible preparation priorities</h2><p>Pick the next useful evidence gap; these are not calendar deadlines.</p></div></div><div className="grid career-priority-grid">{careerPriorities.map((item, index) => <article className="card card-pad career-priority-card" key={item.detail}><p className="eyebrow">Priority {String.fromCharCode(65 + index)}</p><p>{item.detail}</p>{item.related.length > 0 && <ul aria-label={`Related learning for priority ${String.fromCharCode(65 + index)}`}>{item.related.map((reference) => {
      const link = resolvePriorityReference(reference);
      return link ? <li key={link.href}><Link href={link.href}>{link.label}<ArrowRight size={13} aria-hidden="true" /></Link></li> : null;
    })}</ul>}</article>)}</div></section>
    <section><div className="section-heading"><div><h2><BrainCircuit size={19} style={{ verticalAlign: "-4px", color: "var(--blue)" }} /> Use AI without outsourcing your understanding</h2><p>The PDFs describe evidence that is mixed and context-dependent; use AI as support, then verify independently.</p></div></div><div className="course-grid">{aiLearningModes.map((mode, index) => <article className="card course-card" key={mode.title}><div className={`course-band ${index === 1 ? "green" : index === 2 ? "gold" : ""}`}><span>MODE {index + 1}</span><Sparkles size={15} /></div><div className="course-body"><h3 className="course-title">{mode.title}</h3><p className="course-detail">{mode.detail}</p></div></article>)}</div></section>
    <section className="card card-pad" style={{ marginTop: 23 }}><h2><CheckCircle2 size={18} style={{ verticalAlign: "-4px", color: "var(--green)" }} /> Before trusting generated work</h2><div className="checklist-grid"><div className="checklist-item">Can I explain the execution path and dependencies?</div><div className="checklist-item">Does it change data, permissions, or cloud resources?</div><div className="checklist-item">Which credentials, network access, and filesystem paths are involved?</div><div className="checklist-item">Did I test success, failure, and rollback?</div><div className="checklist-item">Are any claims supported by observed evidence?</div><div className="checklist-item">Could I investigate a similar failure without the AI answer?</div></div></section>
    <section className="card card-pad" style={{ marginTop: 19 }}><h2>Portfolio practice</h2><p className="course-detail">Choose two or three larger projects to polish. Include a clear README, architecture diagram, trade-offs, passing tests, one intentional failure and fix, runbooks, and an honest account of your contribution.</p><Link className="button button-primary" href="/projects" style={{ marginTop: 13 }}>Review project briefs <ArrowRight size={14} /></Link></section>
  </>;
}

