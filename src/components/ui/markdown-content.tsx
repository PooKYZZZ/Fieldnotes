import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { ArrowRight } from "lucide-react";
import { CopyCodeButton } from "@/components/ui/copy-code-button";

function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

function slugifyHeading(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function CurriculumDiagram({ src, alt, title }: Pick<ComponentProps<"img">, "src" | "alt" | "title">) {
  return (
    <figure className="module-diagram">
      {/* Curriculum SVGs are local, authored assets with their own accessible metadata. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ""} title={title} loading="lazy" decoding="async" />
      {title && <figcaption>{title}</figcaption>}
    </figure>
  );
}

export function MarkdownContent({
  children,
  headingIdPrefix,
  copyable = false,
  taskIds,
  taskHints,
  onRecordTask,
}: {
  children: string;
  headingIdPrefix?: string;
  copyable?: boolean;
  taskIds?: readonly string[];
  taskHints?: Partial<Record<string, string>>;
  onRecordTask?: (taskId: string) => void;
}) {
  let taskIndex = 0;
  const components: Components = {
    ...(headingIdPrefix
      ? {
          h3: ({ children: heading }: { children?: ReactNode }) => (
            <h3 id={`${headingIdPrefix}-${slugifyHeading(nodeText(heading))}`}>{heading}</h3>
          ),
        }
      : {}),
    ...(taskIds ? {
      ol: ({ children: listChildren, ...props }) => (
        <ol {...props}>
          {Children.toArray(listChildren).map((child) => {
            if (!isValidElement<{ children?: ReactNode }>(child) || child.type !== "li") return child;
            const taskPosition = taskIndex;
            const taskId = taskIds[taskPosition];
            if (!taskId) return child;
            taskIndex += 1;
            const item = child as ReactElement<{ children?: ReactNode }>;
            return (
              <li key={item.key ?? taskId} id={`activity-task-${taskId}`} data-task-id={taskId}>
                {item.props.children}
                {onRecordTask && <button
                  type="button"
                  className="activity-task-record"
                  aria-label={`Record Task ${taskPosition + 1} in the investigation notebook`}
                  onClick={() => onRecordTask(taskId)}
                >
                  Record Task {taskPosition + 1}<ArrowRight size={14} aria-hidden="true" />
                </button>}
                {taskHints?.[taskId] && <details className="activity-task-help">
                  <summary>Need help with this task?</summary>
                  <div className="activity-task-help-content"><MarkdownContent>{taskHints[taskId]}</MarkdownContent></div>
                </details>}
              </li>
            );
          })}
        </ol>
      ),
    } : {}),
    pre: ({ children: content }) => {
      const code = Array.isArray(content) ? content[0] : content;
      const isDiagram = isValidElement<{ className?: string }>(code)
        && code.props.className?.split(/\s+/).includes("language-diagram");

      if (isDiagram) return <figure className="lesson-diagram" aria-label="Text diagram"><pre>{content}</pre></figure>;
      if (copyable && isValidElement<{ children?: ReactNode }>(code)) {
        const value = nodeText(code.props.children);
        if (value.trim()) {
          return <div className="copyable-code-block"><CopyCodeButton value={value} /><pre>{content}</pre></div>;
        }
      }
      return <pre>{content}</pre>;
    },
    img: CurriculumDiagram,
    p: ({ children: paragraph, ...props }) => {
      const nodes = Children.toArray(paragraph);
      if (nodes.length === 1 && isValidElement(nodes[0]) && nodes[0].type === CurriculumDiagram) {
        return nodes[0];
      }
      return <p {...props}>{paragraph}</p>;
    },
  };

  return <div className="article-copy"><ReactMarkdown components={components} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{children}</ReactMarkdown></div>;
}

