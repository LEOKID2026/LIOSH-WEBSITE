/**
 * Public worksheets hub — demo generator + ready catalog, no auth.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import ReadyWorksheetsTab from "./ReadyWorksheetsTab.jsx";
import CreateWorksheetTab from "./CreateWorksheetTab.jsx";
import CreateWritingWorksheetTab, {
  buildWritingGenerateBody,
  defaultWritingCreateForm,
} from "../writing/CreateWritingWorksheetTab.jsx";
import CreateColoringWorksheetTab, {
  buildColoringGenerateBody,
  defaultColoringCreateForm,
} from "../coloring/CreateColoringWorksheetTab.jsx";
import ColoringPreviewModal from "../coloring/ColoringPreviewModal.jsx";
import WorksheetPreviewModal from "./WorksheetPreviewModal.jsx";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";
import { getPublicSeoWideClasses } from "../seo/public-seo-wide-theme";
import { getPublicDemoAllowlistEntry } from "../../lib/worksheets/worksheet-public-demo.constants.js";
import { listMathPracticeFormatsForGradeTopic } from "../../lib/worksheets/worksheet-math-practice-format.js";
import {
  loadWorksheetIncludeAnswersPref,
  saveWorksheetIncludeAnswersPref,
} from "../../lib/worksheets/worksheet-include-answers-pref.client.js";
import {
  clearWorksheetPublicAnswerKeySession,
  saveWorksheetPublicPreviewSession,
  saveWorksheetPublicAnswerKeySession,
} from "../../lib/worksheets/worksheet-public-preview-session.client.js";
import { buildWorksheetSessionFingerprint } from "../../lib/worksheets/worksheet-fingerprint.js";
import { isWritingWorksheetPayload } from "../../lib/worksheets/worksheet-payload-kind.client.js";
import { getPublicWorksheetVisitSessionId } from "../../lib/analytics/public-worksheet-session.client.js";
import { trackPublicWorksheetPageViewedOnce } from "../../lib/analytics/track-public-worksheet-page-view.client.js";

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
 * @param {{
 *   T: Record<string, string>,
 *   landingEmbed?: boolean,
 *   generatorLead?: { h2: string, paragraph: string },
 *   readyLead?: { h2: string, paragraph: string },
 *   sectionLeadClass?: string,
 * }} props
 */
