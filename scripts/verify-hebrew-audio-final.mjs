/**
 * מטריצת אימות משותפת + עברית + גבולות רגרסיה (ללא דפדפן).
 */
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contractPath = path.join(__dirname, "..", "utils", "audio-task-contract.js");
const scoringPath = path.join(__dirname, "..", "utils", "audio-scoring-policy.js");
const attachPath = path.join(__dirname, "..", "utils", "hebrew-audio-attach.js");
const enReadyPath = path.join(__dirname, "..", "utils", "english-ready-audio-placeholders.js");

const Contract = await import(pathToFileURL(contractPath));
const Scoring = await import(pathToFileURL(scoringPath));
const Attach = await import(pathToFileURL(attachPath));
const EnReady = await import(pathToFileURL(enReadyPath));

const {
  validateAudioStem,
  validateAudioStemV1,
  validateAudioStemV2,
  resolveScoreOrReviewRoute,
} = Contract;
const { assertNoUnsafeAutoScoreDrift, classifyAudioScoringTier } = Scoring;
const { attachHebrewAudioToQuestion } = Attach;

function fail(msg) {
  console.error("verify-hebrew-audio-final:", msg);
  process.exit(1);
}

const baseListenV2 = {
  schema_version: 2,
  audio_asset_id: "he.v2.listen",
  transcript: "טקסט",
  locale: "he-IL",
  task_mode: "phonological_discrimination_he",
  recording_required: false,
  playback_kind: "tts",
  stem_audio_url: null,
  tts_text: "שלום",
  max_replays: 4,
  max_duration_sec: 15,
  scoring_policy: "mcq_after_audio_auto",
  fallback_mode: "degraded_skip",
  review_route: "none",
};

if (!validateAudioStemV2(baseListenV2)) fail("phonological v2 invalid");

const readAloud = {
  ...baseListenV2,
  audio_asset_id: "he.v2.read",
  task_mode: "read_aloud_short_he",
  recording_required: true,
  scoring_policy: "guided_record_manual_review",
  review_route: "manual_pending",
  max_duration_sec: 18,
};
if (!validateAudioStemV2(readAloud)) fail("read_aloud v2 invalid");

const structured = {
  ...readAloud,
  audio_asset_id: "he.v2.struct",
  task_mode: "structured_spoken_response_he",
  scoring_policy: "borderline_transcript_assist",
  max_duration_sec: 20,
};
if (!validateAudioStemV2(structured)) fail("structured v2 invalid");

if (!validateAudioStem(baseListenV2) || !validateAudioStem(structured)) fail("validateAudioStem union");

const rListen = resolveScoreOrReviewRoute(baseListenV2);
if (!rListen.autoScore || rListen.manualReview) fail("MCQ must autoScore");

const rRec = resolveScoreOrReviewRoute(readAloud);
if (rRec.autoScore || !rRec.manualReview) fail("recording must manual");

const rBorder = resolveScoreOrReviewRoute(structured);
if (rBorder.autoScore || !rBorder.manualReview) fail("borderline must manual");

try {
  assertNoUnsafeAutoScoreDrift(baseListenV2);
  assertNoUnsafeAutoScoreDrift(readAloud);
  assertNoUnsafeAutoScoreDrift(structured);
} catch (e) {
  fail(String(e));
}

const badDrift = { ...readAloud, scoring_policy: "mcq_after_audio_auto" };
try {
  assertNoUnsafeAutoScoreDrift(badDrift);
  fail("expected drift throw");
} catch {
  /* ok */
}

const c1 = classifyAudioScoringTier(baseListenV2);
if (!c1.allowAutoScore) fail("phonological should allow auto tier");

const c2 = classifyAudioScoringTier(structured);
if (c2.allowAutoScore) fail("structured must not allow auto");

// Legacy v1 still accepted
const listenV1 = {
  schema_version: 1,
  audio_asset_id: "he.v1",
  transcript: "טקסט",
  locale: "he-IL",
  task_mode: "listen_and_choose",
  recording_required: false,
  playback_kind: "tts",
  stem_audio_url: null,
  tts_text: "שלום",
  max_replays: 4,
  max_duration_sec: 15,
  scoring_policy: "mcq_after_audio_auto",
  fallback_mode: "degraded_skip",
  review_route: "none",
};
if (!validateAudioStemV1(listenV1) || !validateAudioStem(listenV1)) fail("v1 legacy");

// Attach smoke: MCQ + recording paths
const qMcq = {
  exerciseText: "בחרו את המילה הנכונה",
  question: "בחרו את המילה הנכונה",
  answers: ["א", "ב"],
  correctAnswer: "א",
  answerMode: "mcq",
  topic: "reading",
};
const qListen = structuredClone(qMcq);
let attached = attachHebrewAudioToQuestion(qListen, {
  gradeKey: "g3",
  topic: "reading",
  sequenceIndex: 6,
});
if (!attached || !qListen.params?.audioStem) fail("expected attach at seq 6");
try {
  assertNoUnsafeAutoScoreDrift(qListen.params.audioStem);
} catch (e) {
  fail(String(e));
}

const qRec = structuredClone({ ...qMcq, topic: "reading" });
attached = attachHebrewAudioToQuestion(qRec, {
  gradeKey: "g4",
  topic: "reading",
  sequenceIndex: 7,
});
if (!attached || qRec.answerMode !== "hebrew_audio_recorded_manual") fail("read_aloud attach");

// Regression: typing question should not attach
const qType = structuredClone({ ...qMcq, answerMode: "typing" });
if (attachHebrewAudioToQuestion(qType, { gradeKey: "g2", topic: "reading", sequenceIndex: 5 }))
  fail("typing must skip");

// Topic outside audio scope
if (
  attachHebrewAudioToQuestion(structuredClone(qMcq), {
    gradeKey: "g2",
    topic: "unknown_topic",
    sequenceIndex: 5,
  })
)
  fail("unknown topic skip");

// English TTS audio is now active (phonics + vocabulary G1/G2); no longer guarded here.
if (EnReady.listEnglishPhonicsEvaluators().length !== 0) fail("English evaluators must be empty");

console.log("verify-hebrew-audio-final: OK");
