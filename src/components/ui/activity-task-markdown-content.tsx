"use client";

import { Children, createContext, isValidElement, useContext, type ComponentProps, type ReactElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { ArrowRight } from "lucide-react";
import { MarkdownContent, markdownComponents, rehypeMarkdownOptions } from "@/components/ui/markdown-content";

type TaskMarkdownOptions = {
  taskIds: readonly string[];
  taskHints?: Partial<Record<string, string>>;
  taskDetails?: Partial<Record<string, string>>;
  onRecordTask: (taskId: string, trigger: HTMLButtonElement) => void;
  recordTaskDisabled: boolean;
};

const TaskMarkdownOptionsContext = createContext<TaskMarkdownOptions | null>(null);

function TaskOrderedList({ children: listChildren, node, ...props }: ComponentProps<"ol"> & { node?: { position?: { start?: { column?: number } } } }) {
  const options = useContext(TaskMarkdownOptionsContext);
  const items = Children.toArray(listChildren).filter(
    (child) => typeof child !== "string" || child.trim().length > 0,
  );
  const isTaskList = options
    && node?.position?.start?.column === 1
    && items.length === options.taskIds.length
    && items.every((child) => isValidElement(child) && child.type === "li");
  if (!isTaskList || !options) return <ol {...props}>{listChildren}</ol>;
  return <ol {...props}>
    {items.map((child, taskPosition) => {
      if (!isValidElement<{ children?: ReactNode }>(child) || child.type !== "li") return child;
      const taskId = options.taskIds[taskPosition];
      if (!taskId) return child;
      const item = child as ReactElement<{ children?: ReactNode }>;
      const taskHint = options.taskHints?.[taskId];
      const taskDetail = options.taskDetails?.[taskId];
      const guidanceLabel = taskDetail && taskHint
        ? "Command notes and troubleshooting"
        : taskDetail ? "Explain these commands" : "Need help with this task?";
      return (
        <li key={item.key ?? taskId} id={`activity-task-${taskId}`} data-task-id={taskId}>
          {item.props.children}
          <button
            type="button"
            className="activity-task-record"
            aria-label={`Record Task ${taskPosition + 1} in the investigation notebook`}
            disabled={options.recordTaskDisabled}
            onClick={(event) => options.onRecordTask(taskId, event.currentTarget)}
          >
            Record Task {taskPosition + 1}<ArrowRight size={14} aria-hidden="true" />
          </button>
          {(taskDetail || taskHint) && <details className="activity-task-help">
            <summary>{guidanceLabel}</summary>
            <div className="activity-task-help-content">
              {taskDetail && <div className="activity-task-detail-copy"><MarkdownContent>{taskDetail}</MarkdownContent></div>}
              {taskHint && <div className="activity-task-hint-copy">{taskDetail && <strong>If your result differs</strong>}<MarkdownContent>{taskHint}</MarkdownContent></div>}
            </div>
          </details>}
        </li>
      );
    })}
  </ol>;
}

const taskMarkdownComponents: Components = { ...markdownComponents, ol: TaskOrderedList };

export function ActivityTaskMarkdownContent({
  children,
  taskIds,
  taskHints,
  taskDetails,
  onRecordTask,
  recordTaskDisabled = false,
  copyable = false,
}: TaskMarkdownOptions & { children: string; copyable?: boolean }) {
  const options = { taskIds, taskHints, taskDetails, onRecordTask, recordTaskDisabled };
  return <TaskMarkdownOptionsContext.Provider value={options}>
    <div className="article-copy"><ReactMarkdown components={taskMarkdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, () => rehypeMarkdownOptions({ copyable })]}>{children}</ReactMarkdown></div>
  </TaskMarkdownOptionsContext.Provider>;
}
