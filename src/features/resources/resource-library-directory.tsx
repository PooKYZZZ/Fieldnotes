"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, FileDown, Search } from "lucide-react";

type LibraryDocument = { file: string; title: string; detail: string };
type OfficialResource = { category: string; label: string; url: string; note: string };
type GlossaryEntry = readonly [string, string];

function revealResourceCategory(hash: string) {
  const target = document.getElementById(hash.slice(1));
  const category = target?.closest("details.resource-group");
  if (category instanceof HTMLDetailsElement) category.open = true;
}

export function ResourceLibraryDirectory({
  documents,
  officialResources,
  glossary,
}: {
  documents: readonly LibraryDocument[];
  officialResources: readonly OfficialResource[];
  glossary: readonly GlossaryEntry[];
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matches = (value: string) => !normalizedQuery || value.toLocaleLowerCase().includes(normalizedQuery);
  const filteredDocuments = documents.filter((document) => matches(`${document.title} ${document.detail} ${document.file}`));
  const filteredResources = officialResources.filter((resource) => matches(`${resource.category} ${resource.label} ${resource.note}`));
  const filteredGlossary = glossary.filter(([term, definition]) => matches(`${term} ${definition}`));
  const resultCount = filteredDocuments.length + filteredResources.length + filteredGlossary.length;
  const groupedResources = [...new Set(filteredResources.map((resource) => resource.category))];
  const view = normalizedQuery ? "search" : "browse";

  useEffect(() => {
    const revealFromLocation = () => revealResourceCategory(window.location.hash);
    revealFromLocation();
    window.addEventListener("hashchange", revealFromLocation);
    return () => window.removeEventListener("hashchange", revealFromLocation);
  }, [view]);

  function openCategory(event: MouseEvent<HTMLAnchorElement>) {
    revealResourceCategory(event.currentTarget.hash);
  }

  return <section className="resource-directory" aria-label="Search learning resources">
    <div className="resource-search-panel">
      <label className="resource-search search-wrap">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search library, documentation, or glossary terms</span>
        <input className="form-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search library, documentation, or glossary terms" />
      </label>
      <p className={normalizedQuery ? "resource-result-count" : "sr-only"} role="status">{normalizedQuery ? `${resultCount} matching ${resultCount === 1 ? "resource" : "resources"}` : ""}</p>
      {resultCount > 0 && <nav className="resource-section-links" aria-label="Resource categories">
        {filteredDocuments.length > 0 && <a href="#source-pdfs" onClick={openCategory}>Source PDFs</a>}
        {filteredResources.length > 0 && <a href="#official-references" onClick={openCategory}>Documentation</a>}
        {filteredGlossary.length > 0 && <a href="#glossary-title" onClick={openCategory}>Glossary</a>}
      </nav>}
    </div>

    {resultCount === 0 ? <div className="resource-empty">
      <Search size={21} aria-hidden="true" />
      <h2>No resources match “{query.trim()}”</h2>
      <p>Try a tool name, topic, document title, or glossary term.</p>
      <button className="button button-outline" type="button" onClick={() => setQuery("")}>Clear search</button>
    </div> : <>
      {filteredDocuments.length > 0 && <details key={`pdfs-${view}`} id="source-pdfs" className="resource-group" open>
        <summary><h2 id="source-library">Source PDFs <span>{filteredDocuments.length}</span></h2></summary>
        {!normalizedQuery && <p className="resource-note">Reference editions. For the current course sequence and lab instructions, use the <Link href="/roadmap">Learning roadmap</Link> or <Link href="/activities">Activities</Link>.</p>}
        <ul className="resource-register">{filteredDocuments.map((document) => <li className="resource-row" key={document.file}>
          <div><h3 className="resource-name">{document.title}</h3><p className="resource-note">{document.detail}</p></div>
          <a className="button button-outline" href={`/library/${document.file}`} target="_blank" rel="noreferrer" aria-label={`Open ${document.title} PDF in a new tab`}>Open <FileDown size={14} aria-hidden="true" /></a>
        </li>)}</ul>
      </details>}

      {filteredResources.length > 0 && <details key={`docs-${view}`} id="official-references" className="resource-group" open={Boolean(normalizedQuery) || undefined}>
        <summary><h2>Official references <span>{filteredResources.length}</span></h2></summary>
        {groupedResources.map((category) => <section className="resource-category" key={category}><h3 className="eyebrow">{category}</h3><ul className="resource-register">{filteredResources.filter((resource) => resource.category === category).map((resource) => <li className="resource-row" key={resource.label}>
          <div><h4 className="resource-name">{resource.label}</h4><p className="resource-note">{resource.note}</p></div><a className="reference-source-link" href={resource.url} target="_blank" rel="noreferrer" aria-label={`Open source for ${resource.label}`}>Open source <ArrowUpRight size={14} aria-hidden="true" /></a>
        </li>)}</ul></section>)}
      </details>}

      {filteredGlossary.length > 0 && <details key={`glossary-${view}`} id="glossary-title" className="resource-group" open={Boolean(normalizedQuery) || undefined}>
        <summary><h2>Glossary <span>{filteredGlossary.length}</span></h2></summary>
        <dl className="glossary-grid">{filteredGlossary.map(([term, definition]) => <div className="glossary-term" key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl>
      </details>}
    </>}
  </section>;
}
