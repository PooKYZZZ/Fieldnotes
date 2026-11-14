export function CommandExample({ title, language, command, explanation }: {
  title: string;
  language: "bash" | "python" | "text";
  command: string;
  explanation: string;
}) {
  return (
    <figure className="learning-command-example">
      <figcaption><span className="eyebrow">Example · {language}</span><h4>{title}</h4></figcaption>
      <pre><code className={`language-${language}`}>{command}</code></pre>
      <p>{explanation}</p>
    </figure>
  );
}
