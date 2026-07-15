/**
 * Public worksheets hub — demo generator + ready catalog, no auth.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import ReadyWorksheetsTab from "./ReadyWorksheetsTab.jsx";
import CreateWorksheetTab from "./CreateWorksheetTab.jsx";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import { getPublicDemoAllowlistEntry } from "../../lib/worksheets/worksheet-public-demo.constants.js";
import { listMathPracticeFormatsForGradeTopic } from "../../lib/worksheets/worksheet-math-practice-format.js";
import {
  loadWorksheetIncludeAnswersPref,
  saveWorksheetIncludeAnswersPref,
} from "../../lib/worksheets/worksheet-include-answers-pref.client.js";
import {
  clearWorksheetPublicAnswerKeySession,
  saveWorksheetPublicPreviewSession,
} from "../../lib/worksheets/worksheet-public-preview-session.client.js";

/**
 * @param {string} subjectId
 * @param {string} gradeKey
 */
function defaultPublicDemoForm(subjectId, gradeKey) {
  const allow = getPublicDemoAllowlistEntry(subjectId, gradeKey);
  const topicKey = allow?.topicKey || "addition";
  const formats =
    subjectId === "math"
      ? listMathPracticeFormatsForGradeTopic(gradeKey, topicKey).filter((f) =>
          (allow?.mathPracticeFormats || []).includes(f.key)
        )
      : [];
  return {
    subjectId,
    gradeKey,
    topicKey,
    mathPracticeFormat: formats[0]?.key || allow?.mathPracticeFormats?.[0] || "",
    levelKey: "regular",
    preferMcq: false,
    inkSave: true,
    mixedTopicKeys: null,
  };
}

/**
 * @param {{ T: Record<string, string> }} props
 */
export default function PublicWorksheetsHub({ T }) {
  const router = useRouter();

  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [busySlug, setBusySlug] = useState(null);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterLevel, setFilterLevel] = useState("");

  const [createForm, setCreateForm] = useState(() => defaultPublicDemoForm("math", "g3"));
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [includeAnswersReady, setIncludeAnswersReady] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    setIncludeAnswers(loadWorksheetIncludeAnswersPref());
    setIncludeAnswersReady(true);
  }, []);

  const handleIncludeAnswersChange = useCallback((next) => {
    const value = next === true;
    setIncludeAnswers(value);
    saveWorksheetIncludeAnswersPref(value);
  }, []);

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const res = await fetch("/api/public/worksheets/catalog");
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCatalogError(data.error || WORKSHEET_UI_HE.errorGeneric);
        setCatalogItems([]);
        return;
      }
      setCatalogItems(data.items || []);
    } catch {
      setCatalogError(WORKSHEET_UI_HE.errorGeneric);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const openPreview = useCallback(
    (worksheetPayload, generation, includeAnswersValue, source, slug) => {
      clearWorksheetPublicAnswerKeySession();
      saveWorksheetPublicPreviewSession({
        worksheetPayload,
        generation,
        includeAnswers: includeAnswersValue === true,
        source,
        ...(slug ? { slug } : {}),
      });
      router.push("/practice/worksheets/preview");
    },
    [router]
  );

  const handleReadyViewPrint = useCallback(
    async (slug) => {
      setBusySlug(slug);
      try {
        const res = await fetch(`/api/public/worksheets/ready/${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setCatalogError(data.error || WORKSHEET_UI_HE.errorGeneric);
          return;
        }
        openPreview(
          data.worksheetPayload,
          data.generation,
          includeAnswers,
          "public-ready",
          slug
        );
      } catch {
        setCatalogError(WORKSHEET_UI_HE.errorGeneric);
      } finally {
        setBusySlug(null);
      }
    },
    [openPreview, includeAnswers]
  );

  const handleCreateSubmit = useCallback(async () => {
    setCreateBusy(true);
    setCreateError("");
    try {
      const newSeed = Math.floor(Math.random() * 1_000_000);
      /** @type {Record<string, unknown>} */
      const body = {
        subjectId: createForm.subjectId,
        gradeKey: createForm.gradeKey,
        topicKey: createForm.topicKey,
        levelKey: createForm.levelKey,
        inkSave: createForm.inkSave,
        seed: newSeed,
        mathPracticeFormat:
          createForm.subjectId === "math" && createForm.mathPracticeFormat
            ? createForm.mathPracticeFormat
            : undefined,
        preferMcq: createForm.preferMcq === true,
      };

      const res = await fetch("/api/public/worksheets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setCreateError(data.message || data.error || WORKSHEET_UI_HE.errorGeneric);
        return;
      }
      openPreview(data.worksheetPayload, data.generation, includeAnswers, "public-demo");
    } catch {
      setCreateError(WORKSHEET_UI_HE.errorGeneric);
    } finally {
      setCreateBusy(false);
    }
  }, [createForm, openPreview, includeAnswers]);

  const filteredCatalogItems = useMemo(() => {
    return catalogItems.filter((item) => {
      if (filterSubject && item.subjectId !== filterSubject) return false;
      if (filterGrade && item.gradeKey !== filterGrade) return false;
      if (filterLevel && item.levelKey !== filterLevel) return false;
      return true;
    });
  }, [catalogItems, filterSubject, filterGrade, filterLevel]);

  const handleCatalogFilterChange = useCallback((patch) => {
    if ("filterSubject" in patch) setFilterSubject(patch.filterSubject);
    if ("filterGrade" in patch) setFilterGrade(patch.filterGrade);
    if ("filterLevel" in patch) setFilterLevel(patch.filterLevel);
  }, []);

  return (
    <div dir="rtl" lang="he" className="worksheet-hub-page space-y-8">
      <section id="demo" className="scroll-mt-24 space-y-4">
        <CreateWorksheetTab
          form={createForm}
          onChange={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
          onSubmit={handleCreateSubmit}
          busy={createBusy}
          error={createError}
          includeAnswers={includeAnswers}
          includeAnswersReady={includeAnswersReady}
          onIncludeAnswersChange={handleIncludeAnswersChange}
          T={T}
          variant="public-demo"
        />
        <p className={`text-sm leading-relaxed ${T.muted}`}>
          במערכת המלאה להורים ניתן ליצור דפי עבודה שוב ושוב, ללא הגבלה. הדפים נוצרים מחדש
          ומשתנים בין יצירה ליצירה.
        </p>
      </section>

      <section id="catalog" className="scroll-mt-24 space-y-4">
        <ReadyWorksheetsTab
          items={filteredCatalogItems}
          loading={catalogLoading}
          error={catalogError}
          onViewPrint={handleReadyViewPrint}
          busySlug={busySlug}
          filterSubject={filterSubject}
          filterGrade={filterGrade}
          filterLevel={filterLevel}
          onFilterChange={handleCatalogFilterChange}
          includeAnswers={includeAnswers}
          includeAnswersReady={includeAnswersReady}
          onIncludeAnswersChange={handleIncludeAnswersChange}
          T={T}
          titleOverride={WORKSHEET_UI_HE.publicReadyTitle}
          hintOverride={WORKSHEET_UI_HE.publicReadyHint}
        />
      </section>
    </div>
  );
}