export default function PublicWorksheetsHub({
  T,
  landingEmbed = false,
  generatorLead,
  readyLead,
  sectionLeadClass = "",
}) {
  const router = useRouter();
  const { isBright } = useStudentTheme();
  const landingCls = landingEmbed ? getPublicSeoWideClasses(isBright) : null;

  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [busySlug, setBusySlug] = useState(null);
  const [filterSubject, setFilterSubject] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterWorksheetType, setFilterWorksheetType] = useState("");
  const [filterWritingCategory, setFilterWritingCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [createKind, setCreateKind] = useState("questions");
  const [createForm, setCreateForm] = useState(() => defaultPublicDemoForm("math", "g3"));
  const [writingForm, setWritingForm] = useState(() => defaultWritingCreateForm());
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [includeAnswersReady, setIncludeAnswersReady] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [writingCreateBusy, setWritingCreateBusy] = useState(false);
  const [writingCreateError, setWritingCreateError] = useState("");
  const [coloringCards, setColoringCards] = useState([]);
  const [coloringCatalogLoading, setColoringCatalogLoading] = useState(true);
  const [coloringForm, setColoringForm] = useState(() => defaultColoringCreateForm());
  const [coloringCreateBusy, setColoringCreateBusy] = useState(false);
  const [coloringCreateError, setColoringCreateError] = useState("");
  const [coloringPreviewPayload, setColoringPreviewPayload] = useState(null);
  const [worksheetPreviewSession, setWorksheetPreviewSession] = useState(null);
  const [previewRefreshLoading, setPreviewRefreshLoading] = useState(false);
  const [previewAnswerKeyLoading, setPreviewAnswerKeyLoading] = useState(false);
  const [previewModalError, setPreviewModalError] = useState("");

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

  useEffect(() => {
    (async () => {
      setColoringCatalogLoading(true);
      try {
        const res = await fetch("/api/public/worksheets/coloring-catalog");
        const data = await res.json();
        setColoringCards(res.ok && data.ok && Array.isArray(data.cards) ? data.cards : []);
      } catch {
        setColoringCards([]);
      } finally {
        setColoringCatalogLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    trackPublicWorksheetPageViewedOnce();
  }, []);

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

  const openWorksheetPreviewModal = useCallback(
    (worksheetPayload, generation, includeAnswersValue, source) => {
      clearWorksheetPublicAnswerKeySession();
      setPreviewModalError("");
      setWorksheetPreviewSession({
        worksheetPayload,
        generation,
        includeAnswers: includeAnswersValue === true,
        source,
      });
    },
    []
  );

  const handlePreviewModalRefresh = useCallback(async () => {
    if (
      !worksheetPreviewSession ||
      worksheetPreviewSession.source !== "public-demo" ||
      !worksheetPreviewSession.generation ||
      isWritingWorksheetPayload(worksheetPreviewSession.worksheetPayload)
    ) {
      return;
    }
    setPreviewModalError("");
    setPreviewRefreshLoading(true);
    try {
      const gen = worksheetPreviewSession.generation;
      const newSeed = Math.floor(Math.random() * 1_000_000);
      const res = await fetch("/api/public/worksheets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: gen.subjectId,
          gradeKey: gen.gradeKey,
          topicKey: gen.topicKey,
          levelKey: gen.levelKey,
          seed: newSeed,
          inkSave: gen.inkSave === true,
          mathPracticeFormat:
            typeof gen.mathPracticeFormat === "string" ? gen.mathPracticeFormat : undefined,
          ...(typeof gen.preferMcq === "boolean" ? { preferMcq: gen.preferMcq } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPreviewModalError(data.message || WORKSHEET_UI_HE.refreshQuestionsError);
        return;
      }
      clearWorksheetPublicAnswerKeySession();
      setWorksheetPreviewSession({
        worksheetPayload: data.worksheetPayload,
        generation: data.generation,
        includeAnswers: worksheetPreviewSession.includeAnswers === true,
        source: "public-demo",
      });
    } catch {
      setPreviewModalError(WORKSHEET_UI_HE.refreshQuestionsError);
    } finally {
      setPreviewRefreshLoading(false);
    }
  }, [worksheetPreviewSession]);

  const handlePreviewModalAnswerKey = useCallback(async () => {
    if (!worksheetPreviewSession?.generation || !worksheetPreviewSession.includeAnswers) {
      return;
    }
    setPreviewModalError("");
    clearWorksheetPublicAnswerKeySession();
    setPreviewAnswerKeyLoading(true);
    try {
      const expectedWorksheetFingerprint = buildWorksheetSessionFingerprint(
        worksheetPreviewSession.worksheetPayload,
        worksheetPreviewSession.generation
      );
      const body = {
        includeAnswers: true,
        expectedWorksheetFingerprint,
      };
      if (worksheetPreviewSession.source === "public-ready" && worksheetPreviewSession.slug) {
        body.source = "public-ready";
        body.slug = worksheetPreviewSession.slug;
      } else {
        Object.assign(body, worksheetPreviewSession.generation);
      }
      const res = await fetch("/api/public/worksheets/answer-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPreviewModalError(data.message || WORKSHEET_UI_HE.answerKeyStale);
        return;
      }
      saveWorksheetPublicPreviewSession(worksheetPreviewSession);
      saveWorksheetPublicAnswerKeySession(data.answerKeyPayload);
      setWorksheetPreviewSession(null);
      router.push("/practice/worksheets/preview/answers");
    } catch {
      setPreviewModalError(WORKSHEET_UI_HE.errorGeneric);
    } finally {
      setPreviewAnswerKeyLoading(false);
    }
  }, [worksheetPreviewSession, router]);

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
      const visitSessionId = getPublicWorksheetVisitSessionId();
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
        ...(visitSessionId ? { visitSessionId } : {}),
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
      openWorksheetPreviewModal(data.worksheetPayload, data.generation, includeAnswers, "public-demo");
    } catch {
      setCreateError(WORKSHEET_UI_HE.errorGeneric);
    } finally {
      setCreateBusy(false);
    }
  }, [createForm, openWorksheetPreviewModal, includeAnswers]);

  const handleWritingCreateSubmit = useCallback(async () => {
    setWritingCreateBusy(true);
    setWritingCreateError("");
    try {
      const newSeed = Math.floor(Math.random() * 1_000_000);
      const visitSessionId = getPublicWorksheetVisitSessionId();
      const body = {
        ...buildWritingGenerateBody(writingForm),
        seed: newSeed,
        source: "public-demo",
        presetId: writingForm.demoPresetId,
        ...(visitSessionId ? { visitSessionId } : {}),
      };
      const res = await fetch("/api/public/worksheets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setWritingCreateError(data.message || data.error || WORKSHEET_UI_HE.errorGeneric);
        return;
      }
      openWorksheetPreviewModal(
        data.worksheetPayload,
        data.generation,
        false,
        "public-writing-demo"
      );
    } catch {
      setWritingCreateError(WORKSHEET_UI_HE.errorGeneric);
    } finally {
      setWritingCreateBusy(false);
    }
  }, [writingForm, openWorksheetPreviewModal]);

  const handleColoringCreateSubmit = useCallback(async (cardKeyOverride) => {
    setColoringCreateBusy(true);
    setColoringCreateError("");
    try {
      const cardKey = String(cardKeyOverride || coloringForm.cardKey || "").trim();
      const body = buildColoringGenerateBody({ cardKey });
      const res = await fetch("/api/public/worksheets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setColoringCreateError(data.message || data.error || WORKSHEET_UI_HE.errorGeneric);
        return;
      }
      setColoringForm((prev) => ({ ...prev, cardKey }));
      setColoringPreviewPayload(data.worksheetPayload);
    } catch {
      setColoringCreateError(WORKSHEET_UI_HE.errorGeneric);
    } finally {
      setColoringCreateBusy(false);
    }
  }, [coloringForm.cardKey]);

  const handleCatalogFilterChange = useCallback((patch) => {
    if ("filterWorksheetType" in patch) setFilterWorksheetType(patch.filterWorksheetType);
    if ("filterWritingCategory" in patch) setFilterWritingCategory(patch.filterWritingCategory);
    if ("filterSubject" in patch) setFilterSubject(patch.filterSubject);
    if ("filterGrade" in patch) setFilterGrade(patch.filterGrade);
    if ("filterLevel" in patch) setFilterLevel(patch.filterLevel);
    if ("searchQuery" in patch) setSearchQuery(patch.searchQuery);
  }, []);

  return (
    <div dir="rtl" lang="he" className="worksheet-hub-page space-y-8">
      <section id="worksheet-generator" className="scroll-mt-24 space-y-4">
        {landingEmbed && generatorLead && landingCls ? (
          <>
            <h2 className={landingCls.sectionTitle}>{generatorLead.h2}</h2>
            <p className={`${sectionLeadClass} ${landingCls.body}`}>{generatorLead.paragraph}</p>
          </>
        ) : null}

        <div className="worksheet-create-type-toggle" role="tablist" aria-label="סוג מחולל">
          <button
            type="button"
            role="tab"
            aria-selected={createKind === "questions"}
            className={`worksheet-hub-tab ${createKind === "questions" ? T.tabActive : T.tabIdle}`}
            onClick={() => setCreateKind("questions")}
          >
            {WORKSHEET_UI_HE.createTypeQuestions}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={createKind === "writing"}
            className={`worksheet-hub-tab ${createKind === "writing" ? T.tabActive : T.tabIdle}`}
            onClick={() => setCreateKind("writing")}
          >
            {WORKSHEET_UI_HE.createTypeWriting}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={createKind === "coloring"}
            className={`worksheet-hub-tab ${createKind === "coloring" ? T.tabActive : T.tabIdle}`}
            onClick={() => setCreateKind("coloring")}
          >
            {WORKSHEET_UI_HE.createTypeColoring}
          </button>
        </div>

        {createKind === "coloring" ? (
          <CreateColoringWorksheetTab
            cards={coloringCards}
            selectedCardKey={coloringForm.cardKey}
            onSelectCardKey={(cardKey) => setColoringForm((prev) => ({ ...prev, cardKey }))}
            onSubmit={handleColoringCreateSubmit}
            busy={coloringCreateBusy}
            error={coloringCreateError}
            loading={coloringCatalogLoading}
            T={T}
            variant="public-demo"
            hidePanelHeader={landingEmbed}
          />
        ) : createKind === "writing" ? (
          <CreateWritingWorksheetTab
            form={writingForm}
            onChange={(patch) => setWritingForm((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleWritingCreateSubmit}
            busy={writingCreateBusy}
            error={writingCreateError}
            T={T}
            variant="public-demo"
            hidePanelHeader={landingEmbed}
          />
        ) : (
          <CreateWorksheetTab
            form={createForm}
            onChange={(patch) => setCreateForm((prev) => ({ ...prev, ...patch }))}
            onSubmit={handleCreateSubmit}
            onRefresh={handleCreateSubmit}
            busy={createBusy}
            error={createError}
            includeAnswers={includeAnswers}
            includeAnswersReady={includeAnswersReady}
            onIncludeAnswersChange={handleIncludeAnswersChange}
            T={T}
            variant="public-demo"
            hidePanelHeader={landingEmbed}
          />
        )}

        {landingEmbed ? null : (
          <p className={`text-sm leading-relaxed ${T.muted}`}>
            במערכת המלאה להורים ניתן ליצור דפי עבודה שוב ושוב, ללא הגבלה. הדפים נוצרים מחדש
            ומשתנים בין יצירה ליצירה.
          </p>
        )}
      </section>

      <section id="ready-worksheets" className="scroll-mt-24 space-y-4">
        {landingEmbed && readyLead && landingCls ? (
          <>
            <h2 className={landingCls.sectionTitle}>{readyLead.h2}</h2>
            <p className={`${sectionLeadClass} ${landingCls.body}`}>{readyLead.paragraph}</p>
          </>
        ) : null}
        <ReadyWorksheetsTab
          items={catalogItems}
          loading={catalogLoading}
          error={catalogError}
          onViewPrint={handleReadyViewPrint}
          busySlug={busySlug}
          filterWorksheetType={filterWorksheetType}
          filterWritingCategory={filterWritingCategory}
          filterSubject={filterSubject}
          filterGrade={filterGrade}
          filterLevel={filterLevel}
          searchQuery={searchQuery}
          onFilterChange={handleCatalogFilterChange}
          includeAnswers={includeAnswers}
          includeAnswersReady={includeAnswersReady}
          onIncludeAnswersChange={handleIncludeAnswersChange}
          T={T}
          titleOverride={WORKSHEET_UI_HE.publicReadyTitle}
          hintOverride={WORKSHEET_UI_HE.writingCatalogHint}
          hidePanelHeader={landingEmbed}
          enableLockedModal
        />
      </section>

      <ColoringPreviewModal
        worksheetPayload={coloringPreviewPayload}
        onClose={() => setColoringPreviewPayload(null)}
        T={T}
      />

      <WorksheetPreviewModal
        session={worksheetPreviewSession}
        onClose={() => setWorksheetPreviewSession(null)}
        onRefresh={
          worksheetPreviewSession &&
          !isWritingWorksheetPayload(worksheetPreviewSession.worksheetPayload) &&
          worksheetPreviewSession.source === "public-demo"
            ? handlePreviewModalRefresh
            : undefined
        }
        onAnswerKey={
          worksheetPreviewSession?.includeAnswers &&
          worksheetPreviewSession?.generation &&
          !isWritingWorksheetPayload(worksheetPreviewSession.worksheetPayload)
            ? handlePreviewModalAnswerKey
            : undefined
        }
        refreshLoading={previewRefreshLoading}
        answerKeyLoading={previewAnswerKeyLoading}
        errorMessage={previewModalError}
        T={T}
      />
    </div>
  );
}
