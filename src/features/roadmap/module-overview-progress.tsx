"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { ActivityRecord, ModuleRecord } from "@/content";
import { ProgressEditor } from "@/features/progress/progress-editor";
import { formatStatus, type ProgressRecord, type ProgressStatus } from "@/features/progress/model";
import { lessonRoute, moduleRoute } from "@/features/learning/routes";

type Lesson = ModuleRecord["lessons"][number];

export function ModuleOverviewProgress({
  learningModule,
  activity,
}: {
  learningModule: ModuleRecord;
  activity?: ActivityRecord;
}) {
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const moduleId = `M${String(learningModule.id).padStart(2, "0")}`;

  const load = useCallback(() => {
    const controller = new AbortController();
    fetch("/api/progress", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Saved progress could not be loaded.");
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => {
        setRecords(rows);
        setLoadError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoaded(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cancelLoad = load();
    window.addEventListener("progress-updated", load);
    return () => {
      cancelLoad();
      window.removeEventListener("progress-updated", load);
    };
  }, [load]);

  const lessonIds = useMemo(() => new Set(learningModule.lessons.map((lesson) => lesson.id)), [learningModule.lessons]);
  const lessonProgress = records.filter((record) => record.itemType === "lesson" && lessonIds.has(record.itemId));
  const completedLessons = lessonProgress.filter((record) => record.status === "completed").length;
  const lessonStatusById = useMemo(() => new Map(lessonProgress.map((record) => [record.itemId, record.status])), [lessonProgress]);
  const activityStatus = activity
    ? records.find((record) => record.itemType === "activity" && record.itemId === activity.id)?.status as ProgressStatus | undefined
    : undefined;
  const progressValue = loaded && !loadError ? completedLessons : 0;
  const progressText = loadError ? "Unavailable" : loaded ? `${completedLessons} of ${learningModule.lessons.length} marked complete` : "Loading saved progress…";

  return (
    <section className="module-overview-progress" aria-label={`Progress for Module ${String(learningModule.id).padStart(2, "0")}`}>
      <div className="card module-lesson-progress-card">
        <div className="module-summary-heading">
          <div>
            <p className="eyebrow">Your module progress</p>
            <h2>Module {String(learningModule.id).padStart(2, "0")}</h2>
          </div>
          <span className="module-lesson-count">{learningModule.lessons.length} {learningModule.lessons.length === 1 ? "lesson" : "lessons"}</span>
        </div>
        <div className="module-lesson-progress-label"><span>Lessons marked complete</span><strong>{progressText}</strong></div>
        <div className="module-progress-track" role="progressbar" aria-label={`${learningModule.title} lessons marked complete`} aria-valuemin={0} aria-valuemax={learningModule.lessons.length} aria-valuenow={progressValue} aria-valuetext={progressText}>
          <span style={{ width: `${loaded && !loadError && learningModule.lessons.length ? (completedLessons / learningModule.lessons.length) * 100 : 0}%` }} />
        </div>
        <p className="module-progress-note">Lesson completion is self-reported; it does not measure mastery.</p>
        {activity && <div className="module-related-record">
          <div>
            <p className="eyebrow">Guided activity</p>
            <Link href={`/activities/${activity.id}`}>Activity {activity.id} · {activity.title}<ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          <span className={`progress-status-tag${activityStatus ? ` status-${activityStatus}` : ""}`}>
            {loadError ? "Unavailable" : loaded ? formatStatus(activityStatus ?? "not_started") : "Loading"}
          </span>
        </div>}
        {loaded && !loadError && lessonStatusById.size > 0 && (
          <p className="module-progress-latest"><CheckCircle2 size={14} aria-hidden="true" /> {lessonStatusById.size} lesson {lessonStatusById.size === 1 ? "record" : "records"} saved</p>
        )}
      </div>
      <ProgressEditor itemType="module" itemId={moduleId} title="Module summary" variant="module-summary" />
    </section>
  );
}

export function ModuleLessonOutline({
  moduleId,
  lessons,
  currentLessonId,
  compact = false,
}: {
  moduleId: number;
  lessons: Lesson[];
  currentLessonId?: string;
  compact?: boolean;
}) {
  const [records, setRecords] = useState<ProgressRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(() => {
    const controller = new AbortController();
    fetch("/api/progress", { cache: "no-store", signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Saved progress could not be loaded.");
        return response.json() as Promise<ProgressRecord[]>;
      })
      .then((rows) => {
        setRecords(rows);
        setLoadError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setRecords([]);
          setLoadError(true);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoaded(true); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cancelLoad = load();
    window.addEventListener("progress-updated", load);
    return () => {
      cancelLoad();
      window.removeEventListener("progress-updated", load);
    };
  }, [load]);

  const savedById = new Map(records.filter((record) => record.itemType === "lesson").map((record) => [record.itemId, record.status]));
  const completed = lessons.filter((lesson) => savedById.get(lesson.id) === "completed").length;
  const list = (
    <ol className={compact ? "lesson-contents-list lesson-contents-list--compact" : "lesson-contents-list"}>
      {lessons.map((lesson) => {
        const number = Number(lesson.id.match(/-L(\d+)$/)?.[1] ?? 0);
        const status = savedById.get(lesson.id);
        const selected = lesson.id === currentLessonId;
        const statusLabel = loadError ? "Progress unavailable" : loaded ? status === "completed" ? "Complete" : status ? formatStatus(status) : "Not started" : undefined;
        return <li key={lesson.id}>
          <Link className={`lesson-contents-link${selected ? " is-current" : ""}${status === "completed" ? " is-complete" : ""}`} href={lessonRoute(moduleId, lesson.id)} aria-current={selected ? "page" : undefined}>
            <span className="lesson-contents-number">{String(moduleId).padStart(2, "0")}.{number}</span>
            <span className="lesson-contents-copy"><strong>{lesson.title}</strong>{statusLabel && <span>{statusLabel}</span>}</span>
            <span className="lesson-contents-marker" aria-hidden="true">{status === "completed" ? <CheckCircle2 size={15} /> : <span />}</span>
          </Link>
        </li>;
      })}
    </ol>
  );

  if (compact) {
    return <details className="lesson-mobile-contents">
      <summary>Module contents <span>{loadError ? "Progress unavailable" : loaded ? `${completed} of ${lessons.length} complete` : `${lessons.length} lessons`}</span></summary>
      {list}
    </details>;
  }

  return <aside className="lesson-contents-sidebar" aria-label="Module lesson navigation">
    <div className="lesson-contents-heading">
      <p className="eyebrow">Module {String(moduleId).padStart(2, "0")}</p>
      <h2>Module contents</h2>
      <p>{loadError ? "Progress unavailable" : loaded ? `${completed} of ${lessons.length} marked complete` : `${lessons.length} lessons`}</p>
    </div>
    {list}
    <Link className="lesson-contents-overview" href={moduleRoute(moduleId)}>View module overview <ArrowRight size={14} aria-hidden="true" /></Link>
  </aside>;
}
