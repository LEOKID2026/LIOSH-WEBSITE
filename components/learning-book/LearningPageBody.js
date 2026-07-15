import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LearningMarkdown from "./LearningMarkdown";
import LearningBookAudioPlayer from "./LearningBookAudioPlayer";
import MixedHebrewMathText from "./MixedHebrewMathText";
import BookTopicCardTitle from "./BookTopicCardTitle";
import { getSectionDisplayTitle } from "../../lib/learning-book/section-display-labels";
import { useBookSectionSwipe } from "../../hooks/useBookSectionSwipe";
import { MATH_G1_BOOK_META } from "../../lib/learning-book/math-g1-registry";
import { MATH_G2_BOOK_META } from "../../lib/learning-book/math-g2-registry";
import { MATH_G3_BOOK_META } from "../../lib/learning-book/math-g3-registry";
import { MATH_G4_BOOK_META } from "../../lib/learning-book/math-g4-registry";
import { MATH_G5_BOOK_META } from "../../lib/learning-book/math-g5-registry";
import { MATH_G6_BOOK_META } from "../../lib/learning-book/math-g6-registry";
import {
  appendReturnQueryToHref,
  getMathG1BookReturnQuerySuffix,
  getMathG1PracticePath,
  saveMathG1BookPracticePreset,
} from "../../lib/learning-book/math-g1-book-nav";
import {
  getMathG2BookReturnQuerySuffix,
  getMathG2PracticePath,
  saveMathG2BookPracticePreset,
} from "../../lib/learning-book/math-g2-book-nav";
import {
  getMathG3BookReturnQuerySuffix,
  getMathG3PracticePath,
  saveMathG3BookPracticePreset,
} from "../../lib/learning-book/math-g3-book-nav";
import {
  getMathG4BookReturnQuerySuffix,
  getMathG4PracticePath,
  saveMathG4BookPracticePreset,
} from "../../lib/learning-book/math-g4-book-nav";
import {
  getMathG5BookReturnQuerySuffix,
  getMathG5PracticePath,
  saveMathG5BookPracticePreset,
} from "../../lib/learning-book/math-g5-book-nav";
import {
  getMathG6BookReturnQuerySuffix,
  getMathG6PracticePath,
  saveMathG6BookPracticePreset,
} from "../../lib/learning-book/math-g6-book-nav";
import { resolveMathG1PracticeTarget } from "../../lib/learning-book/resolve-math-g1-practice-target";
import { resolveMathG2PracticeTarget } from "../../lib/learning-book/resolve-math-g2-practice-target";
import { resolveMathG3PracticeTarget } from "../../lib/learning-book/resolve-math-g3-practice-target";
import { resolveMathG4PracticeTarget } from "../../lib/learning-book/resolve-math-g4-practice-target";
import { resolveMathG5PracticeTarget } from "../../lib/learning-book/resolve-math-g5-practice-target";
import { resolveMathG6PracticeTarget } from "../../lib/learning-book/resolve-math-g6-practice-target";
import { GEOMETRY_G1_BOOK_META } from "../../lib/learning-book/geometry-g1-registry";
import { GEOMETRY_G2_BOOK_META } from "../../lib/learning-book/geometry-g2-registry";
import { GEOMETRY_G3_BOOK_META } from "../../lib/learning-book/geometry-g3-registry";
import { GEOMETRY_G4_BOOK_META } from "../../lib/learning-book/geometry-g4-registry";
import { GEOMETRY_G5_BOOK_META } from "../../lib/learning-book/geometry-g5-registry";
import { GEOMETRY_G6_BOOK_META } from "../../lib/learning-book/geometry-g6-registry";
import {
  getGeometryBookReturnQuerySuffix,
  getGeometryBookPracticePath,
  saveGeometryBookPracticePreset,
} from "../../lib/learning-book/geometry-book-nav";
import { resolveGeometryPracticeTarget } from "../../lib/learning-book/geometry-book-practice-map";
import { SCIENCE_G1_BOOK_META } from "../../lib/learning-book/science-g1-registry";
import { SCIENCE_G2_BOOK_META } from "../../lib/learning-book/science-g2-registry";
import { SCIENCE_G3_BOOK_META } from "../../lib/learning-book/science-g3-registry";
import { SCIENCE_G4_BOOK_META } from "../../lib/learning-book/science-g4-registry";
import { SCIENCE_G5_BOOK_META } from "../../lib/learning-book/science-g5-registry";
import { SCIENCE_G6_BOOK_META } from "../../lib/learning-book/science-g6-registry";
import {
  getScienceBookReturnQuerySuffix,
  getScienceBookPracticePath,
  saveScienceBookPracticePreset,
} from "../../lib/learning-book/science-book-nav";
import { resolveSciencePracticeTarget } from "../../lib/learning-book/science-book-practice-map";
import { HEBREW_G1_BOOK_META } from "../../lib/learning-book/hebrew-g1-registry";
import { HEBREW_G2_BOOK_META } from "../../lib/learning-book/hebrew-g2-registry";
import { HEBREW_G3_BOOK_META } from "../../lib/learning-book/hebrew-g3-registry";
import { HEBREW_G4_BOOK_META } from "../../lib/learning-book/hebrew-g4-registry";
import { HEBREW_G5_BOOK_META } from "../../lib/learning-book/hebrew-g5-registry";
import { HEBREW_G6_BOOK_META } from "../../lib/learning-book/hebrew-g6-registry";
import {
  getHebrewBookReturnQuerySuffix,
  getHebrewBookPracticePath,
  saveHebrewBookPracticePreset,
} from "../../lib/learning-book/hebrew-book-nav";
import { resolveHebrewPracticeTarget } from "../../lib/learning-book/hebrew-book-practice-map";
import { ENGLISH_G1_BOOK_META } from "../../lib/learning-book/english-g1-registry";
import { ENGLISH_G2_BOOK_META } from "../../lib/learning-book/english-g2-registry";
import { ENGLISH_G3_BOOK_META } from "../../lib/learning-book/english-g3-registry";
import { ENGLISH_G4_BOOK_META } from "../../lib/learning-book/english-g4-registry";
import { ENGLISH_G5_BOOK_META } from "../../lib/learning-book/english-g5-registry";
import { ENGLISH_G6_BOOK_META } from "../../lib/learning-book/english-g6-registry";
import {
  getEnglishBookReturnQuerySuffix,
  getEnglishBookPracticePath,
  saveEnglishBookPracticePreset,
} from "../../lib/learning-book/english-book-nav";
import { resolveEnglishPracticeTarget } from "../../lib/learning-book/english-book-practice-map";
import { MOLEDET_G2_BOOK_META } from "../../lib/learning-book/moledet-g2-registry";
import { MOLEDET_G3_BOOK_META } from "../../lib/learning-book/moledet-g3-registry";
import { MOLEDET_G4_BOOK_META } from "../../lib/learning-book/moledet-g4-registry";
import { GEOGRAPHY_G5_BOOK_META } from "../../lib/learning-book/geography-g5-registry";
import { GEOGRAPHY_G6_BOOK_META } from "../../lib/learning-book/geography-g6-registry";
import {
  getMoledetGeographyBookReturnQuerySuffix,
  getMoledetGeographyBookPracticePath,
  saveMoledetGeographyBookPracticePreset,
} from "../../lib/learning-book/moledet-geography-book-nav";
import { resolveMoledetGeographyPracticeTarget } from "../../lib/learning-book/moledet-geography-book-practice-map";
import { HISTORY_G6_BOOK_META } from "../../lib/learning-book/history-g6-registry";
import {
  getHistoryBookReturnQuerySuffix,
  getHistoryBookPracticePath,
  saveHistoryBookPracticePreset,
} from "../../lib/learning-book/history-book-nav";
import { resolveHistoryPracticeTarget } from "../../lib/learning-book/history-book-practice-map";
import { createLearningBookNav } from "../../lib/learning-book/learning-book-nav";
import { getLearningBookClientMeta, getLearningBookMasterPath } from "../../lib/learning-book/learning-book-catalog-meta";
import { useBookGradeTheme } from "./BookGradeThemeContext";
import { saveLastBookContext } from "../../lib/learning-book/book-context-after-reading";
import { createBookReadingTracker } from "../../lib/learning-book/book-reading-tracker";

