"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { subscribeToProjectLocation, updateProjectHash } from "@/features/projects/project-location";

export type ProjectFlowStage = {
  id: string;
  label: string;
  content: ReactNode;
};

function stageFromHash(hash: string, stages: ProjectFlowStage[]) {
  const value = hash.replace(/^#/, "");
  if (value.startsWith("milestone-")) return stages.find(({ id }) => id === "project-build")?.id ?? stages[0]?.id;
  return stages.find(({ id }) => id === value)?.id ?? stages[0]?.id;
}

export function ProjectFlowNav({ stages }: { stages: ProjectFlowStage[] }) {
  const [activeStage, setActiveStage] = useState(stages[0]?.id ?? "");
  const [visitedStages, setVisitedStages] = useState(() => new Set(stages[0] ? [stages[0].id] : []));
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = Math.max(0, stages.findIndex(({ id }) => id === activeStage));

  const revealStage = useCallback((id: string, updateHistory = false, moveFocus = false) => {
    setActiveStage(id);
    setVisitedStages((current) => current.has(id) ? current : new Set([...current, id]));
    if (updateHistory) updateProjectHash(`#${id}`, "push");
    if (!moveFocus) return;
    window.requestAnimationFrame(() => {
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      document.querySelector(".project-detail-header")?.scrollIntoView({ block: "start", behavior });
      document.getElementById(`${id}-title`)?.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    const syncStageFromLocation = () => {
      const id = stageFromHash(window.location.hash, stages);
      if (!id) return;
      setActiveStage(id);
      setVisitedStages((current) => current.has(id) ? current : new Set([...current, id]));
      if (window.location.hash && !window.location.hash.startsWith("#milestone-")) {
        window.requestAnimationFrame(() => document.querySelector(".project-detail-header")?.scrollIntoView({ block: "start" }));
      }
    };
    syncStageFromLocation();
    return subscribeToProjectLocation(syncStageFromLocation);
  }, [stages]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % stages.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + stages.length) % stages.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = stages.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const stage = stages[nextIndex];
    if (!stage) return;
    revealStage(stage.id, true);
    tabRefs.current[nextIndex]?.focus();
  }

  const previous = stages[activeIndex - 1];
  const next = stages[activeIndex + 1];

  return <div className="project-flow">
    <nav className="activity-workflow-nav project-workflow-nav" role="tablist" aria-label="Project stages">
      {stages.map(({ id, label }, index) => <button
        key={id}
        ref={(element) => { tabRefs.current[index] = element; }}
        type="button"
        role="tab"
        id={`project-tab-${id}`}
        aria-controls={`project-panel-${id}`}
        aria-selected={activeStage === id}
        tabIndex={activeStage === id ? 0 : -1}
        onClick={() => revealStage(id, true)}
        onKeyDown={(event) => handleTabKeyDown(event, index)}
      >
        <span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong>
      </button>)}
    </nav>

    <div className="project-stage-panels">
      {stages.map(({ id, content }) => <div
        key={id}
        id={`project-panel-${id}`}
        className="project-stage-panel"
        role="tabpanel"
        aria-labelledby={`project-tab-${id}`}
        hidden={activeStage !== id}
        tabIndex={0}
      >
        {(id === "project-review" ? activeStage === id : visitedStages.has(id)) ? content : null}
      </div>)}
    </div>

    <nav className="project-stage-actions" aria-label="Project stage navigation">
      {previous
        ? <button className="button button-outline" type="button" onClick={() => revealStage(previous.id, true, true)}><ArrowLeft size={14} aria-hidden="true" />Previous: {previous.label}</button>
        : <span aria-hidden="true" />}
      {next && <button className="button button-primary" type="button" onClick={() => revealStage(next.id, true, true)}>{next.label}<ArrowRight size={14} aria-hidden="true" /></button>}
    </nav>
  </div>;
}
