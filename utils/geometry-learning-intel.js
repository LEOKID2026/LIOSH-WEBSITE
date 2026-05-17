// מעקב קל ללמידה בגאומטריה — localStorage בלבד

const STORAGE_KEY = "mleo_geometry_learning_intel";
const VERSION = 1;
const TAIL_MAX = 28;

export function loadGeometryIntel() {
  if (typeof window === "undefined") {
    return { topicStats: {}, recentTail: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { topicStats: {}, recentTail: [] };
    const data = JSON.parse(raw);
    if (data.v !== VERSION) return { topicStats: {}, recentTail: [] };
    return {
      topicStats: data.topicStats && typeof data.topicStats === "object" ? data.topicStats : {},
      recentTail: Array.isArray(data.recentTail)
        ? data.recentTail.slice(-TAIL_MAX)
        : [],
    };
  } catch {
    return { topicStats: {}, recentTail: [] };
  }
}

export function persistGeometryIntel(intel) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        v: VERSION,
        topicStats: intel.topicStats || {},
        recentTail: (intel.recentTail || []).slice(-TAIL_MAX),
      })
    );
  } catch {
    /* ignore quota */
  }
}

export function recordGeometryAnswerIntel(intel, topic, isCorrect) {
  const t = topic || "unknown";
  const prev = intel.topicStats[t] || { attempts: 0, wrong: 0 };
  const stats = {
    attempts: prev.attempts + 1,
    wrong: prev.wrong + (isCorrect ? 0 : 1),
  };
  const topicStats = { ...intel.topicStats, [t]: stats };
  const recentTail = [
    ...(intel.recentTail || []),
    { topic: t, ok: !!isCorrect, at: Date.now() },
  ].slice(-TAIL_MAX);
  return { topicStats, recentTail };
}

export function getGeometryTopicInsights(topicStats) {
  const entries = Object.entries(topicStats || {}).filter(
    ([, s]) => (s.attempts || 0) >= 2
  );
  if (entries.length === 0) {
    return { weakest: null, strongest: null };
  }
  const scored = entries.map(([topic, s]) => {
    const attempts = s.attempts || 0;
    const wrong = s.wrong || 0;
    return {
      topic,
      rate: attempts ? (attempts - wrong) / attempts : 0,
      attempts,
    };
  });
  scored.sort((a, b) => a.rate - b.rate);
  return {
    weakest: scored[0].topic,
    strongest: scored[scored.length - 1].topic,
  };
}

export function geometryQuestionFingerprint(q) {
  if (!q || q.params?.kind === "no_question") return "";
  const topic = q.topic ?? "";
  const kind = q.params?.kind ?? "";
  const patternFamily = q.params?.patternFamily ?? "";
  const conceptTag = q.params?.conceptTag ?? "";
  const subtype = q.params?.subtype ?? "";
  const ca = q.correctAnswer;
  const p = { ...(q.params || {}) };
  delete p.kind;
  const keys = Object.keys(p).sort();
  const paramSig = keys.map((k) => `${k}:${JSON.stringify(p[k])}`).join("|");
  return `${topic}|${kind}|${patternFamily}|${conceptTag}|${subtype}|${ca}|${paramSig}`;
}

/** מפתח נוסף נגד חזרה על אותה תבנית קונספטואלית */
export function geometryConceptLineageKey(q) {
  if (!q) return "";
  const topic = q.topic ?? "";
  const kind = q.params?.kind ?? "";
  const p = q.params || {};
  if (kind) {
    const dims = ["side", "length", "width", "side1", "side2", "side3", "radius", "base", "height"]
      .filter((k) => p[k] != null && p[k] !== "")
      .map((k) => `${k}:${p[k]}`)
      .join(",");
    return `${topic}|${kind}|${dims}`;
  }
  const pf = p.patternFamily ?? "";
  const ct = p.conceptTag ?? "";
  const st = p.subtype ?? "";
  return `${topic}|${pf}|${ct}|${st}`;
}

export function newGeometryMistakeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function buildGeometryQuestionSnapshot(q) {
  if (!q) return null;
  return {
    question: q.question,
    correctAnswer: q.correctAnswer,
    answers: Array.isArray(q.answers) ? [...q.answers] : [],
    topic: q.topic,
    shape: q.shape,
    params: q.params ? JSON.parse(JSON.stringify(q.params)) : {},
  };
}
