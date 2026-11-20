"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, CircleDashed, Layers3 } from "lucide-react";
import type { ProgressRecord } from "@/features/progress/model";
import { Progress } from "@/components/ui/progress";

type CourseItem = { id: number; title: string; phase: string };
const phaseNames = ["Foundations", "Infrastructure & Cloud", "Operations & Security"];

export function DashboardProgress({ modules }: { modules: CourseItem[] }) {
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [requiresSignIn, setRequiresSignIn] = useState(false);
  const load = useCallback(() => {
    fetch("/api/progress", { cache: "no-store" })
      .then((response) => {
        if (response.status === 401) {
          setRequiresSignIn(true);
          setRecords([]);
          setLoadError(false);
          return [] as ProgressRecord[];
        }
        if (!response.ok) throw new Error("Could not load saved progress.");
        setRequiresSignIn(false);
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => setRecords(rows))
      .then(() => setLoadError(false))
      .catch(() => { setRequiresSignIn(false); setLoadError(true); })
      .finally(() => setLoaded(true));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("progress-updated", load);
    return () => window.removeEventListener("progress-updated", load);
  }, [load]);

  const modulesByStatus = useMemo(() => new Map(records.filter((record) => record.itemType === "module").map((record) => [record.itemId, record])), [records]);
  const completed = modules.filter((module) => modulesByStatus.get(`M${String(module.id).padStart(2, "0")}`)?.status === "completed").length;
  const inProgress = modules.filter((module) => modulesByStatus.get(`M${String(module.id).padStart(2, "0")}`)?.status === "in_progress");
  const nextModule = inProgress[0] ?? modules.find((module) => modulesByStatus.get(`M${String(module.id).padStart(2, "0")}`)?.status !== "completed") ?? modules[0];
  const activityCount = records.filter((record) => record.itemType === "activity" && record.status === "completed").length;
  const projectCount = records.filter((record) => ["project", "small_project"].includes(record.itemType) && record.status === "completed").length;

  return (
    <>
      <div className="stat-grid" aria-live="polite">
        <div className="card stat-card"><span className="stat-icon"><BookOpen size={19} /></span><span><span className="stat-value">{loadError || requiresSignIn ? "—" : loaded ? completed : "…"}<span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 500 }}> / 24</span></span><span className="stat-label">Modules completed</span></span></div>
        <div className="card stat-card"><span className="stat-icon" style={{ background: "#e9f4ef", color: "var(--green)" }}><CheckCircle2 size={19} /></span><span><span className="stat-value">{loadError || requiresSignIn ? "—" : loaded ? activityCount : "…"}</span><span className="stat-label">Activities completed</span></span></div>
        <div className="card stat-card"><span className="stat-icon" style={{ background: "#f7f1e5", color: "var(--amber)" }}><Layers3 size={19} /></span><span><span className="stat-value">{loadError || requiresSignIn ? "—" : loaded ? projectCount : "…"}</span><span className="stat-label">Projects marked done</span></span></div>
      </div>
      {loadError && <p className="form-message error" role="status">Saved progress could not be loaded. Counts and recommendations may be incomplete until the database is available.</p>}
      {requiresSignIn && <p className="form-message" role="status">Sign in to view your private progress. <Link href="/sign-in?returnTo=%2F">Sign in</Link></p>}
      <div className="card card-pad">
        <div className="section-heading" style={{ margin: "0 0 16px" }}><div><h2>Your learning path</h2><p>Move at your own pace; there are no weekly deadlines.</p></div><span className="tag">{loadError ? "Unavailable" : requiresSignIn ? "Private progress" : loaded ? "Account progress" : "Loading"}</span></div>
        <div className="track-list">
          {phaseNames.map((phase) => {
            const items = modules.filter((module) => module.phase === phase);
            const count = items.filter((module) => modulesByStatus.get(`M${String(module.id).padStart(2, "0")}`)?.status === "completed").length;
            const percent = loadError || requiresSignIn || !loaded ? 0 : Math.round((count / items.length) * 100);
            return <div className="track-row" key={phase}><span className="track-name">{phase === "Infrastructure & Cloud" ? "Delivery" : phase === "Operations & Security" ? "Operations" : "Foundations"}</span><Progress className="track-progress" aria-label={`${phase}: ${requiresSignIn ? "sign in to view saved status" : `${count} of ${items.length} modules completed`}`} value={percent} /><span className="track-count">{requiresSignIn ? "—" : `${count}/${items.length}`}</span></div>;
          })}
        </div>
      </div>
      <div className="card card-pad">
        <div className="section-heading" style={{ margin: "0 0 13px" }}><div><h2>Pick up where you left off</h2><p>Next module on the roadmap</p></div><CircleDashed size={19} color="var(--blue)" /></div>
        <h3 style={{ marginBottom: 5 }}>{nextModule ? `Module ${String(nextModule.id).padStart(2, "0")}: ${nextModule.title}` : "All modules are complete"}</h3>
        <p className="course-detail" style={{ marginBottom: 13 }}>{nextModule?.phase ?? "Take a moment to review your evidence."}</p>
        {nextModule && !loadError && loaded && <Link className="button button-primary" href={`/modules/${String(nextModule.id).padStart(2, "0")}`}>Continue learning <ArrowRight size={15} /></Link>}
      </div>
    </>
  );
}

