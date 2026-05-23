import HelpScreenshot from "./HelpScreenshot";
import HelpVideoEmbed from "./HelpVideoEmbed";
import HelpRelatedLinks from "./HelpRelatedLinks";

const CALLOUT_STYLES = {
  info: "border-sky-500/30 bg-sky-950/30",
  warning: "border-amber-500/40 bg-amber-950/20",
  tip: "border-emerald-500/30 bg-emerald-950/20",
};

export default function HelpArticleBody({ blocks, audience = "parent" }) {
  const prose =
    audience === "student"
      ? "text-lg sm:text-xl leading-relaxed"
      : "text-base sm:text-lg leading-relaxed";

  if (!blocks?.length) return null;

  return (
    <div className={`space-y-4 text-white/85 ${prose}`}>
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
          const cls =
            block.level === 3
              ? "text-xl font-bold text-amber-100 mt-6 mb-2"
              : "text-2xl font-bold text-amber-200 mt-8 mb-3";
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
              className={`rounded-xl border px-4 py-3 text-right text-sm sm:text-base ${CALLOUT_STYLES[block.tone] || CALLOUT_STYLES.info}`}
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
              poster={block.poster}
              captions={block.captions}
              transcriptHe={block.transcriptHe}
              durationSec={block.durationSec}
            />
          );
        }

        if (block.kind === "disclaimerQuote") {
          return (
            <aside
              key={key}
              className="rounded-lg border border-white/14 bg-white/[0.06] px-4 py-4 text-right"
              role="note"
              dir="rtl"
            >
              <h2 className="text-sm font-extrabold text-white/90 mb-3">{block.title}</h2>
              <div className="space-y-2 text-sm leading-relaxed text-white/76">
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
