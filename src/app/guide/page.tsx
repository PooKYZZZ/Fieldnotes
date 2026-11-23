import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BrainCircuit, BriefcaseBusiness, CheckCircle2 } from "lucide-react";
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
  return <div className="field-guide">
    <header className="page-header"><div><p className="eyebrow">A practical companion</p><h1>Career & AI guide</h1><p className="page-description">Use the learning path to build honest, reproducible evidence. The dated job-search notes are flexible guidance, not a promise about hiring outcomes or a deadline to finish every module.</p></div><a className="button button-outline header-action" href="/library/06_Career_and_AI_Guide.pdf" target="_blank" rel="noreferrer">Open original guide <ArrowRight size={14} /></a></header>
    <div className="field-guide-layout">
    <nav className="field-guide-index" aria-label="In this guide">
      <p className="eyebrow">In this guide</p>
      <a href="#lab-readiness">Prepare your first lab</a>
      <a href="#independent-checks">Independent phase checks</a>
      <a href="#career-priorities">Preparation priorities</a>
      <a href="#ai-practice">Working with AI</a>
      <a href="#portfolio-practice">Portfolio practice</a>
    </nav>
    <div className="field-guide-body">
    <section className="card card-pad" id="lab-readiness" aria-labelledby="lab-readiness-title">
      <h2 id="lab-readiness-title">Prepare your first lab</h2>
      <p>Use a disposable Ubuntu VM for the systems activities. The host is your own computer. The guest is the Linux VM where you run the lab commands.</p>
      <ol>
        <li>Create a new VM with a hypervisor that supports your host and CPU architecture. Use <a href="https://releases.ubuntu.com/24.04/">Ubuntu 24.04 LTS</a> for the lab baseline, which includes Python 3.12. Leave the VM on NAT or a private network and omit port forwards.</li>
        <li>In the VM console, create a regular user and open a terminal. Check <code>hostname</code>, <code>id -u</code>, and <code>pwd</code>. You should recognize the guest hostname, see a nonzero user ID, and start in your home directory. Open a second console before testing SSH or service configuration.</li>
        <li>In the guest, run <code>sudo apt update</code>, then <code>sudo apt install git curl python3-venv</code>. Check <code>git --version</code>, <code>curl --version</code>, and <code>python3 --version</code>. Take a named baseline snapshot in the hypervisor and find the restore action before making changes.</li>
        <li>Try <code>mkdir -p ~/fieldnotes-lab</code>, <code>cd ~/fieldnotes-lab</code>, and <code>echo ready &gt; check.txt</code>. Run <code>cat check.txt | wc -l</code>. The first process writes one line to the pipe and the second counts it. Run <code>git init -b main</code> in this folder if you want to track later lab files.</li>
      </ol>
      <p>Use synthetic data and match each activity’s target, permissions, and cleanup notes. <Link href="/modules/01/lessons/m01-l01">Start Module 01</Link> when you can identify the guest and work as your regular user.</p>
      <p><a href="/labs/status-api.zip" download>Download the Status API starter</a> when you reach the proxy, container, or delivery labs.</p>
    </section>
    <section className="card card-pad" id="independent-checks" aria-labelledby="independent-checks-title">
      <h2 id="independent-checks-title">Independent phase checks</h2>
      <p>Try each case after finishing its phase and revisit it after another module. Use documentation, keep the solution from your earlier lab out of view on the first attempt, and record your hypothesis, a competing cause, the smallest useful check, a repeated client test, and the remaining risk.</p>
      <h3>After Foundations</h3>
      <p>A service is active and its local endpoint returns 200. A second client resolves the expected address but cannot establish a connection. Choose the next host-side observation that separates a listener configured for local use from a network rule blocking the second client. Explain what an application authorization failure would look like and how you would verify the expected access from both clients.</p>
      <details><summary>Reveal the host observation</summary><p>The expected port listens on 127.0.0.1 only. Use this observation to narrow your diagnosis and state which network controls still need independent checks.</p></details>
      <h3>After Infrastructure and delivery</h3>
      <p>A clean release starts the expected image. Process health is green and the same user request now returns a fresh default marker. The previous database volume still exists. Explain your first check, how you would protect both volumes, and what evidence would prove the intended data is back on the user path.</p>
      <h3>After Operations and security</h3>
      <p>An alert fires after a release. The target still scrapes, but a known user request returns 503. The last restore passed integrity checks and omitted a known record. Decide what to verify before rolling back code or restoring data. Hand another learner a short timeline, the safe action, and a specific verification for each proposed recovery.</p>
      <p>Use three evidence levels: familiar means you can identify the concept, guided means you can reproduce and explain the worked case, and independent means you can make and defend a choice on a new case. These are self-assessments.</p>
    </section>
    <section className="card lesson-section"><h2><BriefcaseBusiness size={19} /> Entry points to explore</h2><p>The source guide suggests DevOps/cloud engineering as a direction, with adjacent paths through cloud operations, junior Linux or systems administration, infrastructure support, build/release work, and backend roles with deployment responsibilities. Refresh actual job descriptions when you apply; one posting is not the whole market.</p><div className="callout-blue"><strong>Evidence beats a tool list.</strong> Explain what you built, what constraints mattered, and how you verified the result. Do not claim performance or reliability gains without measurements.</div></section>
    <section id="career-priorities"><div className="section-heading"><div><h2>Flexible preparation priorities</h2><p>Pick the next useful evidence gap; these are not calendar deadlines.</p></div></div><div className="grid career-priority-grid">{careerPriorities.map((item, index) => <article className="card card-pad career-priority-card" key={item.detail}><p className="eyebrow">Priority {String.fromCharCode(65 + index)}</p><p>{item.detail}</p>{item.related.length > 0 && <ul aria-label={`Related learning for priority ${String.fromCharCode(65 + index)}`}>{item.related.map((reference) => {
      const link = resolvePriorityReference(reference);
      return link ? <li key={link.href}><Link href={link.href}>{link.label}<ArrowRight size={13} aria-hidden="true" /></Link></li> : null;
    })}</ul>}</article>)}</div></section>
    <section id="ai-practice"><div className="section-heading"><div><h2><BrainCircuit size={19} aria-hidden="true" /> Use AI without outsourcing your understanding</h2><p>The PDFs describe evidence that is mixed and context-dependent; use AI as support, then verify independently.</p></div></div><ul className="field-guide-modes">{aiLearningModes.map((mode) => <li key={mode.title}><h3>{mode.title}</h3><p>{mode.detail}</p></li>)}</ul></section>
    <section className="card card-pad" style={{ marginTop: 23 }}><h2><CheckCircle2 size={18} style={{ verticalAlign: "-4px", color: "var(--green)" }} /> Before trusting generated work</h2><div className="checklist-grid"><div className="checklist-item">Can I explain the execution path and dependencies?</div><div className="checklist-item">Does it change data, permissions, or cloud resources?</div><div className="checklist-item">Which credentials, network access, and filesystem paths are involved?</div><div className="checklist-item">Did I test success, failure, and rollback?</div><div className="checklist-item">Are any claims supported by observed evidence?</div><div className="checklist-item">Could I investigate a similar failure without the AI answer?</div></div></section>
    <section className="card card-pad" id="portfolio-practice"><h2>Portfolio practice</h2><p className="course-detail">Choose two or three larger projects to polish. Include a clear README, architecture diagram, trade-offs, passing tests, one intentional failure and fix, runbooks, and an honest account of your contribution.</p><Link className="button button-primary" href="/projects" style={{ marginTop: 13 }}>Review project briefs <ArrowRight size={14} /></Link></section>
    </div>
    </div>
  </div>;
}

