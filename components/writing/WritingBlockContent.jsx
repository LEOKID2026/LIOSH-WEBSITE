/**

 * Shared writing block/item renderer — screen and print modes.

 */



import {

  baseLetterForAsset,

  wordTraceSegments,

} from "../../lib/writing/writing-trace-render.js";

import { resolveWritingTraceAssetUrl } from "../../lib/writing/writing-trace-asset-resolver.js";

import { writingFontFamilyFor } from "../../lib/writing/writing-constants.js";

import WritingTraceSvg from "./WritingTraceSvg.jsx";



/**

 * @param {import("../../lib/writing/writing-worksheet-types.js").TraceRenderMode} traceRenderMode

 */

function traceItemClass(traceRenderMode) {

  if (traceRenderMode === "full_trace") return "writing-item--full-trace";

  if (traceRenderMode === "stroke_path") return "writing-item--stroke-path";

  if (traceRenderMode === "outline") return "writing-item--outline";

  return "writing-item--faint";

}



/**

 * @param {{

 *   text: string,

 *   scriptStyle: import("../../lib/writing/writing-worksheet-types.js").ScriptStyle,

 *   language: "he" | "en" | "mixed",

 *   mode: "screen" | "print",

 * }} props

 */

function WritingWordTrace({ text, scriptStyle, language, mode }) {

  const lang = language === "en" ? "en" : "he";

  return (

    <span className="writing-word-trace" dir={lang === "en" ? "ltr" : "rtl"}>

      {wordTraceSegments(text).map((seg, idx) => {

        if (seg.type === "space") {

          return (

            <span key={`sp-${idx}`} className="writing-word-trace-space" aria-hidden="true">

              {" "}

            </span>

          );

        }

        const base = baseLetterForAsset(seg.value);

        let asset = null;
        try {
          asset = resolveWritingTraceAssetUrl({
            language: lang,
            scriptStyle,
            character: base,
            traceRenderMode: "full_trace",
          });
        } catch {
          asset = null;
        }

        if (!asset) {

          return (

            <span
              key={`ch-${idx}`}
              className="writing-word-trace-error"
              data-writing-trace-error="true"
              data-writing-trace-error-message={`Missing trace asset for ${base}`}
            >

              {process.env.NODE_ENV !== "production" ? `⚠ ${base}` : seg.value}

            </span>

          );

        }

        return (

          <span key={`ch-${idx}`} className="writing-word-trace-char">

            <WritingTraceSvg

              src={asset}

              className="writing-glyph-svg writing-glyph-svg--trace"

              character={base}

              scriptStyle={scriptStyle}

              language={lang}

              traceRenderMode="full_trace"

              mode={mode}

            />

            {seg.value !== base ? (

              <span className="writing-word-trace-nikud" aria-hidden="true">

                {seg.value.slice(base.length)}

              </span>

            ) : null}

          </span>

        );

      })}

    </span>

  );

}



/**

 * @param {import("../../lib/writing/writing-worksheet-types.js").WritingItem} item

 * @param {import("../../lib/writing/writing-worksheet-types.js").WritingMeta} meta

 * @param {import("../../lib/writing/writing-worksheet-types.js").ScriptStyle} scriptStyle

 * @param {"screen" | "print"} mode

 */