const G1_BOOK_UI = {
  bookMeta: MATH_G1_BOOK_META,
  getReturnQuerySuffix: getMathG1BookReturnQuerySuffix,
  resolvePracticeTarget: resolveMathG1PracticeTarget,
  getPracticePath: getMathG1PracticePath,
  savePracticePreset: saveMathG1BookPracticePreset,
};

const G2_BOOK_UI = {
  bookMeta: MATH_G2_BOOK_META,
  getReturnQuerySuffix: getMathG2BookReturnQuerySuffix,
  resolvePracticeTarget: resolveMathG2PracticeTarget,
  getPracticePath: getMathG2PracticePath,
  savePracticePreset: saveMathG2BookPracticePreset,
};

const G3_BOOK_UI = {
  bookMeta: MATH_G3_BOOK_META,
  getReturnQuerySuffix: getMathG3BookReturnQuerySuffix,
  resolvePracticeTarget: resolveMathG3PracticeTarget,
  getPracticePath: getMathG3PracticePath,
  savePracticePreset: saveMathG3BookPracticePreset,
};

const G4_BOOK_UI = {
  bookMeta: MATH_G4_BOOK_META,
  getReturnQuerySuffix: getMathG4BookReturnQuerySuffix,
  resolvePracticeTarget: resolveMathG4PracticeTarget,
  getPracticePath: getMathG4PracticePath,
  savePracticePreset: saveMathG4BookPracticePreset,
};

