import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isChildHebrewNiqqudGradeKey, hebrewScriptLikely, stripHebrewNiqqudMarks, textAlreadyHasNiqqud } from "../../../utils/hebrew-dicta-nakdan";
import { attachHebrewAudioToQuestion } from "../../../utils/hebrew-audio-attach";
import { isLowerGradeG1G2Key } from "../../../utils/lower-grade-practice-runtime-quality";
import { validateAudioStem } from "../../../utils/audio-task-contract";
import HebrewAudioBuild1Panel from "../../../components/HebrewAudioBuild1Panel";
import EnglishPhonicsAudioPanel from "../../../components/EnglishPhonicsAudioPanel";
import { useRouter } from "next/router";
import Link from "next/link";
import Layout from "../../../components/Layout";
import {
  activityModeLabelHe,
  isClassroomActivitiesEnabled,
} from "../../../lib/classroom-activities/classroom-activities-labels.client.js";
import { formatStudentActivityCompletionSummaryHe } from "../../../lib/classroom-activities/student-activity-result-labels.client.js";
import { resolveStudentActivityApiErrorHe } from "../../../lib/classroom-activities/student-activity-error-labels.client.js";
import { resolveStudentActivityAnswerInputProps, assignedActivityUsesNumericKeyboard, resolveAssignedActivityMathScratchpadContext, assignedActivityUsesMathScratchpad, getStudentActivityQuestionFontStyle } from "../../../lib/classroom-activities/student-activity-question-ui.client.js";
import { assignedActivityQuestionUsesChoiceUi } from "../../../utils/geometry-activity-answer-ui.js";
import { getGeometryDiagramSpec } from "../../../utils/geometry-diagram-spec.js";
import GeometryExplanationDiagram from "../../../components/learning/geometry/GeometryExplanationDiagram";
import StudentNumericAnswerField, {
  useMobileEmbeddedNumericSubmit,
} from "../../../components/learning/StudentNumericAnswerField";
import VirtualAnswerKeyboard from "../../../components/learning/VirtualAnswerKeyboard.jsx";
import MathScratchpadSlot from "../../../components/math-scratchpad/MathScratchpadSlot";
import { ScratchpadVirtualInputProvider } from "../../../components/math-scratchpad/scratchpad-virtual-input";
import { renderMaybeStackedFractionOrMixed } from "../../../components/learning/MathFractionExpression.jsx";
import { useTouchPrimaryDevice } from "../../../hooks/useTouchPrimaryDevice.js";
import { resolveVirtualAnswerKeyboard } from "../../../lib/learning/virtual-answer-keyboard-policy.js";
import { activityChoiceGridClassName } from "../../../lib/classroom-activities/student-activity-choice-layout.client.js";
import { isTextualAssignedActivitySubject } from "../../../lib/classroom-activities/student-activity-textual-subjects.client.js";
import { resolveStudentActivityUi } from "../../../lib/student-ui/student-theme-resolver.client.js";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import { StudentActivityLayoutVariantProvider } from "../../../contexts/StudentActivityLayoutVariantContext.jsx";
import { computeAssignedActivityTiming, computeOpenLearningTiming } from "../../../lib/learning/timing-policy.js";
import {
  makeParentActivityVisitToken,
  postParentActivityLearningVisit,
  beaconParentActivityLearningVisit,
} from "../../../lib/learning-client/parentActivityLearningVisit.client.js";
import {
  createLearningTimeLease,
  createVisibleLeaseAccrual,
  rememberActiveLearningStudentId,
  resolveActiveLearningStudentId,
} from "../../../lib/learning-client/learning-time-lease.client.js";
import StudentAssignedActivityShell from "../../../components/student/StudentAssignedActivityShell";
import StudentAssignedActivityQuestionStage from "../../../components/student/StudentAssignedActivityQuestionStage";
import StudentActivitySubmitConfirmModal from "../../../components/student/StudentActivitySubmitConfirmModal";
import AssignedActivityBidiText from "../../../components/classroom-activities/AssignedActivityBidiText.jsx";
import { prepareAssignedActivityQuestionSetForStudentDisplay } from "../../../lib/classroom-activities/prepare-assigned-activity-questions-for-display.client.js";

function buildSavedAttemptsMap(attempts) {
  /** @type {Record<number, { questionIndex: number, selectedAnswer: string|null, isCorrect: boolean|null }>} */
  const map = {};
  for (const attempt of attempts || []) {
    if (!Number.isFinite(attempt?.questionIndex)) continue;
    map[attempt.questionIndex] = attempt;
  }
  return map;
}

function feedbackFromSavedAttempt(attempt, activity) {
  if (!attempt) return null;
  if (activity?.mode === "discussion") {
    return { type: "submitted", message: "התשובה נשלחה" };
  }
  return {
    type: attempt.isCorrect ? "correct" : "wrong",
    message: attempt.isCorrect ? "נכון!" : "לא נכון",
  };
}

function savedAnswerDisplayText(saved) {
  return saved?.selectedAnswer != null ? String(saved.selectedAnswer) : "";
}

export async function getServerSideProps(context) {
  if (process.env.NEXT_PUBLIC_ACTIVITIES_ENABLED === "false") {
    return { redirect: { destination: "/student/home", permanent: false } };
  }
  return { props: { activityId: String(context.params?.activityId || "") } };
}

