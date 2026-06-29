#!/usr/bin/env node
/**
 * One-shot: science-master.js → history-master.js
 * Run: node scripts/build-history-master.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const src = join(root, "pages", "learning", "science-master.js");
const dest = join(root, "pages", "learning", "history-master.js");

let s = readFileSync(src, "utf8");

const replacements = [
  ['import { SCIENCE_QUESTIONS } from "../../data/science-questions";', 'import { HISTORY_QUESTIONS } from "../../data/history-questions/index.js";'],
  ['SCIENCE_GRADES,\n  SCIENCE_GRADE_ORDER,\n} from "../../data/science-curriculum";', 'HISTORY_GRADES,\n  HISTORY_GRADE_ORDER,\n  HISTORY_TOPIC_LABEL_HE,\n} from "../../data/history-curriculum";'],
  ['import { trackScienceTopicTime } from "../../utils/science-time-tracking";', 'import { trackHistoryTopicTime } from "../../utils/history-time-tracking";\nimport { isHistoryGradeAllowed } from "../../utils/history-curriculum-gates";'],
  ['resolve-science-book-page', 'resolve-history-book-page'],
  ['science-book-nav', 'history-book-nav'],
  ['SCIENCE_QUESTIONS', 'HISTORY_QUESTIONS'],
  ['SCIENCE_GRADES', 'HISTORY_GRADES'],
  ['SCIENCE_GRADE_ORDER', 'HISTORY_GRADE_ORDER'],
  ['SCIENCE_BOOK_GRADES', 'HISTORY_BOOK_GRADES'],
  ['SCIENCE_BOOK_GRADE_SET', 'HISTORY_BOOK_GRADE_SET'],
  ['SCIENCE_MISTAKES_KEY', 'HISTORY_MISTAKES_KEY'],
  ['SCIENCE_MISTAKES_MAX', 'HISTORY_MISTAKES_MAX'],
  ['SCIENCE_INTEL_KEY', 'HISTORY_INTEL_KEY'],
  ['mleo_science_', 'mleo_history_'],
  ['scienceLevelKeysForGradeKey', 'historyLevelKeysForGradeKey'],
  ['clampScienceLevelForGrade', 'clampHistoryLevelForGradeKey'],
  ['loadScienceMistakesFromStorage', 'loadHistoryMistakesFromStorage'],
  ['loadScienceIntel', 'loadHistoryIntel'],
  ['persistScienceIntel', 'persistHistoryIntel'],
  ['computeScienceProgressInsights', 'computeHistoryProgressInsights'],
  ['getErrorExplanationScience', 'getErrorExplanationHistory'],
  ['getSolutionStepsScience', 'getSolutionStepsHistory'],
  ['scienceIntelRef', 'historyIntelRef'],
  ['pendingScienceTrackMetaRef', 'pendingHistoryTrackMetaRef'],
  ['scienceHypothesisLedgerRef', 'historyHypothesisLedgerRef'],
  ['scienceTrackingTopicKeyRef', 'historyTrackingTopicKeyRef'],
  ['trackScienceTopicTime', 'trackHistoryTopicTime'],
  ['getScienceBookHref', 'getHistoryBookHref'],
  ['consumeAnyScienceBookLearningSnapshot', 'consumeAnyHistoryBookLearningSnapshot'],
  ['consumeAnyScienceBookPracticePreset', 'consumeAnyHistoryBookPracticePreset'],
  ['isScienceBookPracticeEntry', 'isHistoryBookPracticeEntry'],
  ['saveScienceBookLearningSnapshot', 'saveHistoryBookLearningSnapshot'],
  ['withScienceBookLearningReturn', 'withHistoryBookLearningReturn'],
  ['scienceTopicsForGuest', 'historyTopicsForGuest'],
  ['ScienceMaster', 'HistoryMaster'],
  ['science-master', 'history-master'],
  ['__SCIENCE_INTEL_DEBUG', '__HISTORY_INTEL_DEBUG'],
  ['"science"', '"history"'],
  ["'science'", "'history'"],
  ['science:', 'history:'],
  ['scienceIntel', 'historyIntel'],
  ['scienceHypothesis', 'historyHypothesis'],
  ['scienceTracking', 'historyTracking'],
  ['scienceLevel', 'historyLevel'],
  ['science-curriculum', 'history-curriculum'],
  ['science-questions', 'history-questions'],
  ['science-time-tracking', 'history-time-tracking'],
  ['science-book', 'history-book'],
  ['science_master', 'history_master'],
  ['רמת מדען', 'רמת חוקר'],
  ['מדעים', 'היסטוריה'],
];

for (const [from, to] of replacements) {
  s = s.split(from).join(to);
}

// G6-only level keys
s = s.replace(
  /function historyLevelKeysForGradeKey\(gradeKey\) \{[\s\S]*?return Object\.keys\(LEVELS\);\n\}/,
  `function historyLevelKeysForGradeKey(gradeKey) {
  return Object.keys(LEVELS);
}`
);

// Replace TOPICS block
s = s.replace(
  /const TOPICS = \{[\s\S]*?\};/,
  `const TOPICS = {
  what_is_history: { name: HISTORY_TOPIC_LABEL_HE.what_is_history, icon: "📜" },
  classical_greece: { name: HISTORY_TOPIC_LABEL_HE.classical_greece, icon: "🏛️" },
  hellenism_jews: { name: HISTORY_TOPIC_LABEL_HE.hellenism_jews, icon: "🌍" },
  hasmonaeans: { name: HISTORY_TOPIC_LABEL_HE.hasmonaeans, icon: "🕎" },
  rome_jews: { name: HISTORY_TOPIC_LABEL_HE.rome_jews, icon: "🏺" },
  mixed: { name: HISTORY_TOPIC_LABEL_HE.mixed, icon: "🎲" },
};`
);

s = s.replace(
  /const PRACTICE_FOCUS_OPTIONS = \[[\s\S]*?\};/,
  `const PRACTICE_FOCUS_OPTIONS = [
  { value: "balanced", label: "📚 כל הנושאים" },
  { value: "greece_hellenism", label: "🏛️ יוון והלניזם" },
  { value: "hasmonaeans_rome", label: "🕎 חשמונאים ורומא" },
];`
);

s = s.replace(
  /const PRACTICE_TOPIC_GROUPS = \{[\s\S]*?\};/,
  `const PRACTICE_TOPIC_GROUPS = {
  balanced: null,
  greece_hellenism: ["what_is_history", "classical_greece", "hellenism_jews"],
  hasmonaeans_rome: ["hasmonaeans", "rome_jews"],
};`
);

s = s.replace(
  /const REFERENCE_SECTIONS = \{[\s\S]*?\};/,
  `const REFERENCE_SECTIONS = {
  greece_hellenism: {
    label: "יוון והלניזם",
    entries: [
      { term: "דמוקרטיה", desc: "השתתפות אזרחים בהחלטות — אתונה." },
      { term: "פוליס", desc: "עיר-מדינה יוונית עצמאית." },
      { term: "הלניזם", desc: "התפשטות תרבות יוונית לאחר אלכסנדר." },
      { term: "מקור ראשוני", desc: "עדות ישירה מהתקופה הנחקרת." },
    ],
  },
  hasmonaeans_rome: {
    label: "חשמונאים ורומא",
    entries: [
      { term: "גזרות אנטיוכוס", desc: "לחץ על היהדות — זרז למרד." },
      { term: "חנukah", desc: "ניצחון המכבים וחידוש המקדש." },
      { term: "פרובינציה", desc: "יהודה תחת שלטון רומי." },
      { term: "יבנה", desc: "מרכז ללימוד לאחר החורban." },
    ],
  },
};`
);

s = s.replace(
  /topicsList = \[allowedTopicsForGrade\[0\] \|\| "body"\]/g,
  'topicsList = [allowedTopicsForGrade[0] || "what_is_history"]'
);
s = s.replace(
  /topicsList = \["body"\]/g,
  'topicsList = ["what_is_history"]'
);
s = s.replace(
  /useState\("body"\)/,
  'useState("what_is_history")'
);
s = s.replace(
  /useState\("life_science"\)/,
  'useState("greece_hellenism")'
);
s = s.replace(
  /what_is_history: \{ total: 0, correct: 0 \},/,
  ''
);
s = s.replace(
  /body: \{ total: 0, correct: 0 \},[\s\S]*?experiments: \{ total: 0, correct: 0 \},/,
  `what_is_history: { total: 0, correct: 0 },
    classical_greece: { total: 0, correct: 0 },
    hellenism_jews: { total: 0, correct: 0 },
    hasmonaeans: { total: 0, correct: 0 },
    rome_jews: { total: 0, correct: 0 },`
);

// Grade gate: inject after useRouter
const gateBlock = `
  const [gradeGateChecked, setGradeGateChecked] = useState(false);
  const [gradeAllowed, setGradeAllowed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    fetch("/api/student/me", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json().catch(() => ({})))
      .then((payload) => {
        const gradeLevel = payload?.student?.grade_level ?? null;
        const allowed = isHistoryGradeAllowed(gradeLevel);
        setGradeAllowed(allowed);
        setGradeGateChecked(true);
        if (!allowed) {
          router.replace("/student/home");
        }
      })
      .catch(() => {
        setGradeGateChecked(true);
      });
    return undefined;
  }, [router]);
`;

if (!s.includes("gradeGateChecked")) {
  s = s.replace(
    /const router = useRouter\(\);/,
    `const router = useRouter();${gateBlock}`
  );
}

// Early return UI when grade blocked
const gateReturn = `
  if (gradeGateChecked && !gradeAllowed) {
    return (
      <Layout studentShell="learning">
        <StudentLoadingPanel message="מעביר לדף הבית..." />
      </Layout>
    );
  }
`;

if (!s.includes("gradeGateChecked && !gradeAllowed")) {
  s = s.replace(
    /useIOSViewportFix\(\);/,
    `useIOSViewportFix();${gateReturn}`
  );
}

// Fix function name typo from replacement
s = s.replace(/clampHistoryLevelForGradeKey/g, "clampHistoryLevelForGrade");

writeFileSync(dest, s, "utf8");
console.log("Wrote", dest);
