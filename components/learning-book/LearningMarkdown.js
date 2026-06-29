import BookContentLine from "./BookContentLine";
import BookDiagram from "./BookDiagram";
import BookPipeTable from "./BookPipeTable";
import GeometryDiagram from "./GeometryDiagram";
import { splitBookMarkdownBlocks } from "../../lib/learning-book/book-markdown-blocks";

function BookProseBlock({ lines }) {
  if (!lines?.length) return null;

  return (
    <div className="my-4 space-y-2.5 text-right leading-relaxed" dir="rtl">
      {lines.map((line, i) => (
        <div key={i}>
          <BookContentLine text={line} context="prose" />
        </div>
      ))}
    </div>
  );
}

function MarkdownBlock({ block }) {
  if (block.type === "geometry_diagram") {
    return (
      <GeometryDiagram type={block.diagramType} options={block.options || {}} />
    );
  }

  if (block.type === "code") {
    return <BookDiagram content={block.content} />;
  }

  if (block.type === "pipe_table") {
    return <BookPipeTable headers={block.headers} rows={block.rows} />;
  }

  if (block.type === "hr") {
    return <hr className="my-6 border-[color:var(--book-divider)]" />;
  }

  if (block.type === "ul") {
    return (
      <ul className="my-3 list-disc space-y-3 pr-6 text-right">
        {block.items.map((itemLines, i) => (
          <li key={i} className="space-y-2">
            {itemLines.map((line, j) => (
              <div key={j}>
                <BookContentLine text={line} context="prose" />
              </div>
            ))}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "ol") {
    return (
      <ol className="my-3 list-decimal space-y-3 pr-6 text-right">
        {block.items.map((itemLines, i) => (
          <li key={i} className="space-y-2">
            {itemLines.map((line, j) => (
              <div key={j}>
                <BookContentLine text={line} context="prose" />
              </div>
            ))}
          </li>
        ))}
      </ol>
    );
  }

  if (block.type === "prose") {
    return <BookProseBlock lines={block.lines} />;
  }

  return null;
}

export default function LearningMarkdown({ content }) {
  const blocks = splitBookMarkdownBlocks(content);
  if (!blocks.length) return null;

  return (
    <div className="learning-book-markdown text-[color:var(--book-text)]">
      {blocks.map((block, i) => (
        <MarkdownBlock key={i} block={block} />
      ))}
    </div>
  );
}
