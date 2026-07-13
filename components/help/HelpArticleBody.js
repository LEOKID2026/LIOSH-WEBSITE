import HelpScreenshot from "./HelpScreenshot";
import HelpVideoEmbed from "./HelpVideoEmbed";
import HelpRelatedLinks from "./HelpRelatedLinks";
import { useSharedShellUi } from "../../hooks/useSharedShellUi.js";

export default function HelpArticleBody({ blocks, audience = "parent" }) {
  const { SP } = useSharedShellUi();
  const prose =
    audience === "student"
      ? "text-lg sm:text-xl leading-relaxed"
      : "text-base sm:text-lg leading-relaxed";

  const calloutStyles = {
    info: SP.calloutInfo,
    warning: SP.calloutWarning,
    tip: SP.calloutTip,
  };

  if (!blocks?.length) return null;

  return (
    <div className={`${SP.articleProse} ${prose}`}>
      {blocks.map((block, i) => {
        const key = `${block.kind}-${i}`;

        if (block.kind === "paragraph") {
          return (
            <p key={key} className="text-right m-0">
              {block.text}
            </p>
          );
        }

        if (block.kind === "heading") {
          const Tag = block.level === 3 ? "h3" : "h2";
          const cls = block.level === 3 ? SP.articleH3 : SP.articleH2;
          return (
            <Tag key={key} id={block.id} className={`text-right scroll-mt-24 ${cls}`}>
              {block.text}
            </Tag>
          );
        }

        if (block.kind === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={key}
              className={`text-right pr-5 space-y-2 ${block.ordered ? "list-decimal" : "list-disc"}`}
            >
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ListTag>
          );
        }

        if (block.kind === "callout") {
          return (
            <aside
              key={key}
              className={`rounded-xl border px-4 py-3 text-right text-sm sm:text-base ${calloutStyles[block.tone] || calloutStyles.info}`}
              role="note"
            >
              {block.text}
            </aside>
          );
        }

        if (block.kind === "screenshot") {
          return (
            <HelpScreenshot
              key={key}
              path={block.path}
              alt={block.alt}
              caption={block.caption}
              sources={block.sources}
            />
          );
        }

        if (block.kind === "video") {
          return (
            <HelpVideoEmbed
              key={key}
              src={block.src}
              sources={block.sources}
              sourcesByViewport={block.sourcesByViewport}
              poster={block.poster}
              captions={block.captions}
              transcriptHe={block.transcriptHe}
              durationSec={block.durationSec}
            />
          );
        }

        if (block.kind === "disclaimerQuote") {
          return (
            <aside key={key} className={SP.disclaimer} role="note" dir="rtl">
              <h2 className={SP.disclaimerTitle}>{block.title}</h2>
              <div className={SP.disclaimerText}>
                {block.paragraphs.map((p, j) => (
                  <p key={j} className="m-0">
                    {p}
                  </p>
                ))}
              </div>
            </aside>
          );
        }

        if (block.kind === "relatedLinks") {
          return <HelpRelatedLinks key={key} items={block.items} />;
        }

        return null;
      })}
    </div>
  );
}
