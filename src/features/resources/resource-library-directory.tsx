"use client";

import { useState } from "react";
import { ArrowUpRight, BookOpen, ExternalLink, FileDown, Search } from "lucide-react";

type LibraryDocument = { file: string; title: string; detail: string };
type OfficialResource = { category: string; label: string; url: string; note: string };
type GlossaryEntry = readonly [string, string];

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

  return <section className="resource-directory" aria-label="Search learning resources">
    <div className="resource-search-panel">
      <label className="resource-search search-wrap">
        <Search size={18} aria-hidden="true" />
        <span className="sr-only">Search library, documentation, or glossary terms</span>
        <input className="form-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search library, documentation, or glossary terms" />
      </label>
      <p className="resource-result-count" role="status" aria-live="polite">{normalizedQuery ? `${resultCount} matching resources` : `${documents.length} source PDFs · ${officialResources.length} official references · ${glossary.length} glossary terms`}</p>
      {resultCount > 0 && <nav className="resource-section-links" aria-label="Resource categories">
        {filteredDocuments.length > 0 && <a href="#source-pdfs">Source PDFs <span>{filteredDocuments.length}</span></a>}
        {filteredResources.length > 0 && <a href="#official-references">Documentation <span>{filteredResources.length}</span></a>}
        {filteredGlossary.length > 0 && <a href="#glossary-title">Glossary <span>{filteredGlossary.length}</span></a>}
      </nav>}
    </div>

    {resultCount === 0 ? <div className="resource-empty" role="status">
      <Search size={21} aria-hidden="true" />
      <h2>No resources match “{query.trim()}”</h2>
      <p>Try a tool name, topic, document title, or glossary term.</p>
      <button className="button button-outline" type="button" onClick={() => setQuery("")}>Clear search</button>
    </div> : <>
      {filteredDocuments.length > 0 && <section id="source-pdfs" aria-labelledby="source-library">
        <div className="section-heading"><div><h2 id="source-library"><BookOpen size={19} aria-hidden="true" /> Your learning library</h2><p>Original reference editions, copied into this app without modification.</p></div></div>
        <div className="resource-list card card-pad">{filteredDocuments.map((document) => <div className="resource-row" key={document.file}>
          <div><p className="resource-name">{document.title}</p><p className="resource-note">{document.detail}</p><span className="tag resource-file-tag">{document.file}</span></div>
          <a className="button button-outline" href={`/library/${document.file}`} target="_blank" rel="noreferrer" aria-label={`Open ${document.title} PDF in a new tab`}>Open <FileDown size={14} aria-hidden="true" /></a>
        </div>)}</div>
      </section>}

      {filteredResources.length > 0 && <section aria-labelledby="official-references">
        <div className="section-heading"><div><h2 id="official-references"><ExternalLink size={18} aria-hidden="true" /> Official references</h2><p>Start with first-party docs and training material for the tool you are using.</p></div></div>
        {groupedResources.map((category) => <div className="resource-category" key={category}><p className="eyebrow">{category}</p><div className="resource-card-grid">{filteredResources.filter((resource) => resource.category === category).map((resource) => <article className="card reference-card" key={resource.label}>
          <span className="tag resource-source-tag">Official source</span><h3>{resource.label}</h3><p>{resource.note}</p><a href={resource.url} target="_blank" rel="noreferrer">Open source <ArrowUpRight size={13} aria-hidden="true" /></a>
        </article>)}</div></div>)}
      </section>}

      {filteredGlossary.length > 0 && <section aria-labelledby="glossary-title">
        <div className="section-heading"><div><h2 id="glossary-title">Glossary</h2><p>Terms worth explaining in your own words.</p></div><span className="tag">{filteredGlossary.length} {normalizedQuery ? "matches" : "terms"}</span></div>
        <dl className="glossary-grid">{filteredGlossary.map(([term, definition]) => <div className="glossary-term" key={term}><dt>{term}</dt><dd>{definition}</dd></div>)}</dl>
        {!normalizedQuery && <p className="footer-note">The supplied reference calls this a 36-term glossary but contains 37 listed terms. This app retains every listed entry.</p>}
      </section>}
    </>}
  </section>;
}