const G5_BOOK_UI = {
  bookMeta: MATH_G5_BOOK_META,
  getReturnQuerySuffix: getMathG5BookReturnQuerySuffix,
  resolvePracticeTarget: resolveMathG5PracticeTarget,
  getPracticePath: getMathG5PracticePath,
  savePracticePreset: saveMathG5BookPracticePreset,
};

const G6_BOOK_UI = {
  bookMeta: MATH_G6_BOOK_META,
  getReturnQuerySuffix: getMathG6BookReturnQuerySuffix,
  resolvePracticeTarget: resolveMathG6PracticeTarget,
  getPracticePath: getMathG6PracticePath,
  savePracticePreset: saveMathG6BookPracticePreset,
};

/** @param {string} grade @param {typeof GEOMETRY_G1_BOOK_META} bookMeta */
function makeGeometryBookUi(grade, bookMeta) {
  return {
    bookMeta,
    getReturnQuerySuffix: getGeometryBookReturnQuerySuffix,
    resolvePracticeTarget: (pageId) => resolveGeometryPracticeTarget(grade, pageId),
    getPracticePath: getGeometryBookPracticePath,
    savePracticePreset: (preset) => saveGeometryBookPracticePreset(grade, preset),
  };
}

const GEOMETRY_G1_BOOK_UI = makeGeometryBookUi("g1", GEOMETRY_G1_BOOK_META);
const GEOMETRY_G2_BOOK_UI = makeGeometryBookUi("g2", GEOMETRY_G2_BOOK_META);
const GEOMETRY_G3_BOOK_UI = makeGeometryBookUi("g3", GEOMETRY_G3_BOOK_META);
const GEOMETRY_G4_BOOK_UI = makeGeometryBookUi("g4", GEOMETRY_G4_BOOK_META);
const GEOMETRY_G5_BOOK_UI = makeGeometryBookUi("g5", GEOMETRY_G5_BOOK_META);
const GEOMETRY_G6_BOOK_UI = makeGeometryBookUi("g6", GEOMETRY_G6_BOOK_META);

/** @param {string} grade @param {typeof SCIENCE_G1_BOOK_META} bookMeta */
function makeScienceBookUi(grade, bookMeta) {
  return {
    bookMeta,
    getReturnQuerySuffix: getScienceBookReturnQuerySuffix,
    resolvePracticeTarget: (pageId) => resolveSciencePracticeTarget(grade, pageId),
    getPracticePath: getScienceBookPracticePath,
    savePracticePreset: (preset) => saveScienceBookPracticePreset(grade, preset),
  };
}

