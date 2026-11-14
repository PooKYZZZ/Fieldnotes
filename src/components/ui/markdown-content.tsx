import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

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

export function MarkdownContent({ children, headingIdPrefix }: { children: string; headingIdPrefix?: string }) {
  const components: Components = {
    ...(headingIdPrefix
      ? {
          h3: ({ children: heading }: { children?: ReactNode }) => (
            <h3 id={`${headingIdPrefix}-${slugifyHeading(nodeText(heading))}`}>{heading}</h3>
          ),
        }
      : {}),
    pre: ({ children: content }) => {
      const code = Array.isArray(content) ? content[0] : content;
      const isDiagram = isValidElement<{ className?: string }>(code)
        && code.props.className?.split(/\s+/).includes("language-diagram");

      return isDiagram
        ? <figure className="lesson-diagram" aria-label="Text diagram"><pre>{content}</pre></figure>
        : <pre>{content}</pre>;
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

