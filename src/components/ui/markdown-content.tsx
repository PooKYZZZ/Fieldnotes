import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
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

function MarkdownHeading3({ children, id }: ComponentProps<"h3">) {
  return <h3 id={id}>{children}</h3>;
}

function MarkdownPre({ children: content, "data-copyable": copyable }: ComponentProps<"pre"> & { "data-copyable"?: boolean; node?: unknown }) {
  const code = Array.isArray(content) ? content[0] : content;
  const isDiagram = isValidElement<{ className?: string }>(code)
    && code.props.className?.split(/\s+/).includes("language-diagram");
  if (isDiagram) return <figure className="lesson-diagram" aria-label="Text diagram"><pre>{content}</pre></figure>;
  if (copyable && isValidElement<{ children?: ReactNode }>(code)) {
    const value = nodeText(code.props.children);
    if (value.trim()) return <div className="copyable-code-block"><CopyCodeButton value={value} /><pre>{content}</pre></div>;
  }
  return <pre>{content}</pre>;
}

function MarkdownParagraph({ children: paragraph, ...props }: ComponentProps<"p"> & { node?: unknown }) {
  const nodes = Children.toArray(paragraph);
  if (nodes.length === 1 && isValidElement(nodes[0]) && nodes[0].type === CurriculumDiagram) return nodes[0];
  return <p {...props}>{paragraph}</p>;
}

export const markdownComponents: Components = {
  h3: MarkdownHeading3,
  pre: MarkdownPre,
  img: CurriculumDiagram,
  p: MarkdownParagraph,
};

type MarkdownTreeNode = {
  type?: string;
  tagName?: string;
  value?: string;
  children?: MarkdownTreeNode[];
  properties?: Record<string, unknown>;
};

export function rehypeMarkdownOptions(options: { headingIdPrefix?: string; copyable: boolean }) {
  return (tree: MarkdownTreeNode) => {
    const visit = (node: MarkdownTreeNode): string => {
      const text = node.value ?? node.children?.map(visit).join("") ?? "";
      if (node.type === "element" && node.tagName === "h3" && options.headingIdPrefix) {
        node.properties = { ...node.properties, id: `${options.headingIdPrefix}-${slugifyHeading(text)}` };
      }
      if (node.type === "element" && node.tagName === "pre" && options.copyable) {
        node.properties = { ...node.properties, "data-copyable": true };
      }
      return text;
    };
    visit(tree);
  };
}

export function MarkdownContent({
  children,
  headingIdPrefix,
  copyable = false,
}: {
  children: string;
  headingIdPrefix?: string;
  copyable?: boolean;
}) {
  return <div className="article-copy"><ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight, () => rehypeMarkdownOptions({ headingIdPrefix, copyable })]}>{children}</ReactMarkdown></div>;
}