const SCIENCE_G1_BOOK_UI = makeScienceBookUi("g1", SCIENCE_G1_BOOK_META);
const SCIENCE_G2_BOOK_UI = makeScienceBookUi("g2", SCIENCE_G2_BOOK_META);
const SCIENCE_G3_BOOK_UI = makeScienceBookUi("g3", SCIENCE_G3_BOOK_META);
const SCIENCE_G4_BOOK_UI = makeScienceBookUi("g4", SCIENCE_G4_BOOK_META);
const SCIENCE_G5_BOOK_UI = makeScienceBookUi("g5", SCIENCE_G5_BOOK_META);
const SCIENCE_G6_BOOK_UI = makeScienceBookUi("g6", SCIENCE_G6_BOOK_META);

/** @param {string} grade @param {typeof HEBREW_G1_BOOK_META} bookMeta */
function makeHebrewBookUi(grade, bookMeta) {
  return {
    bookMeta,
    getReturnQuerySuffix: getHebrewBookReturnQuerySuffix,
    resolvePracticeTarget: (pageId) => resolveHebrewPracticeTarget(grade, pageId),
    getPracticePath: getHebrewBookPracticePath,
    savePracticePreset: (preset) => saveHebrewBookPracticePreset(grade, preset),
  };
}

const HEBREW_G1_BOOK_UI = makeHebrewBookUi("g1", HEBREW_G1_BOOK_META);
const HEBREW_G2_BOOK_UI = makeHebrewBookUi("g2", HEBREW_G2_BOOK_META);
const HEBREW_G3_BOOK_UI = makeHebrewBookUi("g3", HEBREW_G3_BOOK_META);
const HEBREW_G4_BOOK_UI = makeHebrewBookUi("g4", HEBREW_G4_BOOK_META);
const HEBREW_G5_BOOK_UI = makeHebrewBookUi("g5", HEBREW_G5_BOOK_META);
const HEBREW_G6_BOOK_UI = makeHebrewBookUi("g6", HEBREW_G6_BOOK_META);

/** @param {string} grade @param {typeof ENGLISH_G1_BOOK_META} bookMeta */
function makeEnglishBookUi(grade, bookMeta) {
  return {
    bookMeta,
    getReturnQuerySuffix: getEnglishBookReturnQuerySuffix,
    resolvePracticeTarget: (pageId) => resolveEnglishPracticeTarget(grade, pageId),
    getPracticePath: getEnglishBookPracticePath,
    savePracticePreset: (preset) => saveEnglishBookPracticePreset(grade, preset),
  };
}

const ENGLISH_G1_BOOK_UI = makeEnglishBookUi("g1", ENGLISH_G1_BOOK_META);
const ENGLISH_G2_BOOK_UI = makeEnglishBookUi("g2", ENGLISH_G2_BOOK_META);
const ENGLISH_G3_BOOK_UI = makeEnglishBookUi("g3", ENGLISH_G3_BOOK_META);
const ENGLISH_G4_BOOK_UI = makeEnglishBookUi("g4", ENGLISH_G4_BOOK_META);
const ENGLISH_G5_BOOK_UI = makeEnglishBookUi("g5", ENGLISH_G5_BOOK_META);
const ENGLISH_G6_BOOK_UI = makeEnglishBookUi("g6", ENGLISH_G6_BOOK_META);

/** @param {string} grade @param {typeof MOLEDET_G2_BOOK_META} bookMeta */
function makeMoledetGeographyBookUi(grade, bookMeta) {
  return {
    bookMeta,
    getReturnQuerySuffix: getMoledetGeographyBookReturnQuerySuffix,
    resolvePracticeTarget: (pageId) => resolveMoledetGeographyPracticeTarget(grade, pageId),
    getPracticePath: () => getMoledetGeographyBookPracticePath(grade),
    savePracticePreset: (preset) => saveMoledetGeographyBookPracticePreset(grade, preset),
  };
}