function WritingItemView({ item, meta, scriptStyle, mode }) {

  const lang = meta.language === "en" ? "en" : meta.language === "mixed" ? "mixed" : "he";

  const fontFamily = writingFontFamilyFor(lang === "en" ? "en" : "he", scriptStyle);

  const dir = item.direction === "ltr" ? "ltr" : item.direction === "rtl" ? "rtl" : undefined;

  const traceClass = traceItemClass(item.traceRenderMode);

  const isHebrewModelSvg =
    item.itemType === "glyph" &&
    item.traceRenderMode === "faint_model" &&
    Boolean(item.svgAssetId) &&
    lang !== "en" &&
    /[\u0590-\u05FF]/.test(String(item.character || ""));

  const isTraceSvgMode =

    item.traceRenderMode === "full_trace" ||

    item.traceRenderMode === "outline" ||

    item.traceRenderMode === "stroke_path";

  const showGlyphText =

    (item.taskType !== "trace" ||

      item.traceRenderMode === "faint_model" ||

      (!isTraceSvgMode && !item.svgAssetId)) &&
    !isHebrewModelSvg;

  const showTraceSvg =

    (item.taskType === "trace" && isTraceSvgMode && item.svgAssetId && item.itemType !== "word") ||
    isHebrewModelSvg;



  if (item.itemType === "blank") {

    return (

      <div className="writing-item writing-item--blank" dir={dir}>

        <span className="writing-blank-line" aria-hidden="true" />

      </div>

    );

  }



  if (item.itemType === "path") {

    return (

      <div className="writing-item writing-item--path writing-item--full-trace" dir={dir}>

        <img

          src={item.pathAssetId}

          alt=""

          className="writing-path-svg"

          loading={mode === "screen" ? "lazy" : undefined}

        />

      </div>

    );

  }



  if (item.itemType === "number") {

    return (

      <div

        className={`writing-item writing-item--number writing-item--ltr-glyph writing-item--${item.taskType} ${traceClass}`}

        dir="ltr"

        style={{ fontFamily }}

      >

        {item.taskType === "quantity_match" && item.image ? (

          <img

            src={item.image.assetId}

            alt={item.image.altHe || ""}

            className="writing-qty-image"

            loading={mode === "screen" ? "lazy" : undefined}

          />

        ) : null}

        {showGlyphText ? <span className="writing-glyph writing-glyph--number">{item.value}</span> : null}

        {showTraceSvg ? (

          <WritingTraceSvg

            src={item.svgAssetId}

            className="writing-glyph-svg writing-glyph-svg--trace"

            character={String(item.value)}

            scriptStyle={scriptStyle}

            language={lang}

            traceRenderMode={item.traceRenderMode}

            mode={mode}

          />

        ) : null}

      </div>

    );

  }



  if (item.itemType === "word") {

    const useWordTrace = item.taskType === "trace" && item.traceRenderMode === "full_trace";

    return (

      <div

        className={`writing-item writing-item--word writing-item--${item.taskType} ${traceClass}`}

        dir={dir}

        style={{ fontFamily }}

      >

        {item.image ? (

          <img

            src={item.image.assetId}

            alt={item.image.altHe || ""}

            className="writing-word-image"

            loading={mode === "screen" ? "lazy" : undefined}

          />

        ) : null}

        {useWordTrace ? (

          <WritingWordTrace text={item.text} scriptStyle={scriptStyle} language={lang} mode={mode} />

        ) : showGlyphText ? (

          <span className="writing-glyph writing-glyph--word">{item.text}</span>

        ) : null}

        {!useWordTrace && showTraceSvg ? (

          <WritingTraceSvg

            src={item.svgAssetId}

            className="writing-glyph-svg writing-glyph-svg--trace"

            character={item.text?.charAt(0) || ""}

            scriptStyle={scriptStyle}

            language={lang}

            traceRenderMode={item.traceRenderMode}

            mode={mode}

          />

        ) : null}

      </div>

    );

  }



  if (item.itemType === "glyph") {
    const isLtrGlyph =
      item.direction === "ltr" ||
      lang === "en" ||
      (item.character && /[A-Za-z]/.test(String(item.character)));
    return (

      <div

        className={[
          "writing-item",
          "writing-item--glyph",
          `writing-item--${item.taskType}`,
          traceClass,
          isLtrGlyph ? "writing-item--ltr-glyph" : "",
        ]
          .filter(Boolean)
          .join(" ")}

        dir={isLtrGlyph ? "ltr" : dir}

        style={{ fontFamily }}

      >

        {showGlyphText ? <span className="writing-glyph">{item.character}</span> : null}

        {showTraceSvg ? (

          <WritingTraceSvg

            src={item.svgAssetId}

            className="writing-glyph-svg writing-glyph-svg--trace"

            character={item.character}

            scriptStyle={scriptStyle}

            language={lang}

            traceRenderMode={item.traceRenderMode}

            mode={mode}

          />

        ) : null}

      </div>

    );

  }



  if (item.itemType === "image") {

    return (

      <div className="writing-item writing-item--image" dir={dir}>

        <img

          src={item.image.assetId}

          alt={item.image.altHe || ""}

          className="writing-illustration"

          loading={mode === "screen" ? "lazy" : undefined}

        />

        {item.image.colorInstructionHe ? (

          <p className="writing-color-instruction">{item.image.colorInstructionHe}</p>

        ) : null}

      </div>

    );

  }



  return null;

}



/**

 * @param {{

 *   block: import("../../lib/writing/writing-worksheet-types.js").WritingBlock,

 *   meta: import("../../lib/writing/writing-worksheet-types.js").WritingMeta,

 *   scriptStyle: import("../../lib/writing/writing-worksheet-types.js").ScriptStyle,

 *   mode: "screen" | "print",

 * }} props

 */

