import ReadyWorksheetPublicPage from "../../../components/worksheets/ReadyWorksheetPublicPage.jsx";
import { READY_WORKSHEET_CATALOG } from "../../../lib/worksheets/worksheet-ready-catalog.js";
import {
  buildReadyWorksheetPublicPage,
  listReadyWorksheetPublicPageMetaBySlugs,
} from "../../../lib/worksheets/worksheet-ready-public-page.server.js";

/** @param {unknown} value */
function serializeForStaticProps(value) {
  return JSON.parse(JSON.stringify(value));
}

export async function getStaticPaths() {
  return {
    paths: READY_WORKSHEET_CATALOG.map((entry) => ({
      params: { slug: entry.slug },
    })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const slug = String(params?.slug || "").trim();
  const built = await buildReadyWorksheetPublicPage(slug);

  if (!built.ok) {
    return { notFound: true };
  }

  const relatedPages = listReadyWorksheetPublicPageMetaBySlugs(
    built.page.relatedWorksheetSlugs
  ).map((related) => ({
    slug: related.slug,
    h1: related.h1,
    subjectHe: related.subjectHe,
    gradeHe: related.gradeHe,
    topicHe: related.topicHe,
  }));

  return {
    props: {
      page: built.page,
      worksheetPayload: serializeForStaticProps(built.worksheetPayload),
      generation: serializeForStaticProps(built.generation),
      relatedPages,
    },
  };
}

export default function ReadyWorksheetPublicRoute({
  page,
  worksheetPayload,
  generation,
  relatedPages,
}) {
  return (
    <ReadyWorksheetPublicPage
      page={page}
      worksheetPayload={worksheetPayload}
      generation={generation}
      relatedPages={relatedPages}
    />
  );
}