const MOLEDET_G2_BOOK_UI = makeMoledetGeographyBookUi("g2", MOLEDET_G2_BOOK_META);
const MOLEDET_G3_BOOK_UI = makeMoledetGeographyBookUi("g3", MOLEDET_G3_BOOK_META);
const MOLEDET_G4_BOOK_UI = makeMoledetGeographyBookUi("g4", MOLEDET_G4_BOOK_META);
const GEOGRAPHY_G5_BOOK_UI = makeMoledetGeographyBookUi("g5", GEOGRAPHY_G5_BOOK_META);
const GEOGRAPHY_G6_BOOK_UI = makeMoledetGeographyBookUi("g6", GEOGRAPHY_G6_BOOK_META);

/** @param {string} grade @param {typeof HISTORY_G6_BOOK_META} bookMeta */
function makeHistoryBookUi(grade, bookMeta) {
  return {
    bookMeta,
    getReturnQuerySuffix: getHistoryBookReturnQuerySuffix,
    resolvePracticeTarget: (pageId) => resolveHistoryPracticeTarget(grade, pageId),
    getPracticePath: getHistoryBookPracticePath,
    savePracticePreset: (preset) => saveHistoryBookPracticePreset(grade, preset),
  };
}

const HISTORY_G6_BOOK_UI = makeHistoryBookUi("g6", HISTORY_G6_BOOK_META);

