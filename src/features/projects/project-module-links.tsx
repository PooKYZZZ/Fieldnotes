import Link from "next/link";

function moduleIdsFromReference(reference: string) {
  const ids = new Set<string>();
  const rangePattern = /\bM?(\d{1,2})(?:\s*[–—-]\s*M?(\d{1,2}))?/g;

  for (const match of reference.matchAll(rangePattern)) {
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end > 24) continue;
    for (let number = Math.min(start, end); number <= Math.max(start, end); number += 1) {
      ids.add(String(number).padStart(2, "0"));
    }
  }

  return [...ids];
}

export function ProjectModuleLinks({ reference, className = "" }: { reference: string; className?: string }) {
  const moduleIds = moduleIdsFromReference(reference);
  if (moduleIds.length === 0) return <span>Related modules: {reference}</span>;

  return <details className={`project-module-links ${className}`.trim()}>
    <summary>Related modules · {reference}</summary>
    <nav className="project-module-link-list" aria-label="Related learning modules">
      {moduleIds.map((moduleId) => <Link key={moduleId} href={`/modules/${moduleId}`} aria-label={`Open Module ${moduleId}`}>
        M{moduleId}
      </Link>)}
    </nav>
  </details>;
}
