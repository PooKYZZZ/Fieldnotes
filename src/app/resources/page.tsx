import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import { glossary, libraryDocuments, officialResources } from "@/content";
import { ResourceLibraryDirectory } from "@/features/resources/resource-library-directory";

export const metadata: Metadata = { title: "Resource library" };

export default function ResourcesPage() {
  return <div className="reference-library">
    <header className="page-header"><div><h1>Resource library</h1><p className="page-description">Find a glossary term, official documentation, or a curriculum PDF. Use the in-app lessons for current lab steps and prerequisites.</p></div></header>
    <ResourceLibraryDirectory documents={libraryDocuments} officialResources={officialResources} glossary={glossary} />
    <section id="cloud-safety" aria-labelledby="cloud-safety-title"><div className="section-heading"><div><h2 id="cloud-safety-title">Cloud and lab safety</h2><p>Use local practice first. Cloud credits and free-tier terms do not guarantee a zero bill.</p></div></div>
      <div className="card card-pad"><div className="checklist-grid">
        <div className="checklist-item"><ShieldCheck size={15} />Use a local container or disposable VM first; use cloud when it improves the learning objective.</div>
        <div className="checklist-item"><ShieldCheck size={15} />Confirm eligibility, expiration, billing method, region, VM size, disk, IP, and bandwidth costs.</div>
        <div className="checklist-item"><ShieldCheck size={15} />Set budgets or alerts when available; understand that alerts may not cap spending.</div>
        <div className="checklist-item"><ShieldCheck size={15} />Keep a resource inventory, remove dependent resources, and verify cleanup.</div>
        <div className="checklist-item"><ShieldCheck size={15} />Use least privilege; avoid opening SSH, admin panels, or monitoring ports broadly.</div>
        <div className="checklist-item"><ShieldCheck size={15} />Use synthetic data and keep passwords, keys, tokens, and personal data out of evidence.</div>
      </div></div>
    </section>
    <section className="card card-pad" style={{ marginTop: 25 }}><h2>Keep references current</h2><p className="course-detail">This library is a starting point, not a substitute for current provider docs. Course availability, eligibility, product menus, prices, and job postings can change; verify them before acting.</p><Link href="/guide" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, fontWeight: 700 }}>Career and AI learning guide <ArrowUpRight size={14} /></Link></section>
  </div>;
}