export default function LearningPageBody({
  page,
  prevPageId = null,
  nextPageId = null,
  prevTitle = null,
  nextTitle = null,
  bookSubject = "math",
  bookGrade = "g1",
}) {
  const clientMeta = getLearningBookClientMeta(bookSubject, bookGrade);
  const bookNav = useMemo(
    () =>
      createLearningBookNav(
        bookSubject,
        bookGrade,
        getLearningBookMasterPath(bookSubject)
      ),
    [bookSubject, bookGrade]
  );

  const bookUi = useMemo(() => {
    if (bookSubject === "hebrew" && bookGrade === "g6") return HEBREW_G6_BOOK_UI;
    if (bookSubject === "hebrew" && bookGrade === "g5") return HEBREW_G5_BOOK_UI;
    if (bookSubject === "hebrew" && bookGrade === "g4") return HEBREW_G4_BOOK_UI;
    if (bookSubject === "hebrew" && bookGrade === "g3") return HEBREW_G3_BOOK_UI;
    if (bookSubject === "hebrew" && bookGrade === "g2") return HEBREW_G2_BOOK_UI;
    if (bookSubject === "hebrew" && bookGrade === "g1") return HEBREW_G1_BOOK_UI;
    if (bookSubject === "english" && bookGrade === "g6") return ENGLISH_G6_BOOK_UI;
    if (bookSubject === "english" && bookGrade === "g5") return ENGLISH_G5_BOOK_UI;
    if (bookSubject === "english" && bookGrade === "g4") return ENGLISH_G4_BOOK_UI;
    if (bookSubject === "english" && bookGrade === "g3") return ENGLISH_G3_BOOK_UI;
    if (bookSubject === "english" && bookGrade === "g2") return ENGLISH_G2_BOOK_UI;
    if (bookSubject === "english" && bookGrade === "g1") return ENGLISH_G1_BOOK_UI;
    if (bookSubject === "history" && bookGrade === "g6") return HISTORY_G6_BOOK_UI;
    if (bookSubject === "geography" && bookGrade === "g6") return GEOGRAPHY_G6_BOOK_UI;
    if (bookSubject === "geography" && bookGrade === "g5") return GEOGRAPHY_G5_BOOK_UI;
    if (bookSubject === "moledet" && bookGrade === "g4") return MOLEDET_G4_BOOK_UI;
    if (bookSubject === "moledet" && bookGrade === "g3") return MOLEDET_G3_BOOK_UI;
    if (bookSubject === "moledet" && bookGrade === "g2") return MOLEDET_G2_BOOK_UI;
    if (bookSubject === "science" && bookGrade === "g6") return SCIENCE_G6_BOOK_UI;
    if (bookSubject === "science" && bookGrade === "g5") return SCIENCE_G5_BOOK_UI;
    if (bookSubject === "science" && bookGrade === "g4") return SCIENCE_G4_BOOK_UI;
    if (bookSubject === "science" && bookGrade === "g3") return SCIENCE_G3_BOOK_UI;
    if (bookSubject === "science" && bookGrade === "g2") return SCIENCE_G2_BOOK_UI;
    if (bookSubject === "science" && bookGrade === "g1") return SCIENCE_G1_BOOK_UI;
    if (bookSubject === "geometry" && bookGrade === "g6") return GEOMETRY_G6_BOOK_UI;
    if (bookSubject === "geometry" && bookGrade === "g5") return GEOMETRY_G5_BOOK_UI;
    if (bookSubject === "geometry" && bookGrade === "g4") return GEOMETRY_G4_BOOK_UI;
    if (bookSubject === "geometry" && bookGrade === "g3") return GEOMETRY_G3_BOOK_UI;
    if (bookSubject === "geometry" && bookGrade === "g2") return GEOMETRY_G2_BOOK_UI;
    if (bookSubject === "geometry" && bookGrade === "g1") return GEOMETRY_G1_BOOK_UI;
    if (bookSubject === "math" && bookGrade === "g6") return G6_BOOK_UI;
    if (bookSubject === "math" && bookGrade === "g5") return G5_BOOK_UI;
    if (bookSubject === "math" && bookGrade === "g4") return G4_BOOK_UI;
    if (bookSubject === "math" && bookGrade === "g3") return G3_BOOK_UI;
    if (bookSubject === "math" && bookGrade === "g2") return G2_BOOK_UI;
    if (bookSubject === "math" && bookGrade === "g1") return G1_BOOK_UI;
    if (clientMeta) {
      return {
        bookMeta: clientMeta.meta,
        getReturnQuerySuffix: bookNav.getReturnQuerySuffix,
        resolvePracticeTarget: () => null,
        getPracticePath: () => null,
        savePracticePreset: () => {},
      };
    }
    return G1_BOOK_UI;
  }, [bookSubject, bookGrade, clientMeta, bookNav]);

  const { bookMeta, getReturnQuerySuffix, resolvePracticeTarget, getPracticePath, savePracticePreset } =
    bookUi;
  const { classes: theme } = useBookGradeTheme();
  const router = useRouter();
  const returnQuerySuffix = getReturnQuerySuffix(router.query);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(0);
  const trackerRef = useRef(null);
  const prevSectionIndexRef = useRef(0);

  useEffect(() => {
    setSectionIndex(0);
    setSlideDir(0);
    prevSectionIndexRef.current = 0;
  }, [page?.pageId]);

  useEffect(() => {
    if (!page?.pageId) return undefined;
    const tracker = createBookReadingTracker({
      subject: bookSubject,
      grade: bookGrade,
      pageId: page.pageId,
      batchId: page.batchId,
      sequenceIndex: page.sequenceIndex,
      entryPageId: page.pageId,
      returnFrom: router.query?.returnFrom ? String(router.query.returnFrom) : null,
    });
    trackerRef.current = tracker;
    tracker.onPageEnter(page.pageId, page.batchId, page.sequenceIndex);

    const handleRouteChange = () => {
      tracker.onPageLeave(true);
      tracker.endSession(true, page.pageId);
    };
    const handleBeforeUnload = () => {
      tracker.onPageLeave(true);
      tracker.endSession(true, page.pageId);
    };

    router.events?.on?.("routeChangeStart", handleRouteChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      router.events?.off?.("routeChangeStart", handleRouteChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      tracker.onPageLeave(true);
      tracker.dispose();
      trackerRef.current = null;
    };
  }, [page?.pageId, page?.batchId, page?.sequenceIndex, bookSubject, bookGrade, router.events, router.query?.returnFrom]);

  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) return;
    const prev = prevSectionIndexRef.current;
    if (prev !== sectionIndex) {
      tracker.onSectionChange(prev, sectionIndex);
      prevSectionIndexRef.current = sectionIndex;
    }
  }, [sectionIndex]);

  const goPrev = useCallback(() => {
    setSlideDir(-1);
    setSectionIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setSlideDir(1);
    setSectionIndex((i) => Math.min((page?.sections?.length ?? 1) - 1, i + 1));
  }, [page?.sections?.length]);

  const jumpToSection = useCallback((target) => {
    setSectionIndex((current) => {
      setSlideDir(target > current ? 1 : target < current ? -1 : 0);
      return target;
    });
  }, []);

  const swipeHandlers = useBookSectionSwipe({
    onPrev: goPrev,
    onNext: goNext,
    enabled: Boolean(page?.sections?.length),
  });

  const practiceTarget = useMemo(
    () => (page?.pageId ? resolvePracticeTarget(page.pageId) : null),
    [page?.pageId, resolvePracticeTarget]
  );
  const practicePath = practiceTarget ? getPracticePath() : null;
  const handlePracticeClick = useCallback(() => {
    if (practiceTarget) {
      savePracticePreset(practiceTarget);
    }
    if (page?.pageId) {
      saveLastBookContext({
        subject: bookSubject,
        grade: bookGrade,
        pageId: page.pageId,
      });
      trackerRef.current?.onCtaClick();
    }
  }, [practiceTarget, savePracticePreset, page?.pageId, bookSubject, bookGrade]);

  if (!page?.sections?.length) {
    return (
      <p className="text-center text-[color:var(--book-text-muted)]" dir="rtl">
        אין תוכן להצגה בדף זה.
      </p>
    );
  }

  const totalSections = page.sections.length;
  const section = page.sections[sectionIndex];
  const displayTitle = getSectionDisplayTitle(section.title);
  const pageNumber = sectionIndex + 1;
  const atFirst = sectionIndex <= 0;
  const atLast = sectionIndex >= totalSections - 1;
  const hasLessonNav = Boolean(prevPageId || nextPageId);
  const isFinalPracticeSection = atLast && section?.number === 7;
  const practiceCtaSubtext =
    bookSubject === "geometry"
      ? "נעבור לתרגול של הנושא הזה בגאומטריה"
      : bookSubject === "science"
        ? "נעבור לתרגול של הנושא הזה במדעים"
        : bookSubject === "hebrew"
          ? "נעבור לתרגול של הנושא הזה בעברית"
          : bookSubject === "english"
            ? "נעבור לתרגול של הנושא הזה באנגלית"
            : bookSubject === "moledet"
              ? "נעבור לתרגול של הנושא הזה במולדת"
              : bookSubject === "geography"
                ? "נעבור לתרגול של הנושא הזה בגאוגרפיה"
                : "נעבור לתרגול של הנושא הזה בחשבון";

  return (
    <>
      <style jsx global>{`
        @keyframes bookSectionIn {
          from {
            opacity: 0;
            transform: translateX(${slideDir >= 0 ? "12px" : "-12px"});
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .book-section-animate {
          animation: bookSectionIn 0.28s ease-out;
        }
        .book-dot-active {
          box-shadow: 0 0 10px var(--book-dot-glow);
        }
      `}</style>

      {/* Book page - swipe target; spacer clears fixed footer */}
      <div
        className={`mx-auto w-full max-w-3xl ${
          hasLessonNav ? "pb-[15.5rem] sm:pb-[13.5rem]" : "pb-[11.5rem] sm:pb-[10.5rem]"
        }`}
        dir="rtl"
        onTouchStart={swipeHandlers.onTouchStart}
        onTouchEnd={swipeHandlers.onTouchEnd}
      >
        <article
          key={sectionIndex}
          className={`book-section-animate rounded-3xl border px-5 py-6 sm:px-8 sm:py-8 ${theme.cardArticle}`}
          aria-live="polite"
        >
          <header className="mb-4 shrink-0 text-center">
            <div
              className="flex items-center justify-center gap-2"
              aria-hidden="true"
            >
              {page.sections.map((s, i) => (
                <button
                  key={s.number}
                  type="button"
                  onClick={() => jumpToSection(i)}
                  className={`h-2.5 rounded-full transition-all duration-300 ${
                    i === sectionIndex
                      ? `book-dot-active w-7 ${theme.dotActive}`
                      : "w-2.5 bg-[color:var(--book-divider)] hover:bg-[color:var(--book-accent-muted)]"
                  }`}
                  aria-label={`עמוד ${i + 1}`}
                />
              ))}
            </div>
            <h2 className={`mt-4 text-2xl font-bold sm:text-3xl ${theme.sectionHeading}`}>
              {displayTitle}
            </h2>
          </header>

          <LearningBookAudioPlayer
            subject={bookSubject}
            grade={bookGrade}
            pageId={page.pageId}
            sectionNumber={section.number}
            sectionIndex={sectionIndex}
          />

          <div
            data-book-scroll
            className="px-0.5 pb-2 text-lg leading-[1.85] sm:text-xl sm:leading-[1.9]"
          >
            <LearningMarkdown content={section.body} />
          </div>

          {isFinalPracticeSection && practicePath && practiceTarget ? (
            <div className="mt-6 pt-2 text-center">
              <Link
                href={practicePath}
                onClick={handlePracticeClick}
                className={`mx-auto block w-full max-w-md rounded-2xl border px-5 py-4 transition sm:inline-block sm:w-auto sm:min-w-[16rem] ${theme.practiceCta}`}
              >
                <span className="block text-lg font-bold sm:text-xl">בואו נתרגל עכשיו</span>
                <span className={`mt-1 block text-sm font-medium ${theme.practiceCtaSub}`}>
                  {practiceCtaSubtext}
                </span>
              </Link>
            </div>
          ) : null}
        </article>
      </div>

      {/* Bottom HUD - fixed, always visible */}
      <footer
        className={`fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--book-accent-border)] backdrop-blur-md ${theme.footerBg}`}
        dir="rtl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto max-w-4xl space-y-3 px-4 py-3 sm:py-4">
          <p className="text-center text-sm font-medium text-[color:var(--book-text-muted)]">
            עמוד {pageNumber} מתוך {totalSections}
          </p>

          <nav
            className="flex items-stretch gap-3"
            aria-label="ניווט בין עמודים בנושא"
          >
            <button
              type="button"
              disabled={atFirst}
              onClick={goPrev}
              className={`min-h-[48px] flex-1 rounded-2xl border px-4 py-3 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-100 ${theme.navPrevButton}`}
            >
              עמוד קודם
            </button>
            <button
              type="button"
              disabled={atLast}
              onClick={goNext}
              className={`min-h-[48px] flex-1 rounded-2xl border px-4 py-3 text-base font-bold transition disabled:cursor-not-allowed disabled:opacity-100 ${theme.navNextButton}`}
            >
              עמוד הבא
            </button>
          </nav>

          {hasLessonNav ? (
            <nav
              className="grid grid-cols-2 gap-2 border-t border-[color:var(--book-divider)] pt-3"
              aria-label="ניווט בין נושאים"
            >
              {prevPageId ? (
                <Link
                  href={appendReturnQueryToHref(
                    `${bookMeta.routeBase}/${prevPageId}`,
                    returnQuerySuffix
                  )}
                  className={`min-h-[52px] rounded-xl border px-3 py-2.5 text-right text-xs shadow-sm transition ${theme.topicPrevLink}`}
                >
                  <span className={`block text-[10px] ${theme.topicPrevLabel}`}>נושא קודם</span>
                  <BookTopicCardTitle text={prevTitle} />
                </Link>
              ) : (
                <div aria-hidden="true" />
              )}
              {nextPageId ? (
                <Link
                  href={appendReturnQueryToHref(
                    `${bookMeta.routeBase}/${nextPageId}`,
                    returnQuerySuffix
                  )}
                  className={`min-h-[52px] rounded-xl border px-3 py-2.5 text-right text-xs shadow-sm transition ${theme.topicNextLink}`}
                >
                  <span className={`block text-[10px] ${theme.topicNextLabel}`}>נושא הבא</span>
                  <BookTopicCardTitle text={nextTitle} />
                </Link>
              ) : (
                <div aria-hidden="true" />
              )}
            </nav>
          ) : null}
        </div>
      </footer>
    </>
  );
}