export default function StudentActivityPage({ activityId }) {
  const router = useRouter();
  const { theme } = useStudentTheme();
  const [phase, setPhase] = useState("loading");
  const [activity, setActivity] = useState(null);
  const [questionSet, setQuestionSet] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answerInput, setAnswerInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(null);
  const [liveIdx, setLiveIdx] = useState(null);
  const [error, setError] = useState("");
  const [savedAttempts, setSavedAttempts] = useState({});
  const [activityScope, setActivityScope] = useState(null);
  const [leaseStudentId, setLeaseStudentId] = useState(() =>
    resolveActiveLearningStudentId()
  );

  // Phase 3: real per-question timing
  const questionStartTimeRef = useRef(null);
  /** One continuous learning visit per activity open — not per question / remount. */
  /** @type {import('react').MutableRefObject<{ token: string|null, startedAt: number|null, questionIndex: number|null, flushed: boolean }>} */
  const parentVisitRef = useRef({
    token: null,
    startedAt: null,
    questionIndex: null,
    flushed: false,
  });
  const flushParentVisitRef = useRef(async () => {});
  const learningLeaseRef = useRef(null);
  const leaseAccrualRef = useRef(null);
  const leaseHeartbeatRef = useRef(null);
  // explanationViewedRef: set true when post-answer explanation is shown (guided_practice/homework);
  // flows into the NEXT question's submit as explanationViewed=true
  const explanationViewedRef = useRef(false);
  const scratchpadOverlayTopRef = useRef(null);
  const scratchpadOverlayWidthRef = useRef(null);
  const scratchpadDockAnchorRef = useRef(null);
  const [scratchpadOpen, setScratchpadOpen] = useState(false);
  const [activeScratchpadCell, setActiveScratchpadCell] = useState(null);
  const [verticalExerciseHeadline, setVerticalExerciseHeadline] = useState(null);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const isTouchDevice = useTouchPrimaryDevice();

  const startSession = useCallback(async () => {
    setPhase("loading");
    setError("");
    try {
      const res = await fetch(`/api/student/activities/${encodeURIComponent(activityId)}/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        router.replace("/student/login");
        return;
      }
      if (!res.ok || json?.ok !== true) {
        setError(
          resolveStudentActivityApiErrorHe(json, "לא ניתן להתחיל את הפעילות")
        );
        setPhase("error");
        return;
      }
      setActivity(json.activity);
      setActivityScope(json.scope === "parent" ? "parent" : json.scope || null);
      const sidFromStart = String(json.studentId || json.student?.id || "").trim();
      if (sidFromStart) {
        rememberActiveLearningStudentId(sidFromStart);
        setLeaseStudentId(sidFromStart);
      } else {
        void fetch("/api/student/me", { credentials: "include", headers: { Accept: "application/json" } })
          .then((r) => r.json().catch(() => ({})))
          .then((me) => {
            const sid = String(me?.student?.id || me?.studentId || "").trim();
            if (!sid) return;
            rememberActiveLearningStudentId(sid);
            setLeaseStudentId(sid);
          })
          .catch(() => {});
      }
      if (json.alreadyCompleted) {
        setFinished({
          scorePct: json.scorePct ?? null,
          correctCount: json.correctCount ?? 0,
          questionCount: json.activity?.questionCount ?? 0,
          studentStatus: json.studentStatus,
        });
        setPhase("done");
        return;
      }
      setQuestionSet(
        prepareAssignedActivityQuestionSetForStudentDisplay(json.questionSet || [])
      );
      const attemptMap = buildSavedAttemptsMap(json.attempts);
      setSavedAttempts(attemptMap);
      if (json.activity?.mode === "live_lesson") {
        setCurrentIdx(json.activity?.currentQuestionIdx ?? 0);
      } else {
        const resumeIdx =
          typeof json.resumeQuestionIndex === "number"
            ? json.resumeQuestionIndex
            : 0;
        setCurrentIdx(resumeIdx);
        const saved = attemptMap[resumeIdx];
        setAnswerInput(savedAnswerDisplayText(saved));
        setFeedback(feedbackFromSavedAttempt(saved, json.activity));
      }
      setPhase("ready");
    } catch {
      setError("שגיאת רשת");
      setPhase("error");
    }
  }, [activityId, router]);

  useEffect(() => {
    if (!isClassroomActivitiesEnabled()) {
      router.replace("/student/home");
      return;
    }
    void startSession();
  }, [startSession, router]);

  useEffect(() => {
    if (!activity || activity.mode !== "live_lesson") return undefined;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/student/activities/${encodeURIComponent(activityId)}/live-state`,
          { credentials: "include", cache: "no-store" }
        );
        const json = await res.json().catch(() => ({}));
        if (json?.ok && json.currentQuestionIdx != null) {
          setLiveIdx(json.currentQuestionIdx);
          setCurrentIdx(json.currentQuestionIdx);
        }
        if (json?.activityStatus === "paused") {
          setFeedback({ type: "wait", message: "המורה השהה את השיעור - המתינו" });
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [activity, activityId]);

  const effectiveIdx = useMemo(() => {
    if (activity?.mode === "live_lesson") {
      return liveIdx != null ? liveIdx : currentIdx;
    }
    return currentIdx;
  }, [activity, liveIdx, currentIdx]);

  const currentQuestion = questionSet[effectiveIdx];
  const currentSavedAttempt = savedAttempts[effectiveIdx] ?? null;

  const textualAssigned = isTextualAssignedActivitySubject(
    currentQuestion?.subject || activity?.subject
  );
  const { L, MB, isBright } = useMemo(
    () => resolveStudentActivityUi(theme, { textualAssigned }),
    [theme, textualAssigned]
  );

  // ניקוד א׳–ב׳ בפעילות הורה
  const [activityNiqqudMap, setActivityNiqqudMap] = useState({});
  const activityNiqqudCacheRef = useRef(new Map());

  // שמע א׳–ב׳ בפעילות הורה — audio stems מחושבים פעם אחת כשה-questionSet נטען
  const [activityAudioStems, setActivityAudioStems] = useState({});

  useEffect(() => {
    if (typeof window === "undefined" || !currentQuestion) {
      setActivityNiqqudMap({});
      return;
    }
    const gradeKey = String(currentQuestion.gradeLevel || "").toLowerCase();
    if (!isChildHebrewNiqqudGradeKey(gradeKey) || currentQuestion.subject !== "hebrew") {
      setActivityNiqqudMap({});
      return;
    }
    const cache = activityNiqqudCacheRef.current;
    const entries = [];
    const preMap = {};
    const addEntry = (id, text) => {
      const s = String(text ?? "").trim();
      if (!s || !hebrewScriptLikely(s)) return;
      if (textAlreadyHasNiqqud(s)) { preMap[id] = s; return; }
      const stripped = stripHebrewNiqqudMarks(s).trim();
      if (!stripped || !hebrewScriptLikely(stripped)) return;
      const cached = cache.get(stripped);
      if (cached) { preMap[id] = cached; return; }
      entries.push({ id, text: stripped });
    };
    addEntry("question", currentQuestion.question);
    if (Array.isArray(currentQuestion.choices)) {
      currentQuestion.choices.forEach((c, i) => addEntry(`choice_${i}`, c));
    }
    if (Object.keys(preMap).length > 0) setActivityNiqqudMap(preMap);
    if (entries.length === 0) return;
    const ac = new AbortController();
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/hebrew-nakdan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
          signal: ac.signal,
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const map = {};
        for (const e of data.entries || []) { if (e?.id) map[e.id] = e.text; }
        for (const { id, text } of entries) {
          if (map[id]) cache.set(text, map[id]);
        }
        if (!cancelled) setActivityNiqqudMap({ ...preMap, ...map });
      } catch (e) {
        if (e?.name !== "AbortError" && !cancelled) setActivityNiqqudMap(preMap);
      }
    }, 60);
    return () => { cancelled = true; clearTimeout(t); ac.abort(); };
  }, [currentQuestion]);

  // חישוב audio stems לשאלות עברית א׳–ב׳ בפעילות (חד-פעמי עם טעינת questionSet)
  useEffect(() => {
    if (!questionSet.length) { setActivityAudioStems({}); return; }
    const stems = {};
    let counter = 0;
    for (let i = 0; i < questionSet.length; i++) {
      const q = questionSet[i];
      if (!q) continue;
      const gradeKey = String(q.gradeLevel || "").toLowerCase();
      if (!isLowerGradeG1G2Key(gradeKey) || q.subject !== "hebrew") continue;
      const topic = String(q.topic || q.operation || "reading");
      const qCopy = { ...q, params: { ...(q.params || {}) } };
      attachHebrewAudioToQuestion(qCopy, { gradeKey, topic, sequenceIndex: counter++ });
      if (qCopy.params?.audioStem) stems[i] = qCopy.params.audioStem;
    }
    setActivityAudioStems(stems);
  }, [questionSet]);

  const isParentActivity = activityScope === "parent";

  const ensureParentVisit = useCallback(() => {
    if (!isParentActivity) return;
    const cur = parentVisitRef.current;
    if (cur.token && !cur.flushed && cur.startedAt != null) return;
    parentVisitRef.current = {
      token: makeParentActivityVisitToken(),
      startedAt: Date.now(),
      questionIndex: 0,
      flushed: false,
    };
    leaseAccrualRef.current?.reset(0);
  }, [isParentActivity]);

  const flushParentVisit = useCallback(
    async (opts = {}) => {
      if (!isParentActivity) return;
      const v = parentVisitRef.current;
      if (!v.token || v.flushed || v.startedAt == null) return;
      // Accrue only while this tab held the single-student lease and was visible.
      leaseAccrualRef.current?.tick();
      const accrued = Math.max(
        0,
        Math.floor(Number(leaseAccrualRef.current?.getAccruedMs?.() || 0))
      );
      // Visit covers non-question learning gap — no 10-minute activity cap.
      const timing = computeOpenLearningTiming(accrued);
      if (!timing.creditedTimeMs || timing.creditedTimeMs <= 0) {
        v.flushed = true;
        return;
      }
      v.flushed = true;
      const payload = {
        questionIndex: Number.isFinite(v.questionIndex) ? v.questionIndex : 0,
        clientVisitToken: v.token,
        rawDwellMs: timing.rawTimeSpentMs,
        creditedDwellMs: timing.creditedTimeMs,
        startedAtClient: v.startedAt,
        visitKind: opts.visitKind === "answer" ? "answer" : "learning",
      };
      if (opts.useBeacon) {
        beaconParentActivityLearningVisit(activityId, payload);
        return;
      }
      await postParentActivityLearningVisit(activityId, payload);
    },
    [activityId, isParentActivity]
  );

  flushParentVisitRef.current = flushParentVisit;

  const goToQuestionIdx = useCallback((nextIdx) => {
    setCurrentIdx(nextIdx);
  }, []);

  // Single browser lease: only the focused visible tab accrues learning time.
  useEffect(() => {
    if (!isParentActivity || phase !== "ready") return undefined;
    const studentId = resolveActiveLearningStudentId(leaseStudentId) || "active-learner";
    const ownerId = `parent-activity:${activityId}:${makeParentActivityVisitToken()}`;
    const lease = createLearningTimeLease({
      studentId,
      ownerId,
      source: `parent-activity:${activityId}`,
    });
    const accrual = createVisibleLeaseAccrual(lease, { maxSliceMs: 60_000 });
    learningLeaseRef.current = lease;
    leaseAccrualRef.current = accrual;
    lease.claim();
    const heart = setInterval(() => {
      lease.heartbeat();
      accrual.tick();
    }, 2000);
    leaseHeartbeatRef.current = heart;
    return () => {
      clearInterval(heart);
      lease.dispose();
      learningLeaseRef.current = null;
      leaseAccrualRef.current = null;
    };
  }, [activityId, isParentActivity, phase, leaseStudentId]);

  // Start one continuous visit when the activity becomes ready; flush only on leave/unmount.
  useEffect(() => {
    if (!isParentActivity || phase !== "ready") return undefined;
    ensureParentVisit();
    return () => {
      void flushParentVisitRef.current();
    };
  }, [activityId, isParentActivity, phase, ensureParentVisit]);

  useEffect(() => {
    if (!isParentActivity || phase !== "ready") return undefined;
    const onPageHide = () => {
      void flushParentVisitRef.current({ useBeacon: true });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [isParentActivity, phase, activityId]);

  const isCurrentQuestionAnswered = Boolean(currentSavedAttempt);
  const answeredQuestionCount = useMemo(
    () =>
      questionSet.reduce(
        (count, _question, idx) => (savedAttempts[idx] ? count + 1 : count),
        0
      ),
    [questionSet, savedAttempts]
  );

  // שאלה לתצוגה: מחיל ניקוד א׳–ב׳ כשיש
  const displayQuestion = useMemo(() => {
    if (!currentQuestion || Object.keys(activityNiqqudMap).length === 0) return currentQuestion;
    const nq = (id, fallback) =>
      Object.prototype.hasOwnProperty.call(activityNiqqudMap, id) ? activityNiqqudMap[id] : fallback;
    const vocChoices = Array.isArray(currentQuestion.choices)
      ? currentQuestion.choices.map((c, i) => nq(`choice_${i}`, c))
      : currentQuestion.choices;
    return {
      ...currentQuestion,
      question: nq("question", currentQuestion.question),
      choices: vocChoices,
    };
  }, [currentQuestion, activityNiqqudMap]);

  // audio stem לשאלה הנוכחית (א׳–ב׳ עברית בלבד)
  const currentActivityAudioStem = activityAudioStems[effectiveIdx] ?? null;
  const showActivityAudio =
    Boolean(currentActivityAudioStem) && validateAudioStem(currentActivityAudioStem);

  // שמע vocabulary אנגלית G1/G2 — stem כבר בנוי בגנרטור ונשמר ב-params
  const currentEnglishVocabAudioStem =
    currentQuestion?.subject === "english" &&
    currentQuestion?.topic === "vocabulary" &&
    isLowerGradeG1G2Key(String(currentQuestion?.gradeLevel || "").toLowerCase()) &&
    currentQuestion?.params?.audioStem
      ? currentQuestion.params.audioStem
      : null;
  const showEnglishVocabAudio =
    Boolean(currentEnglishVocabAudioStem) &&
    validateAudioStem(currentEnglishVocabAudioStem);

  useEffect(() => {
    if (activity?.mode === "live_lesson") return;
    const saved = savedAttempts[effectiveIdx];
    setAnswerInput(savedAnswerDisplayText(saved));
    setFeedback(feedbackFromSavedAttempt(saved, activity));
  }, [effectiveIdx, savedAttempts, activity]);

  // Phase 3: start question timer when question changes; reset explanationViewed
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    explanationViewedRef.current = false;
    leaseAccrualRef.current?.signalActivity?.();
    setScratchpadOpen(false);
    setActiveScratchpadCell(null);
    setVerticalExerciseHeadline(null);
    setShowDiagramModal(false);
  }, [effectiveIdx]);

  const usesMathScratchpad = assignedActivityUsesMathScratchpad(
    currentQuestion,
    activity
  );
  const scratchpadCtx = useMemo(
    () =>
      usesMathScratchpad
        ? resolveAssignedActivityMathScratchpadContext(currentQuestion, activity)
        : null,
    [usesMathScratchpad, currentQuestion, activity]
  );

  /** שרטוט בזמן השאלה — גאומטריה בלבד, לא חושף correctAnswer */
  const questionDiagramSpec = useMemo(() => {
    if (currentQuestion?.subject !== "geometry") return null;
    return getGeometryDiagramSpec(currentQuestion, { hideUnknownValues: true });
  }, [currentQuestion]);
  const mathVkPolicy = resolveVirtualAnswerKeyboard({
    subject: "math",
    hasTextInput: true,
    isTouch: isTouchDevice,
  });
  const usesScratchpadDock = Boolean(usesMathScratchpad && scratchpadCtx);
  /** Geometry uses the same bottom answer dock as math-with-scratchpad (layout only; no scratchpad). */
  const geometryExplanationOnly =
    activity?.mode === "discussion" && activity?.answerRequired === false;
  const usesGeometryAnswerDock =
    currentQuestion?.subject === "geometry" && !geometryExplanationOnly;
  const usesAnswerDock = Boolean(usesScratchpadDock || usesGeometryAnswerDock);
  const sharedScratchpadKeyboard =
    usesAnswerDock && mathVkPolicy.enabled && isTouchDevice;

  const handleScratchpadOpenChange = useCallback((open) => {
    setScratchpadOpen(open);
    if (!open) setActiveScratchpadCell(null);
  }, []);

  const expandGeometryDiagram = useCallback(() => {
    setShowDiagramModal(true);
  }, []);

  const answerInputProps = useMemo(
    () => resolveStudentActivityAnswerInputProps(currentQuestion),
    [currentQuestion]
  );

  const numericKeyboardSubject =
    currentQuestion?.subject === "geometry" ? "geometry" : "math";
  const usesNumericKeyboard = assignedActivityUsesNumericKeyboard(currentQuestion);
  const mobileEmbeddedNumericSubmit =
    useMobileEmbeddedNumericSubmit(numericKeyboardSubject) && usesNumericKeyboard;

  const advanceToNextQuestion = useCallback(() => {
    if (effectiveIdx < questionSet.length - 1) {
      void goToQuestionIdx(effectiveIdx + 1);
    }
  }, [effectiveIdx, questionSet.length, goToQuestionIdx]);

  const submitAnswer = async () => {
    if (!currentQuestion || busy || isCurrentQuestionAnswered) return;
    setBusy(true);
    setFeedback(null);
    try {
      if (isParentActivity) {
        // Keep the continuous activity visit open across answers; only stamp kind for telemetry.
        // Do not flush here — question change / remount must not mint a new 10-minute unit.
      }
      // Phase 3: per-question timing — max 10 minutes for THIS question only
      const rawMs =
        questionStartTimeRef.current != null
          ? Math.max(0, Date.now() - questionStartTimeRef.current)
          : 0;
      const { rawTimeSpentMs, creditedTimeMs, timingStatus } =
        computeAssignedActivityTiming(rawMs);
      leaseAccrualRef.current?.signalActivity?.();
      // Capture whether the student saw an explanation from the previous question
      const explanationViewedNow = explanationViewedRef.current;
      // Reset for the upcoming question (will be overwritten by effectiveIdx useEffect on advance)
      explanationViewedRef.current = false;

      const res = await fetch(`/api/student/activities/${encodeURIComponent(activityId)}/answer`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex: effectiveIdx,
          selectedAnswer: answerInput,
          rawTimeSpentMs,
          creditedTimeMs,
          timingStatus,
          hintsUsed: 0, // no hint UI in assigned activities
          explanationViewed: explanationViewedNow,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setFeedback({
          type: "error",
          message: resolveStudentActivityApiErrorHe(json, "שמירת תשובה נכשלה"),
        });
        return;
      }
      const isDiscussion = activity?.mode === "discussion";
      const showExplanation =
        !isDiscussion &&
        (activity?.mode === "guided_practice" || activity?.mode === "homework");
      let explanationText;
      if (isDiscussion) {
        setFeedback({
          type: "submitted",
          message: "התשובה נשלחה",
        });
      } else {
        explanationText = showExplanation ? json.explanation : undefined;
        // Phase 3: mark that an explanation was shown; next question submit will carry explanationViewed=true
        if (explanationText) explanationViewedRef.current = true;
        setFeedback({
          type: json.isCorrect ? "correct" : "wrong",
          message: json.isCorrect ? "נכון!" : "לא נכון",
          explanation: explanationText,
        });
      }
      setSavedAttempts((prev) => ({
        ...prev,
        [effectiveIdx]: {
          questionIndex: effectiveIdx,
          selectedAnswer: answerInput,
          isCorrect: json.isCorrect ?? null,
        },
      }));
      setScratchpadOpen(false);
      if (activity?.mode !== "live_lesson" && effectiveIdx < questionSet.length - 1) {
        setTimeout(() => {
          void goToQuestionIdx(effectiveIdx + 1);
        }, explanationText ? 1500 : 600);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitActivity = async () => {
    setBusy(true);
    try {
      if (isParentActivity) {
        await flushParentVisit();
      }
      const res = await fetch(`/api/student/activities/${encodeURIComponent(activityId)}/submit`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json().catch(() => ({}));
      if (json?.ok) {
        setSubmitConfirmOpen(false);
        setFinished({
          scorePct: json.scorePct,
          correctCount: json.correctCount,
          questionCount: json.questionCount,
        });
        setPhase("done");
        return true;
      }
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openSubmitConfirm = () => {
    if (!busy) setSubmitConfirmOpen(true);
  };

  const handleConfirmSubmitActivity = () => {
    void submitActivity();
  };

  const layoutProps = { studentTheme: theme, studentShell: "learning" };

  if (phase === "loading") {
    return (
      <Layout {...layoutProps}>
        <div className={`min-h-[60vh] ${L.pageWrap}`} aria-busy="true" />
      </Layout>
    );
  }

  if (phase === "error") {
    return (
      <Layout {...layoutProps}>
        <div className="max-w-lg mx-auto px-4 py-12 text-center" dir="rtl">
          <p className={`${L.errorText} mb-4`}>{error}</p>
          <Link href="/student/home" className={L.errorLink}>
            חזרה לבית
          </Link>
        </div>
      </Layout>
    );
  }

  if (phase === "done" && finished) {
    const isDiscussionDone = activity?.mode === "discussion";
    const isExplanationOnly =
      isDiscussionDone && activity?.answerRequired === false;
    const multiQuestionDiscussion =
      isDiscussionDone && !isExplanationOnly && (finished.questionCount ?? questionSet.length) > 1;
    return (
      <Layout {...layoutProps}>
        <div className="max-w-lg mx-auto px-4 py-12 text-center" dir="rtl">
          <h1 className={`${L.doneTitle} mb-4`}>
            {isExplanationOnly
              ? "קראת את ההסבר"
              : isDiscussionDone
                ? multiQuestionDiscussion
                  ? "סיימת את הדיון"
                  : "התשובה נשלחה"
                : "סיימת את הפעילות!"}
          </h1>
          {!isDiscussionDone ? (
            <p className={`${L.doneScore} mb-6`}>
              {formatStudentActivityCompletionSummaryHe(
                finished.correctCount,
                finished.questionCount
              )}
            </p>
          ) : isExplanationOnly ? (
            <p className={`${L.doneBody} mb-6`}>קראת את ההסבר של המורה. תודה!</p>
          ) : multiQuestionDiscussion ? (
            <p className={`${L.doneBody} mb-6`}>
              סיימת {finished.questionCount ?? questionSet.length} שאלות דיון. תודה על המענה!
            </p>
          ) : (
            <p className={`${L.doneBody} mb-6`}>תודה על המענה. המורה יראה את התשובה בכיתה.</p>
          )}
          <Link href="/student/home" className={L.doneButton}>
            חזרה לבית
          </Link>
        </div>
      </Layout>
    );
  }

  const isDiscussion = activity?.mode === "discussion";
  const isAnswerRequired = activity?.answerRequired !== false;
  const isExplanationOnly = isDiscussion && !isAnswerRequired;
  const isQuiz = activity?.mode === "quiz";
  const progressPct =
    questionSet.length > 0 ? Math.round(((effectiveIdx + 1) / questionSet.length) * 100) : 0;
  const choiceGridClass = activityChoiceGridClassName(
    currentQuestion?.choices ?? currentQuestion?.answers ?? currentQuestion?.options,
    { textualAssigned }
  );

  const activitySubtitle = `${activityModeLabelHe(activity?.mode)} · שאלה ${effectiveIdx + 1} מתוך ${questionSet.length}`;

  const feedbackToneClass =
    feedback?.type === "correct"
      ? L.feedbackCorrect
      : feedback?.type === "submitted"
        ? L.feedbackSubmitted
        : feedback?.type === "error"
          ? L.feedbackError
          : L.feedbackWrong;

  const renderAnswerFeedback = () => (
    <>
      {feedback?.type === "wait" ? (
        <p className={L.waitText}>{feedback.message}</p>
      ) : null}
      {feedback && feedback.type !== "wait" ? (
        <div className={`${L.feedbackBox} ${feedbackToneClass}`}>
          <p>{renderMaybeStackedFractionOrMixed(feedback.message)}</p>
          {feedback.explanation ? (
            <p className="mt-1">
              {renderMaybeStackedFractionOrMixed(feedback.explanation)}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const renderSharedScratchpadKeyboard = () =>
    sharedScratchpadKeyboard ? (
      <VirtualAnswerKeyboard
        layout={mathVkPolicy.layout || "numeric"}
        value={activeScratchpadCell ? activeScratchpadCell.value : answerInput}
        onChange={(next) => {
          if (activeScratchpadCell) {
            activeScratchpadCell.onChange(String(next ?? "").replace(/\D/g, "").slice(-1));
            return;
          }
          setAnswerInput(next);
        }}
        disabled={isCurrentQuestionAnswered || busy}
        compact={isTouchDevice}
        submitTone="blue"
        className={isBright ? MB.vkPad : usesAnswerDock ? "mt-0" : "mt-1"}
        keyClassName={isBright ? (isTouchDevice ? MB.vkKeyCompact : MB.vkKey) : undefined}
        actionKeyClassName={
          isBright
            ? isTouchDevice
              ? `${MB.vkKeyCompact} text-sm`
              : MB.vkKey
            : undefined
        }
        clearKeyClassName={
          isBright
            ? isTouchDevice
              ? MB.vkClearKeyCompact
              : `${MB.vkKey} border-red-500 bg-red-600 text-white hover:bg-red-500 hover:border-red-500`
            : undefined
        }
        submitClassName={isBright ? MB.vkSubmitBlue : undefined}
        submitButton={
          mobileEmbeddedNumericSubmit
            ? {
                label: isCurrentQuestionAnswered ? "התשובה נשמרה" : "שליחת תשובה",
                onClick: () => {
                  if (!busy && !isCurrentQuestionAnswered && String(answerInput).trim() !== "") {
                    void submitAnswer();
                  }
                },
                disabled:
                  busy || String(answerInput).trim() === "" || isCurrentQuestionAnswered,
                testId: "activity-submit-answer",
              }
            : null
        }
      />
    ) : null;

  const renderDockScratchpadToggleButton = (className, testId = "math-scratchpad-open-dock") => {
    const openModifier =
      testId === "math-scratchpad-toggle-dock-desktop"
        ? L.scratchpadDockDesktopScratchpadButtonOpen
        : L.scratchpadDockScratchpadButtonOpen;
    const label = scratchpadOpen ? "סגור טיוטה" : "דף טיוטה";
    return (
      <button
        type="button"
        onClick={() => setScratchpadOpen((open) => !open)}
        className={`relative ${className}${scratchpadOpen ? ` ${openModifier}` : ""}`}
        data-testid={testId}
      >
        <span className="invisible select-none" aria-hidden="true">
          דף טיוטה
        </span>
        <span className="absolute inset-0 flex items-center justify-center overflow-hidden px-3">
          {label}
        </span>
      </button>
    );
  };

  const renderActivityFinishRow = (compact = false, { includeScratchpadToggle = false } = {}) =>
    activity?.mode !== "live_lesson" && !isExplanationOnly ? (
      compact ? (
        <div className={L.scratchpadDockFinishRow}>
          {showDockPrevQuestion ? (
            <button
              type="button"
              onClick={() => {
                goToQuestionIdx(Math.max(0, effectiveIdx - 1));
              }}
              className={L.scratchpadDockSecondaryButton}
            >
              שאלה קודמת
            </button>
          ) : null}
          {showDockNextQuestion ? (
            <button
              type="button"
              onClick={() => {
                goToQuestionIdx(Math.min(questionSet.length - 1, effectiveIdx + 1));
              }}
              className={L.scratchpadDockSecondaryButton}
            >
              שאלה הבאה
            </button>
          ) : null}
          {includeScratchpadToggle
            ? renderDockScratchpadToggleButton(
                L.scratchpadDockScratchpadButton,
                "math-scratchpad-toggle-dock-mobile"
              )
            : null}
          <button
            type="button"
            disabled={busy}
            onClick={openSubmitConfirm}
            className={L.scratchpadDockFinishButton}
          >
            סיום והגשה
          </button>
        </div>
      ) : (
        <>
          {showDockPrevQuestion ? (
            <button
              type="button"
              onClick={() => {
                goToQuestionIdx(Math.max(0, effectiveIdx - 1));
              }}
              className={L.footerButton}
            >
              שאלה קודמת
            </button>
          ) : null}
          {showDockNextQuestion ? (
            <button
              type="button"
              onClick={() => {
                goToQuestionIdx(Math.min(questionSet.length - 1, effectiveIdx + 1));
              }}
              className={L.footerButton}
            >
              שאלה הבאה
            </button>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={openSubmitConfirm}
            className={L.footerSubmit}
          >
            סיום והגשה
          </button>
        </>
      )
    ) : null;

  const renderActions = ({ includeInlineKeyboard = true, includePerQuestionSubmit = true } = {}) => (
    <>
      {isExplanationOnly ? (
        <>
          <p className={L.explanationBanner}>
            אין צורך להגיש תשובה - קרא/י את התוכן
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (effectiveIdx < questionSet.length - 1) {
                advanceToNextQuestion();
              } else {
                void submitActivity();
              }
            }}
            className={L.submitButton}
          >
            {effectiveIdx < questionSet.length - 1 ? "קראתי - המשך" : "סיימתי לקרוא"}
          </button>
        </>
      ) : assignedActivityQuestionUsesChoiceUi(currentQuestion) ? (
        <div className={L.answerWrap}>
          <div className={choiceGridClass} data-testid="activity-answer-choices">
            {(() => {
              const originalChoices =
                currentQuestion.choices ??
                currentQuestion.answers ??
                currentQuestion.options ??
                [];
              const displayChoices =
                displayQuestion?.choices ??
                displayQuestion?.answers ??
                originalChoices;
              return displayChoices.map((displayC, i) => {
                const originalC = originalChoices[i] ?? displayC;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={isCurrentQuestionAnswered || busy}
                    onClick={() => setAnswerInput(String(originalC))}
                    className={`${L.choiceButton} ${
                      answerInput === String(originalC)
                        ? L.choiceButtonSelected
                        : L.choiceButtonDefault
                    }`}
                  >
                    <AssignedActivityBidiText text={displayC} className="block w-full" />
                  </button>
                );
              });
            })()}
          </div>
        </div>
      ) : assignedActivityUsesNumericKeyboard(currentQuestion) ? (
        <>
          <div className={L.answerWrap}>
            <StudentNumericAnswerField
              subject={currentQuestion.subject === "geometry" ? "geometry" : "math"}
              value={answerInput}
              onChange={setAnswerInput}
              disabled={isCurrentQuestionAnswered || busy}
              testId={
                currentQuestion.subject === "geometry"
                  ? "activity-geometry-numeric-answer"
                  : "activity-math-numeric-answer"
              }
              placeholder="הקלידו תשובה"
              autoFocus={!scratchpadOpen || currentQuestion.subject !== "math"}
              suppressEmbeddedKeyboard={sharedScratchpadKeyboard}
              onInputFocus={() => setActiveScratchpadCell(null)}
              inputClassName={
                isBright ? (isTouchDevice ? MB.inputMobile : MB.inputDesktop) : undefined
              }
              embeddedKeyClassName={
                isBright && isTouchDevice ? MB.vkKeyCompact : undefined
              }
              embeddedActionKeyClassName={
                isBright && isTouchDevice ? `${MB.vkKeyCompact} text-sm` : undefined
              }
              embeddedClearKeyClassName={
                isBright && isTouchDevice ? MB.vkClearKeyCompact : undefined
              }
              embeddedSubmitBlueClassName={
                isBright && isTouchDevice ? MB.vkSubmitBlue : undefined
              }
              embeddedKeyboardClassName={isBright && isTouchDevice ? MB.vkPad : undefined}
              onEnterSubmit={() => {
                if (!busy && !isCurrentQuestionAnswered && String(answerInput).trim() !== "") {
                  void submitAnswer();
                }
              }}
              onSubmit={() => {
                if (!busy && !isCurrentQuestionAnswered && String(answerInput).trim() !== "") {
                  void submitAnswer();
                }
              }}
              submitDisabled={
                busy || String(answerInput).trim() === "" || isCurrentQuestionAnswered
              }
              submitTestId="activity-submit-answer"
              submitLabel={isCurrentQuestionAnswered ? "התשובה נשמרה" : "שליחת תשובה"}
            />
          </div>
          {includeInlineKeyboard && sharedScratchpadKeyboard
            ? renderSharedScratchpadKeyboard()
            : null}
        </>
      ) : (
        <div className={L.answerWrap}>
          <input
            className={L.textInput}
            value={answerInput}
            onChange={(e) => setAnswerInput(e.target.value)}
            placeholder="הקלידו תשובה"
            dir="auto"
            readOnly={isCurrentQuestionAnswered}
            disabled={isCurrentQuestionAnswered}
            {...answerInputProps}
          />
        </div>
      )}
      {renderAnswerFeedback()}
      {!isExplanationOnly && includePerQuestionSubmit && !mobileEmbeddedNumericSubmit ? (
        <button
          type="button"
          disabled={
            busy ||
            String(answerInput).trim() === "" ||
            isCurrentQuestionAnswered
          }
          onClick={submitAnswer}
          className={L.submitButton}
          data-testid="activity-submit-answer"
        >
          {isCurrentQuestionAnswered ? "התשובה נשמרה" : "שליחת תשובה"}
        </button>
      ) : null}
    </>
  );

  const showDockPrevQuestion =
    effectiveIdx > 0 && activity?.mode !== "live_lesson" && !isQuiz && !isDiscussion;
  const showDockNextQuestion =
    effectiveIdx < questionSet.length - 1 && !isQuiz && !isDiscussion;
  const showDockFinishActions = activity?.mode !== "live_lesson" && !isExplanationOnly;

  const renderDockPerQuestionSubmitButton = (className) =>
    !isExplanationOnly ? (
      <button
        type="button"
        disabled={
          busy || String(answerInput).trim() === "" || isCurrentQuestionAnswered
        }
        onClick={submitAnswer}
        className={className}
        data-testid="activity-submit-answer"
      >
        {isCurrentQuestionAnswered ? "התשובה נשמרה" : "שליחת תשובה"}
      </button>
    ) : null;

  const renderDesktopDockButtonRow = ({ includeScratchpadToggle = true } = {}) =>
    showDockFinishActions ? (
      <div
        className={`hidden md:flex ${L.scratchpadDockDesktopButtonRow}`}
        data-testid="activity-scratchpad-desktop-actions"
      >
        {showDockPrevQuestion ? (
          <button
            type="button"
            onClick={() => {
              goToQuestionIdx(Math.max(0, effectiveIdx - 1));
            }}
            className={L.scratchpadDockDesktopSecondaryButton}
          >
            שאלה קודמת
          </button>
        ) : null}
        {showDockNextQuestion ? (
          <button
            type="button"
            onClick={() => {
              goToQuestionIdx(Math.min(questionSet.length - 1, effectiveIdx + 1));
            }}
            className={L.scratchpadDockDesktopSecondaryButton}
          >
            שאלה הבאה
          </button>
        ) : null}
        {includeScratchpadToggle
          ? renderDockScratchpadToggleButton(
              L.scratchpadDockDesktopScratchpadButton,
              "math-scratchpad-toggle-dock-desktop"
            )
          : null}
        {renderDockPerQuestionSubmitButton(L.scratchpadDockDesktopSubmitButton)}
        <button
          type="button"
          disabled={busy}
          onClick={openSubmitConfirm}
          className={L.scratchpadDockDesktopFinishButton}
        >
          סיום והגשה
        </button>
      </div>
    ) : null;

  const renderAnswerDock = () => (
    <div className={L.scratchpadDockActionsPanel}>
      {renderActions({ includeInlineKeyboard: false, includePerQuestionSubmit: false })}

      <div className="flex flex-col gap-1 md:hidden">
        {!mobileEmbeddedNumericSubmit
          ? renderDockPerQuestionSubmitButton(L.submitButton)
          : null}
        {renderSharedScratchpadKeyboard()}
        {renderActivityFinishRow(true, {
          includeScratchpadToggle: usesScratchpadDock,
        })}
      </div>

      {renderDesktopDockButtonRow({ includeScratchpadToggle: usesScratchpadDock })}
    </div>
  );

  const assignedActivityShell = currentQuestion ? (
    <StudentAssignedActivityShell
          title={activity?.title || ""}
          subtitle={activitySubtitle}
          progressPct={progressPct}
          singleColumn={isExplanationOnly}
          overlayTopRef={usesMathScratchpad ? scratchpadOverlayTopRef : undefined}
          overlayWidthRef={usesMathScratchpad ? scratchpadOverlayWidthRef : undefined}
          visual={
            usesMathScratchpad && scratchpadCtx ? (
              <MathScratchpadSlot
                gradeKey={scratchpadCtx.gradeKey}
                operation={scratchpadCtx.operation}
                question={scratchpadCtx.question}
                questionKey={`${effectiveIdx}-${String(currentQuestion.qk || currentQuestion.question || "")}`}
                open={scratchpadOpen}
                onOpenChange={handleScratchpadOpenChange}
                hideInlineOpenButton
                preserveQuestionLayout
                overlayTopRef={scratchpadOverlayTopRef}
                overlayWidthRef={scratchpadOverlayWidthRef}
                answerAnchorRef={scratchpadDockAnchorRef}
                exerciseHeadlineOverride={verticalExerciseHeadline || undefined}
                getQuestionFontStyle={getStudentActivityQuestionFontStyle}
              >
                <StudentAssignedActivityQuestionStage
                  question={displayQuestion || currentQuestion}
                  questionIndex={effectiveIdx}
                  hideLayoutToggle={scratchpadOpen}
                  onVerticalExerciseHeadlineChange={setVerticalExerciseHeadline}
                  onExpandDiagram={expandGeometryDiagram}
                />
              </MathScratchpadSlot>
            ) : showActivityAudio ? (
              <div
                className="flex flex-col gap-0.5 w-full shrink-0"
                dir="rtl"
                data-testid="activity-hebrew-audio-wrap"
              >
                <div className="flex justify-start leading-none">
                  <HebrewAudioBuild1Panel
                    stem={currentActivityAudioStem}
                    gameActive={!isCurrentQuestionAnswered}
                    grade={String(currentQuestion.gradeLevel || "").toLowerCase()}
                    topic={currentQuestion.topic || currentQuestion.operation || "reading"}
                    guidedMode={false}
                    onGuidedNeutralDone={() => {}}
                  />
                </div>
                <StudentAssignedActivityQuestionStage
                  question={displayQuestion || currentQuestion}
                  questionIndex={effectiveIdx}
                  onExpandDiagram={expandGeometryDiagram}
                />
              </div>
            ) : showEnglishVocabAudio ? (
              <div
                className="flex flex-col gap-0.5 w-full shrink-0"
                dir="rtl"
                data-testid="activity-english-audio-wrap"
              >
                <div className="flex justify-start leading-none">
                  <EnglishPhonicsAudioPanel
                    stem={currentEnglishVocabAudioStem}
                    gameActive={!isCurrentQuestionAnswered}
                    grade={String(currentQuestion.gradeLevel || "").toLowerCase()}
                    topic={currentQuestion.topic || "vocabulary"}
                  />
                </div>
                <StudentAssignedActivityQuestionStage
                  question={displayQuestion || currentQuestion}
                  questionIndex={effectiveIdx}
                  onExpandDiagram={expandGeometryDiagram}
                />
              </div>
            ) : (
              <StudentAssignedActivityQuestionStage
                question={displayQuestion || currentQuestion}
                questionIndex={effectiveIdx}
                onExpandDiagram={expandGeometryDiagram}
              />
            )
          }
      actions={
        usesAnswerDock
          ? null
          : textualAssigned
            ? (
              <>
                {renderActions({ includePerQuestionSubmit: false })}
                <div className="flex flex-col gap-2 md:hidden">
                  {renderDockPerQuestionSubmitButton(L.submitButton)}
                  {renderActivityFinishRow(true, { includeScratchpadToggle: false })}
                </div>
                {renderDesktopDockButtonRow({ includeScratchpadToggle: false })}
              </>
            )
            : renderActions()
      }
      usesScratchpadDock={usesAnswerDock}
      scratchpadDockAnchorRef={scratchpadDockAnchorRef}
      scratchpadDock={usesAnswerDock ? renderAnswerDock() : null}
      footer={usesAnswerDock || textualAssigned ? null : renderActivityFinishRow(false)}
    />
  ) : null;

  const wrapScratchpadVirtualInput = (node) =>
    usesScratchpadDock ? (
      <ScratchpadVirtualInputProvider onActiveCellChange={setActiveScratchpadCell}>
        {node}
      </ScratchpadVirtualInputProvider>
    ) : (
      node
    );

  return (
    <StudentActivityLayoutVariantProvider textualAssigned={textualAssigned}>
      <Layout {...layoutProps}>
        {activity?.mode === "live_lesson" && activity?.activityStatus === "paused" ? (
          <div className={L.page} dir="rtl" lang="he">
            <p className={`${L.waitText} text-center py-4`}>ממתינים למורה…</p>
          </div>
        ) : assignedActivityShell ? (
          wrapScratchpadVirtualInput(assignedActivityShell)
        ) : (
          <div className={L.page} dir="rtl" lang="he" />
        )}
        {/* מודל הגדלת שרטוט */}
        {showDiagramModal && questionDiagramSpec && currentQuestion && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[186] p-4"
            onClick={() => setShowDiagramModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label="שרטוט מוגדל"
          >
            <div
              className="w-full max-w-lg bg-gradient-to-br from-[#080c16] to-[#0a0f1d] border-2 border-emerald-500/50 rounded-2xl p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-emerald-300 font-bold text-sm">שרטוט</span>
                <button
                  type="button"
                  onClick={() => setShowDiagramModal(false)}
                  className="text-slate-400 hover:text-white text-lg leading-none px-1"
                  aria-label="סגור שרטוט"
                >
                  ✕
                </button>
              </div>
              <div dir="ltr">
                <GeometryExplanationDiagram
                  spec={questionDiagramSpec}
                  question={currentQuestion}
                  emphasis="neutral"
                />
              </div>
            </div>
          </div>
        )}

        <StudentActivitySubmitConfirmModal
          open={submitConfirmOpen}
          busy={busy}
          activityTitle={activity?.title || ""}
          answeredCount={answeredQuestionCount}
          questionCount={questionSet.length}
          onCancel={() => {
            if (!busy) setSubmitConfirmOpen(false);
          }}
          onConfirm={handleConfirmSubmitActivity}
        />
      </Layout>
    </StudentActivityLayoutVariantProvider>
  );
}
