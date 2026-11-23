import { MarkdownPre } from "@/components/ui/markdown-content";

export function CommandExample({ title, language, command, explanation }: {
  title: string;
  language: "bash" | "python" | "text";
  command: string;
  explanation: string;
}) {
  return (
    <figure className="learning-command-example">
      <figcaption><span className="eyebrow">Example · {language}</span><h4>{title}</h4></figcaption>
      <MarkdownPre data-copyable><code className={`language-${language}`}>{command}</code></MarkdownPre>
      <p>{explanation}</p>
    </figure>
  );
}