export default function WritingBlockContent({ block, meta, scriptStyle, mode }) {

  const dir =

    block.direction === "ltr" ? "ltr" : block.direction === "rtl" ? "rtl" : undefined;



  if (block.blockType === "title") {

    return (

      <h2 className="writing-block writing-block--title" dir={dir}>

        {block.textHe}

      </h2>

    );

  }



  if (block.blockType === "instruction") {

    return (

      <p className="writing-block writing-block--instruction" dir={dir}>

        {block.textHe}

      </p>

    );

  }



  if (block.blockType === "practice" || block.blockType === "answer_area") {

    return (

      <div

        className={`writing-block writing-block--${block.blockType}`}

        dir={dir}

        data-density={meta.pageDensity}

        data-line-template={meta.lineTemplate}

        data-font-size={meta.fontSize || "md"}

        data-print-strength={meta.printStrength || "normal"}

      >

        {block.rows.map((row) => (

          <div key={row.rowId} className="writing-practice-row">

            {row.items.map((item) => (

              <WritingItemView

                key={item.itemId}

                item={item}

                meta={meta}

                scriptStyle={scriptStyle}

                mode={mode}

              />

            ))}

          </div>

        ))}

      </div>

    );

  }



  if (block.blockType === "image") {

    return (

      <div className="writing-block writing-block--image" dir={dir}>

        <img

          src={block.image.assetId}

          alt={block.image.altHe || ""}

          className="writing-illustration writing-illustration--block"

          loading={mode === "screen" ? "lazy" : undefined}

        />

        {block.image.colorInstructionHe ? (

          <p className="writing-color-instruction">{block.image.colorInstructionHe}</p>

        ) : null}

      </div>

    );

  }



  return null;

}



/**

 * @param {{

 *   page: import("../../lib/writing/writing-worksheet-types.js").WritingPage,

 *   meta: import("../../lib/writing/writing-worksheet-types.js").WritingMeta,

 *   scriptStyle: import("../../lib/writing/writing-worksheet-types.js").ScriptStyle,

 *   mode: "screen" | "print",

 *   inkSave?: boolean,

 *   showPrintHeader?: boolean,

 *   printHeaderTitle?: string,

 *   isLastPrintPage?: boolean,

 * }} props

 */

export function WritingPageContent({

  page,

  meta,

  scriptStyle,

  mode,

  inkSave,

  showPrintHeader,

  printHeaderTitle,

  isLastPrintPage,

}) {

  const orientation = page.orientation === "landscape" ? "landscape" : "portrait";

  const hasContent = page.blocks.some(

    (b) =>

      b.blockType === "practice" ||

      b.blockType === "answer_area" ||

      b.blockType === "title" ||

      b.blockType === "instruction" ||

      b.blockType === "image"

  );

  const rootClass = [

    "writing-page",

    `writing-page--${orientation}`,

    inkSave ? "writing-page--ink-save" : "",

    mode === "print" ? "writing-print-page" : "writing-screen-page",

    mode === "print" && isLastPrintPage ? "writing-print-page--last" : "",

    mode === "print" && !hasContent ? "writing-print-page--empty" : "",

  ]

    .filter(Boolean)

    .join(" ");



  return (

    <section

      className={rootClass}

      data-page-orientation={orientation}

      data-orientation={orientation}

      data-print-root={mode === "print" ? orientation : undefined}

      data-page-id={page.pageId}

      aria-label={mode === "print" ? `עמוד ${page.pageId}` : undefined}

    >

      {mode === "print" && showPrintHeader ? (

        <header className="writing-print-header worksheet-header worksheet-header-centered">

          <div className="worksheet-header-top">

            <div className="worksheet-brand-center">

              <img

                src="/images/coin.png"

                alt="LEO KIDS"

                width={56}

                height={56}

                className="worksheet-brand-logo"

              />

              <span className="worksheet-brand-name">LEO KIDS</span>

            </div>

            <h1 className="worksheet-title">{printHeaderTitle}</h1>

          </div>

          <p className="worksheet-meta">{meta.categoryHe}</p>

        </header>

      ) : null}

      {meta.includeNameField || meta.includeDateField ? (

        <div className="writing-page-fields">

          {meta.includeNameField ? (

            <div className="writing-page-field">

              <span className="writing-page-field-label">שם:</span>

              <span className="writing-page-field-line" aria-hidden="true" />

            </div>

          ) : null}

          {meta.includeDateField ? (

            <div className="writing-page-field">

              <span className="writing-page-field-label">תאריך:</span>

              <span className="writing-page-field-line" aria-hidden="true" />

            </div>

          ) : null}

        </div>

      ) : null}

      {page.blocks.map((block, idx) => (

        <WritingBlockContent

          key={`${page.pageId}-${block.blockType}-${idx}`}

          block={block}

          meta={meta}

          scriptStyle={scriptStyle}

          mode={mode}

        />

      ))}

    </section>

  );

}



/**

 * @param {import("../../lib/writing/writing-worksheet-types.js").WritingPage} page

 * @returns {boolean}

 */

export { writingPageHasContent } from "../../lib/writing/writing-page-utils.js";


