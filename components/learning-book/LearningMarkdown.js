import MixedHebrewMathText from "./MixedHebrewMathText";
import BookDiagram from "./BookDiagram";

function MarkdownBlock({ block }) {
  if (block.type === "code") {
    return <BookDiagram content={block.content} />;
  }

  if (block.type === "hr") {
    return <hr className="my-6 border-white/10" />;
  }

  if (block.type === "ul") {
    return (
      <ul className="my-3 list-disc space-y-2.5 pr-6 text-right">
        {block.items.map((item, i) => (
          <li key={i}>
            <MixedHebrewMathText text={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "ol") {
    return (
      <ol className="my-3 list-decimal space-y-2.5 pr-6 text-right">
        {block.items.map((item, i) => (
          <li key={i}>
            <MixedHebrewMathText text={item} />
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "p") {
    return (
      <p className="my-4 text-right leading-relaxed" dir="rtl">
        <MixedHebrewMathText text={block.content} />
      </p>
    );
  }

  return null;
}

function splitMarkdownBlocks(body) {
  if (!body?.trim()) return [];

  /** @type {{ type: string, content?: string, items?: string[] }[]} */
  const blocks = [];
  const segments = body.split(/(```[\s\S]*?```)/g);

  for (const segment of segments) {
    if (!segment.trim()) continue;

    if (segment.startsWith("```") && segment.endsWith("```")) {
      const content = segment.slice(3, -3).replace(/^\n/, "").replace(/\n$/, "");
      blocks.push({ type: "code", content });
      continue;
    }

    const chunks = segment.split(/\n\n+/);
    for (const chunk of chunks) {
      const trimmed = chunk.trim();
      if (!trimmed) continue;

      if (/^---+$/.test(trimmed)) {
        blocks.push({ type: "hr" });
        continue;
      }

      const listLines = trimmed.split("\n");
      if (listLines.every((line) => /^[-*]\s+/.test(line))) {
        blocks.push({
          type: "ul",
          items: listLines.map((line) => line.replace(/^[-*]\s+/, "")),
        });
        continue;
      }

      if (listLines.every((line) => /^\d+\.\s+/.test(line))) {
        blocks.push({
          type: "ol",
          items: listLines.map((line) => line.replace(/^\d+\.\s+/, "")),
        });
        continue;
      }

      blocks.push({ type: "p", content: trimmed.replace(/\n/g, " ") });
    }
  }

  return blocks;
}

export default function LearningMarkdown({ content }) {
  const blocks = splitMarkdownBlocks(content);
  if (!blocks.length) return null;

  return (
    <div className="learning-book-markdown text-white/92">
      {blocks.map((block, i) => (
        <MarkdownBlock key={i} block={block} />
      ))}
    </div>
  );
}
