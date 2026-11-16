"use client";

import { useEffect, useState } from "react";

const stages = [
  { id: "project-assignment", label: "Understand" },
  { id: "project-design", label: "Prepare & design" },
  { id: "project-build", label: "Build & verify" },
  { id: "project-review", label: "Review & hand off" },
] as const;

export function ProjectFlowNav() {
  const [activeStage, setActiveStage] = useState<string>(stages[0].id);

  useEffect(() => {
    let frame = 0;
    const updateActiveStage = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const activationLine = Math.min(140, Math.max(72, window.innerHeight * 0.16));
        const reached = stages.filter(({ id }) => {
          const stage = document.getElementById(id);
          return stage && stage.getBoundingClientRect().top <= activationLine;
        });
        setActiveStage(reached.at(-1)?.id ?? stages[0].id);
      });
    };
    updateActiveStage();
    window.addEventListener("scroll", updateActiveStage, { passive: true });
    window.addEventListener("resize", updateActiveStage);
    window.addEventListener("hashchange", updateActiveStage);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateActiveStage);
      window.removeEventListener("resize", updateActiveStage);
      window.removeEventListener("hashchange", updateActiveStage);
    };
  }, []);

  return <nav className="activity-workflow-nav project-workflow-nav" aria-label="Project stages">
    {stages.map(({ id, label }, index) => <a
      key={id}
      href={`#${id}`}
      aria-current={activeStage === id ? "step" : undefined}
      onClick={() => setActiveStage(id)}
    >
      <span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong>
    </a>)}
  </nav>;
}
