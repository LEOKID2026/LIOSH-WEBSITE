/**
 * English question generation (extracted from english-master.js for reuse in classroom activities + tests).
 */
import { sanitizeQuestionForStudentDisplay } from "./student-question-stem-sanitizer.js";
import { mergeDiagnosticContractIntoParams } from "./diagnostic-question-contract.js";
import { attachCanonicalMetadataToEnglishQuestion } from "../lib/learning/english-canonical-metadata.js";
import { mcqCellValue } from "./mcq-option-cell.js";
import { ENGLISH_GRADES, ENGLISH_GRADE_ORDER } from "../data/english-curriculum.js";
import {
  WORD_LISTS,
  GRAMMAR_POOLS,
  SENTENCE_POOLS,
  TRANSLATION_POOLS,
  getRuntimeEligiblePhonicsPool,
  getPhonicsPracticeStimulus,
} from "../data/english-questions/index.js";
import {
  englishClassSplitBucket,
  englishPoolItemAllowedWithClassSplit,
  englishVocabListKeysForGrade,
  englishWritingModeAllowed,
  englishWritingSentenceAllowedForGrade,
} from "./grade-gating.js";
import {
  probeMatchesSession,
  selectQuestionWithProbe,
} from "./active-diagnostic-runtime/index.js";
import {
  parseEnglishTopicFromSkillId,
  parseEnglishWordListKeyFromSkillId,
  parseEnglishPoolKeyFromSkillId,
  parseEnglishPhonicsPageFromSkillId,
  englishWordListKeyFromPageId,
  englishPhonicsSkillIdFromBookPageRef,
} from "../lib/learning-book/english-book-practice-map.js";
import {
  attachEnglishPhonicsPracticeAudio,
  attachEnglishVocabPracticeAudio,
} from "./english-phonics-practice-audio.js";
import {
  isG1G2RuntimePracticeEligible,
  isLowerGradeG1G2Key,
} from "./lower-grade-practice-runtime-quality.js";
export const ENGLISH_LEVELS = {
  easy: { name: "קל", maxWords: 5, complexity: "basic" },
  medium: { name: "בינוני", maxWords: 10, complexity: "intermediate" },
  hard: { name: "קשה", maxWords: 15, complexity: "advanced" },
};

export const ENGLISH_TOPICS = {
  phonics: { name: "פוניקה", description: "Phonics foundation", icon: "🔤" },
  vocabulary: { name: "אוצר מילים", description: "Vocabulary practice", icon: "📚" },
  grammar: { name: "דקדוק", description: "Grammar focus", icon: "✏️" },
  translation: { name: "תרגום", description: "Sentence translation", icon: "🌐" },
  sentences: { name: "משפטים", description: "Sentence building", icon: "💬" },
  writing: { name: "כתיבה", description: "Free typing practice", icon: "✍️" },
  mixed: { name: "ערבוב", description: "Blend topics", icon: "🎲" },
};

const GRADES = ENGLISH_GRADES;

const GRADE_FACTORS = {
  g1: 0.5,
  g2: 0.7,
  g3: 1,
  g4: 1.1,
  g5: 1.3,
  g6: 1.5,
};




const WRITING_SENTENCES_BASIC = [
  { en: "Good morning", he: "בוקר טוב" },
  { en: "Good night", he: "לילה טוב" },
  { en: "I love my dog", he: "אני אוהב את הכלב שלי" },
  { en: "I am happy", he: "אני שמח" },
];

const WRITING_SENTENCES_ADVANCED = [
  { en: "I will visit my grandparents tomorrow", he: "אני אבקר את סבא וסבתא מחר" },
  { en: "We are going to start a science project", he: "אנחנו הולכים להתחיל פרויקט מדעים" },
  { en: "If it rains, we will stay at home", he: "אם ירד גשם, נישאר בבית" },
  { en: "I have already finished my homework", he: "כבר סיימתי את שיעורי הבית שלי" },
];

const WRITING_SENTENCES_MASTER = [
  { en: "We should protect the forest to keep animals safe", he: "אנחנו צריכים להגן על היער כדי לשמור על החיות" },
  { en: "By working together, we can solve difficult problems", he: "בעבודה משותפת נוכל לפתור בעיות קשות" },
  { en: "I have never forgotten the trip to the science park", he: "מעולם לא שכחתי את הטיול לפארק המדע" },
  { en: "If we recycle plastic, the beach stays beautiful", he: "אם נמחזר פלסטיק, החוף יישאר יפה" },
];

const DEFAULT_GRADE_PROFILE = {
  choiceCount: 4,
  translationPools: ["routines"],
  grammarPools: ["present_simple"],
  sentencePools: ["routine"],
  writingPools: ["word", "sentence_basic"],
  vocabDirections: ["en_to_he", "he_to_en"],
};

const GRADE_PROFILES = {
  g1: {
    ...DEFAULT_GRADE_PROFILE,
    choiceCount: 4,
    translationPools: ["classroom"],
    grammarPools: ["be_basic"],
    sentencePools: ["base"],
    writingPools: ["word"],
    vocabDirections: ["en_to_he", "en_to_he", "he_to_en"],
  },
  g2: {
    ...DEFAULT_GRADE_PROFILE,
    choiceCount: 4,
    translationPools: ["classroom", "routines", "phase_b_routines"],
    grammarPools: ["be_basic", "question_frames"],
    sentencePools: ["base", "routine"],
    writingPools: ["word", "sentence_basic"],
  },
  g3: {
    ...DEFAULT_GRADE_PROFILE,
    translationPools: ["routines", "hobbies", "phase_b_routines", "phase_b_hobbies"],
    grammarPools: ["present_simple", "question_frames"],
    sentencePools: ["routine", "descriptive", "assigned_sentence_mcq"],
    writingPools: ["word", "sentence_basic"],
  },
  g4: {
    ...DEFAULT_GRADE_PROFILE,
    translationPools: ["hobbies", "community", "phase_b_hobbies", "phase_b_community"],
    grammarPools: ["present_simple", "progressive", "quantifiers"],
    sentencePools: ["descriptive", "narrative", "assigned_sentence_mcq"],
    writingPools: ["word", "sentence_basic", "sentence_extended"],
  },
  g5: {
    ...DEFAULT_GRADE_PROFILE,
    translationPools: ["community", "technology", "phase_b_community", "phase_b_technology"],
    grammarPools: ["past_simple", "modals", "comparatives", "future_forms"],
    sentencePools: ["narrative", "advanced", "assigned_sentence_mcq"],
    writingPools: ["sentence_extended", "sentence_extended", "word"],
  },
  g6: {
    ...DEFAULT_GRADE_PROFILE,
    translationPools: ["technology", "global", "global_advanced", "phase_b_technology"],
    grammarPools: ["complex_tenses", "conditionals", "modals", "comparatives"],
    sentencePools: ["advanced", "assigned_sentence_mcq"],
    writingPools: ["sentence_extended", "sentence_master"],
    vocabDirections: ["he_to_en", "en_to_he", "he_to_en"],
  },
};

export function getLevelForGrade(levelKey, gradeKey) {
  const base = ENGLISH_LEVELS[levelKey] || ENGLISH_LEVELS.easy;
  const factor = GRADE_FACTORS[gradeKey] || 1;
  const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
  return {
    name: base.name,
    maxWords: clamp(Math.round(base.maxWords * factor), 3, 20),
    complexity: base.complexity,
  };
}

function shuffleAnswerList(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildMcqFromOptionPool(correctAnswer, optionPool, targetChoices) {
  const uniq = [
    ...new Set(
      (optionPool || [])
        .map((x) => String(mcqCellValue(x) ?? "").trim())
        .filter(Boolean)
    ),
  ];
  const ca = String(correctAnswer ?? "").trim();
  if (!uniq.includes(ca)) uniq.push(ca);
  const target = Math.max(4, Number(targetChoices) || 4);

  let guard = 0;
  while (uniq.length < target && guard < 80) {
    guard += 1;
    const grammarWrong = [
      "am",
      "is",
      "are",
      "was",
      "were",
      "do",
      "does",
      "did",
      "have",
      "has",
      "had",
      "can",
      "will",
      "would",
    ].find((w) => w !== ca && !uniq.includes(w));
    if (grammarWrong) {
      uniq.push(grammarWrong);
      continue;
    }
    const variants = [`${ca}s`, `${ca}ed`, `${ca}ing`, `will ${ca}`, `did ${ca}`];
    const next = variants.find((v) => v !== ca && !uniq.includes(v));
    if (next) {
      uniq.push(next);
      continue;
    }
    break;
  }

  if (uniq.length <= target) {
    return shuffleAnswerList(uniq.slice(0, target));
  }
  const wrongs = uniq.filter((x) => x !== ca);
  const pickWrongs = shuffleAnswerList(wrongs).slice(0, target - 1);
  return shuffleAnswerList([ca, ...pickWrongs]);
}

export function resolveEnglishQType({
  selectedTopic,
  levelKey,
  gradeKey,
  question,
  correctAnswer,
  params,
}) {
  const isHardLevel = levelKey === "hard";
  const isMediumUp = levelKey === "medium" || isHardLevel;
  const gNum = parseInt(String(gradeKey).replace(/\D/g, ""), 10) || 3;
  const wordCount = String(correctAnswer || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (selectedTopic === "writing") return "typing";

  if (selectedTopic === "phonics") return "choice";

  if (selectedTopic === "vocabulary") {
    if (params?.direction === "en_to_he") return "choice";
    if (gNum <= 2 && levelKey === "easy") return "choice";
    if (wordCount >= 3) return "choice";
    if (isHardLevel || gNum >= 4) return "typing";
    if (isMediumUp && gNum >= 3) return "typing";
    return "choice";
  }

  if (selectedTopic === "translation") {
    if (params?.direction === "en_to_he") return "choice";
    if (wordCount > 6) return "choice";
    if (isHardLevel || gNum >= 5) return "typing";
    if (isMediumUp && gNum >= 4 && wordCount <= 4) return "typing";
    return "choice";
  }

  if (selectedTopic === "grammar") {
    const pl = String(question || "").toLowerCase();
    const fillLike =
      pl.includes("complete") ||
      pl.includes("fill") ||
      pl.includes("השלם") ||
      pl.includes("__") ||
      (pl.includes("choose") && (pl.includes("___") || pl.includes("__")));
    if (!fillLike) return "choice";
    if (wordCount > 3) return "choice";
    if (isHardLevel || (isMediumUp && gNum >= 4)) return "typing";
    return "choice";
  }

  if (selectedTopic === "sentences") {
    if (wordCount > 3) return "choice";
    if ((isMediumUp && gNum >= 3) || isHardLevel) return "typing";
    return "choice";
  }

  return "choice";
}

export function englishGrammarRowKey(row) {
  return `${String(row.question)}|${String(row.correct)}`;
}

export function englishGrammarRowKeyFromQuestion(q) {
  return `${String(q.question)}|${String(q.correctAnswer)}`;
}

export function generateQuestion(
  level,
  topic,
  gradeKey,
  mixedOps = null,
  levelKey = "easy",
  probeOpts = null
) {
  const isMixed = topic === "mixed";
  let selectedTopic;

  if (isMixed) {
    let availableTopics;
    if (mixedOps) {
      availableTopics = Object.entries(mixedOps)
        .filter(([t, selected]) => selected && t !== "mixed")
        .map(([t]) => t);
    } else {
      availableTopics = GRADES[gradeKey].topics.filter((t) => t !== "mixed");
    }
    if (availableTopics.length === 0) {
      availableTopics = GRADES[gradeKey].topics.filter((t) => t !== "mixed");
    }
    selectedTopic =
      availableTopics[Math.floor(Math.random() * availableTopics.length)];
  } else {
    selectedTopic = topic;
  }

  const forceKind =
    probeOpts?.forceKind != null ? String(probeOpts.forceKind).trim() : "";
  const forceSkillId =
    probeOpts?.forceSkillId != null ? String(probeOpts.forceSkillId).trim() : "";
  const forcedTopic = parseEnglishTopicFromSkillId(forceSkillId);
  if (forcedTopic && !isMixed) {
    selectedTopic = forcedTopic;
  }
  const forcedWordListKey =
    parseEnglishWordListKeyFromSkillId(forceSkillId) ||
    englishWordListKeyFromPageId(forceKind);
  const forcedPoolKey = parseEnglishPoolKeyFromSkillId(forceSkillId);
  const forcedPhonicsPage = parseEnglishPhonicsPageFromSkillId(forceSkillId);
  const phonicsForceKind =
    forceKind ||
    (forcedPhonicsPage && forcedPhonicsPage.grade === gradeKey
      ? forcedPhonicsPage.pageId
      : "");

  let question,
    correctAnswer,
    questionLabel = "",
    exerciseText = "",
    params = {};
  /** @type {Record<string, unknown>|null} */
  let englishSourceRow = null;
  let qType = "choice"; // ייקבע אחרי הבנייה לפי כללים דטרמיניסטיים
  const buildAcceptedAnswers = (baseAnswer) => {
    const normalizeQuotes = (value) =>
      String(value ?? "")
        .replace(/[“”״]/g, '"')
        .replace(/[‘’׳]/g, "'")
        .trim();
    const stripSurroundingPunctuation = (value) =>
      normalizeQuotes(value).replace(
        /^[\s"'`.,!?;:()[\]{}\-–-]+|[\s"'`.,!?;:()[\]{}\-–-]+$/g,
        ""
      );
    const normalizeSpaces = (value) =>
      String(value ?? "")
        .trim()
        .replace(/\s+/g, " ");

    const base = normalizeQuotes(baseAnswer);
    const noPunct = stripSurroundingPunctuation(base);
    const compactSpace = normalizeSpaces(base);
    const noPunctCompact = normalizeSpaces(noPunct);

    return Array.from(
      new Set([base, noPunct, compactSpace, noPunctCompact].filter(Boolean))
    );
  };
  const gradeConfig = GRADES[gradeKey] || GRADES.g3;
  const gradeProfile = GRADE_PROFILES[gradeKey] || DEFAULT_GRADE_PROFILE;
  const gNum = parseInt(String(gradeKey).replace(/\D/g, ""), 10) || 3;
  const gradeWordLists = (gradeConfig.wordLists || []).filter(
    (list) => WORD_LISTS[list]
  );
  const curriculumFallbackLists = englishVocabListKeysForGrade(
    gradeKey,
    WORD_LISTS
  );
  const fallbackWordLists = gradeWordLists.length
    ? gradeWordLists
    : curriculumFallbackLists.length
      ? curriculumFallbackLists
      : ["colors"];
  const gradeScopedVocabKeys = (
    gradeWordLists.length ? gradeWordLists : curriculumFallbackLists
  ).filter((k) => WORD_LISTS[k]);
  const vocabKeysForMcq =
    gradeScopedVocabKeys.length > 0 ? gradeScopedVocabKeys : ["colors"];
  let activeVocabList =
    fallbackWordLists[Math.floor(Math.random() * fallbackWordLists.length)];
  if (forcedWordListKey && WORD_LISTS[forcedWordListKey]) {
    activeVocabList = forcedWordListKey;
  }
  const words = WORD_LISTS[activeVocabList] || WORD_LISTS.colors;
  const wordEntries = Object.entries(words);
  const randomWord =
    wordEntries[Math.floor(Math.random() * wordEntries.length)] || [
      "sun",
      "שמש",
    ];

  switch (selectedTopic) {
    case "vocabulary": {
      const vocabDirections =
        gradeProfile.vocabDirections || ["en_to_he", "he_to_en"];
      const directionKey =
        vocabDirections[Math.floor(Math.random() * vocabDirections.length)];
      const directionIsEnglish = directionKey === "en_to_he";
      if (directionIsEnglish) {
        question = `מה פירוש המילה "${randomWord[0]}"\u200F?`;
        correctAnswer = randomWord[1];
        params = {
          word: randomWord[0],
          translation: randomWord[1],
          direction: "en_to_he",
          listKey: activeVocabList,
          patternFamily: "vocab_translation",
        };
      } else {
        question = `כתוב את המילה "${randomWord[1]}"\u200F באנגלית`;
        correctAnswer = randomWord[0];
        params = {
          word: randomWord[1],
          translation: randomWord[0],
          direction: "he_to_en",
          listKey: activeVocabList,
          patternFamily: "vocab_recall_en",
        };
      }
      if (forceKind) params.bookPageId = forceKind;
      break;
    }

    case "grammar": {
      const grammarPoolKeys =
        forcedPoolKey && GRAMMAR_POOLS[forcedPoolKey]
          ? [forcedPoolKey]
          : gradeProfile.grammarPools || ["present_simple"];
      let pool = [];
      grammarPoolKeys.forEach((key) => {
        if (GRAMMAR_POOLS[key]) {
          const rows = GRAMMAR_POOLS[key].filter((item) =>
            englishPoolItemAllowedWithClassSplit("grammar", key, item, gradeKey)
          );
          pool = pool.concat(rows);
        }
      });
      if (pool.length === 0) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[english] grammar pool empty after grade gating", gradeKey);
        }
        const fb =
          gradeKey === "g1" || gradeKey === "g2"
            ? "be_basic"
            : gradeKey === "g3" || gradeKey === "g4"
              ? "present_simple"
              : "modals";
        if (GRAMMAR_POOLS[fb]) {
          pool = GRAMMAR_POOLS[fb].filter((item) =>
            englishPoolItemAllowedWithClassSplit("grammar", fb, item, gradeKey)
          );
        }
      }
      let grammarProbePick = null;
      const pendingGrammarProbe =
        probeOpts?.grammarProbe &&
        probeMatchesSession(
          probeOpts.grammarProbe,
          gradeKey,
          levelKey,
          selectedTopic
        )
          ? probeOpts.grammarProbe
          : null;

      let grammarQ;
      if (pendingGrammarProbe && pool.length > 0) {
        const pr = selectQuestionWithProbe({
          items: pool,
          pendingProbe: pendingGrammarProbe,
          recentIds: probeOpts.grammarRecentRowKeys || [],
          currentTopic: selectedTopic,
          fallbackPick: () => pool[Math.floor(Math.random() * pool.length)],
          randomFn: Math.random,
          getItemTopic: () => selectedTopic,
          getItemId: (row) => englishGrammarRowKey(row),
        });
        grammarQ = pr.question;
        if (pr.usedProbe) {
          grammarProbePick = {
            snapshot: pendingGrammarProbe,
            reason: pr.reason,
          };
        }
      } else {
        grammarQ = pool[Math.floor(Math.random() * pool.length)];
      }
      if (!grammarQ) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[english] no grammar item after gating", gradeKey);
        }
        question =
          "אין כרגע שאלת דקדוק מתאימה לכיתה הזו. נסו רמה אחרת או חזרו לתפריט.";
        correctAnswer = "הבנתי";
        params = {
          patternFamily: "english_empty_pool",
          grammarOptionSet: ["הבנתי", "אנסה שוב", "אחזור לתפריט", "בחרו נושא אחר"],
        };
        break;
      }
      englishSourceRow = grammarQ;
      question = grammarQ.question;
      correctAnswer = grammarQ.correct;
      params = mergeDiagnosticContractIntoParams(
        {
          explanation: grammarQ.explanation,
          patternFamily: grammarQ.patternFamily || "grammar_mcq",
          distractorFamily: grammarQ.distractorFamily || "grammar_forms",
          grammarOptionSet: Array.isArray(grammarQ.options)
            ? grammarQ.options
            : null,
        },
        grammarQ
      );
      if (forcedPoolKey) params.englishPoolKey = forcedPoolKey;
      if (forceKind) params.bookPageId = forceKind;
      if (grammarProbePick && probeOpts?.probeMetaHolder) {
        probeOpts.probeMetaHolder.current = {
          probeSnapshot: grammarProbePick.snapshot,
          probeReason: grammarProbePick.reason,
          expectedErrorTags: Array.isArray(params.expectedErrorTags)
            ? [...params.expectedErrorTags]
            : undefined,
        };
      }
      break;
    }

    case "translation": {
      const translationPoolKeys =
        forcedPoolKey && TRANSLATION_POOLS[forcedPoolKey]
          ? [forcedPoolKey]
          : gradeProfile.translationPools || ["classroom"];
      let sentencesPool = [];
      translationPoolKeys.forEach((key) => {
        if (TRANSLATION_POOLS[key]) {
          const rows = TRANSLATION_POOLS[key].filter((item) =>
            englishPoolItemAllowedWithClassSplit("translation", key, item, gradeKey)
          );
          sentencesPool = sentencesPool.concat(rows);
        }
      });
      if (sentencesPool.length === 0) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[english] translation pool empty after grade gating", gradeKey);
        }
        const fb =
          gradeKey === "g1"
            ? "classroom"
            : gradeKey === "g2"
              ? "routines"
              : gradeKey === "g3" || gradeKey === "g4"
                ? "hobbies"
                : "technology";
        if (TRANSLATION_POOLS[fb]) {
          sentencesPool = TRANSLATION_POOLS[fb].filter((item) =>
            englishPoolItemAllowedWithClassSplit("translation", fb, item, gradeKey)
          );
        }
      }
      const sentence =
        sentencesPool.length > 0
          ? sentencesPool[Math.floor(Math.random() * sentencesPool.length)]
          : null;
      if (!sentence) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[english] translation pool still empty", gradeKey);
        }
        question =
          "אין כרגע משפטי תרגום מתאימים לכיתה. נסו נושא אחר או רמה אחרת.";
        correctAnswer = "הבנתי";
        params = {
          patternFamily: "english_empty_pool",
          direction: "en_to_he",
        };
        break;
      }
      const translationToEnglish =
        levelKey === "hard" ||
        (levelKey === "medium" && gNum >= 4) ||
        (levelKey === "easy" && gNum >= 6);
      englishSourceRow = sentence;
      const direction = translationToEnglish ? "he_to_en" : "en_to_he";
      const trFam =
        sentence.patternFamily ||
        (direction === "en_to_he"
          ? "translation_clause"
          : "translation_production");
      if (direction === "en_to_he") {
        question = `תרגם: "${sentence.en}"`;
        correctAnswer = sentence.he;
        params = mergeDiagnosticContractIntoParams(
          {
            sentence: sentence.en,
            translation: sentence.he,
            direction: "en_to_he",
            patternFamily: trFam,
            difficulty: sentence.difficulty,
            cognitiveLevel: sentence.cognitiveLevel,
          },
          sentence
        );
      } else {
        question = `תרגם: "${sentence.he}"`;
        correctAnswer = sentence.en;
        params = mergeDiagnosticContractIntoParams(
          {
            sentence: sentence.he,
            translation: sentence.en,
            direction: "he_to_en",
            patternFamily: trFam,
            difficulty: sentence.difficulty,
            cognitiveLevel: sentence.cognitiveLevel,
          },
          sentence
        );
      }
      if (forcedPoolKey) params.englishPoolKey = forcedPoolKey;
      if (forceKind) params.bookPageId = forceKind;
      break;
    }

    case "sentences": {
      const sentencePoolKeys =
        forcedPoolKey && SENTENCE_POOLS[forcedPoolKey]
          ? [forcedPoolKey]
          : gradeProfile.sentencePools || ["routine"];
      let pool = [];
      sentencePoolKeys.forEach((key) => {
        if (SENTENCE_POOLS[key]) {
          const rows = SENTENCE_POOLS[key].filter((item) =>
            englishPoolItemAllowedWithClassSplit("sentence", key, item, gradeKey)
          );
          pool = pool.concat(rows);
        }
      });
      if (pool.length === 0) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[english] sentence pool empty after grade gating", gradeKey);
        }
        const fb =
          gradeKey === "g1"
            ? "base"
            : gradeKey === "g2" || gradeKey === "g3"
              ? "routine"
              : gradeKey === "g4"
                ? "descriptive"
                : "advanced";
        if (SENTENCE_POOLS[fb]) {
          pool = SENTENCE_POOLS[fb].filter((item) =>
            englishPoolItemAllowedWithClassSplit("sentence", fb, item, gradeKey)
          );
        }
      }
      const template =
        pool.length > 0
          ? pool[Math.floor(Math.random() * pool.length)]
          : null;
      if (!template) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[english] sentence pool still empty", gradeKey);
        }
        question =
          "אין כרגע תבניות משפט מתאימות לכיתה. נסו נושא אחר או רמה אחרת.";
        correctAnswer = "הבנתי";
        params = {
          patternFamily: "english_empty_pool",
          sentenceOptionSet: ["הבנתי", "אנסה שוב", "אחזור לתפריט", "נושא אחר"],
        };
        break;
      }
      englishSourceRow = template;
      question = `השלם את המשפט: "${template.template}"`;
      correctAnswer = template.correct;
      params = mergeDiagnosticContractIntoParams(
        {
          template: template.template,
          explanation: template.explanation,
          patternFamily: template.patternFamily || "sentence_completion",
          distractorFamily: template.distractorFamily || "same_slot_forms",
          sentenceOptionSet: Array.isArray(template.options)
            ? template.options
            : null,
          difficulty: template.difficulty,
          cognitiveLevel: template.cognitiveLevel,
        },
        template
      );
      if (!params.diagnosticSkillId && template.skillId) {
        params.diagnosticSkillId = template.skillId;
      }
      if (forcedPoolKey) params.englishPoolKey = forcedPoolKey;
      if (forceKind) params.bookPageId = forceKind;
      break;
    }

    case "writing": {
      const writingPoolsRaw = gradeProfile.writingPools || ["word"];
      const writingPools = writingPoolsRaw.filter((m) =>
        englishWritingModeAllowed(m, gradeKey)
      );
      const modes = writingPools.length ? writingPools : ["word"];
      const mode = modes[Math.floor(Math.random() * modes.length)] || "word";
      if (mode === "word") {
        const [en, he] = randomWord;
        question = `כתוב באנגלית: "${he}"`;
        correctAnswer = en;
        params = {
          type: "word",
          wordHe: he,
          wordEn: en,
          direction: "he_to_en",
          patternFamily: "writing_word",
        };
      } else {
        let pool = WRITING_SENTENCES_BASIC;
        if (mode === "sentence_extended") {
          pool = WRITING_SENTENCES_ADVANCED;
        } else if (mode === "sentence_master") {
          pool = WRITING_SENTENCES_MASTER;
        }
        let pickPool = pool;
        if (mode === "sentence_extended" || mode === "sentence_master") {
          const gated = pool.filter((s) =>
            englishWritingSentenceAllowedForGrade(gradeKey, s)
          );
          if (gated.length) pickPool = gated;
        }
        const s = pickPool[Math.floor(Math.random() * pickPool.length)];
        question = `כתוב באנגלית: "${s.he}"`;
        correctAnswer = s.en;
        params = {
          type: "sentence",
          sentenceHe: s.he,
          sentenceEn: s.en,
          direction: "he_to_en",
          patternFamily:
            mode === "sentence_master"
              ? "writing_sentence_master"
              : mode === "sentence_extended"
                ? "writing_sentence_extended"
                : "writing_sentence_basic",
          subtype: mode,
          contentSlot: englishClassSplitBucket(String(s.he || s.en || ""), 2),
        };
        qType = "typing";
        break;
      }
      qType = "typing";
      break;
    }

    case "phonics": {
      const pool = getRuntimeEligiblePhonicsPool(gradeKey, phonicsForceKind);
      if (pool.length === 0) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[english] phonics pool empty after runtime gating", gradeKey, phonicsForceKind);
        }
        question =
          "אין כרגע תרגיל פוניקה מתאים לכיתה הזו. נסו עמוד אחר או חזרו לתפריט.";
        correctAnswer = "הבנתי";
        params = {
          patternFamily: "english_empty_pool",
          phonicsOptionSet: ["הבנתי", "אנסה שוב", "אחזור לתפריט", "בחרו נושא אחר"],
          promotionEligible: false,
          diagnosticContribution: "manual_only",
          topic: "phonics",
        };
        break;
      }
      const phonicsQ = pool[Math.floor(Math.random() * pool.length)];
      englishSourceRow = phonicsQ;
      questionLabel = String(phonicsQ.question || "").trim();
      exerciseText = getPhonicsPracticeStimulus(phonicsQ);
      question = exerciseText || questionLabel;
      correctAnswer = phonicsQ.correct;
      const skillId =
        englishPhonicsSkillIdFromBookPageRef(phonicsQ.bookPageRef) ||
        (phonicsForceKind ? `english:phonics:${gradeKey}:${phonicsForceKind}` : null);
      params = mergeDiagnosticContractIntoParams(
        {
          itemType: phonicsQ.itemType,
          subtype: phonicsQ.itemType,
          patternFamily: phonicsQ.patternFamily || "phonics_mcq",
          phonicsOptionSet: Array.isArray(phonicsQ.options) ? phonicsQ.options : null,
          phonicsStimulus: exerciseText || null,
          bookPageRef: phonicsQ.bookPageRef,
          bookPageId: phonicsForceKind || phonicsQ.bookPageRef?.split(":")[2] || "",
          englishPhonicsGrade: gradeKey,
          diagnosticContribution: phonicsQ.diagnosticContribution || "thin",
          promotionEligible: false,
          requiresAudio: false,
          topic: "phonics",
        },
        phonicsQ
      );
      if (skillId) params.diagnosticSkillId = skillId;
      if (phonicsForceKind) params.bookPageId = phonicsForceKind;
      break;
    }

    case "mixed": {
      const availableTopics = GRADES[gradeKey].topics.filter(
        (t) => t !== "mixed"
      );
      const randomTopic =
        availableTopics[Math.floor(Math.random() * availableTopics.length)];
      return generateQuestion(level, randomTopic, gradeKey, null, levelKey, probeOpts);
    }
  }

  qType = resolveEnglishQType({
    selectedTopic,
    levelKey,
    gradeKey,
    question,
    correctAnswer,
    params,
  });

  let allAnswers = [];
  if (qType === "choice") {
    const targetChoices = 4;
    const sameCategoryGrammar = [
      "am",
      "is",
      "are",
      "was",
      "were",
      "do",
      "does",
      "did",
      "have",
      "has",
      "had",
      "can",
      "could",
      "will",
      "would",
    ];

    if (
      selectedTopic === "grammar" &&
      Array.isArray(params.grammarOptionSet) &&
      params.grammarOptionSet.length >= 2
    ) {
      allAnswers = buildMcqFromOptionPool(
        correctAnswer,
        params.grammarOptionSet,
        targetChoices
      );
    } else if (
      selectedTopic === "sentences" &&
      Array.isArray(params.sentenceOptionSet) &&
      params.sentenceOptionSet.length >= 2
    ) {
      allAnswers = buildMcqFromOptionPool(
        correctAnswer,
        params.sentenceOptionSet,
        targetChoices
      );
    } else if (
      selectedTopic === "phonics" &&
      Array.isArray(params.phonicsOptionSet) &&
      params.phonicsOptionSet.length >= 2
    ) {
      allAnswers = buildMcqFromOptionPool(
        correctAnswer,
        params.phonicsOptionSet,
        targetChoices
      );
    } else if (selectedTopic === "vocabulary") {
      const list = WORD_LISTS[params.listKey] || words;
      const pool =
        params.direction === "he_to_en"
          ? Object.keys(list)
          : Object.values(list);
      allAnswers = buildMcqFromOptionPool(
        correctAnswer,
        pool,
        targetChoices
      );
    } else {
      const wrongNeeded = Math.max(1, targetChoices - 1);
      const wrongAnswers = new Set();
      let guard = 0;
      while (wrongAnswers.size < wrongNeeded && guard < 200) {
        guard++;
        let wrong;
        if (selectedTopic === "grammar" || selectedTopic === "sentences") {
          wrong =
            sameCategoryGrammar[
              Math.floor(Math.random() * sameCategoryGrammar.length)
            ];
        } else if (params.direction === "he_to_en") {
          const allEnglishWords = vocabKeysForMcq.flatMap((k) =>
            Object.keys(WORD_LISTS[k] || {})
          );
          wrong =
            allEnglishWords.length > 0
              ? allEnglishWords[
                  Math.floor(Math.random() * allEnglishWords.length)
                ]
              : "word";
        } else {
          const allHebrewWords = vocabKeysForMcq.flatMap((k) =>
            Object.values(WORD_LISTS[k] || {})
          );
          wrong =
            allHebrewWords.length > 0
              ? allHebrewWords[
                  Math.floor(Math.random() * allHebrewWords.length)
                ]
              : "מילה";
        }
        if (wrong !== correctAnswer && !wrongAnswers.has(wrong)) {
          wrongAnswers.add(wrong);
        }
      }
      allAnswers = shuffleAnswerList(
        [correctAnswer, ...Array.from(wrongAnswers)].slice(0, targetChoices)
      );
    }
  }

  const mergedParams = {
    ...params,
    answerMode: qType,
    levelKey,
  };

  const display = sanitizeQuestionForStudentDisplay({
    question,
    questionLabel: questionLabel || undefined,
    exerciseText: exerciseText || undefined,
    correctAnswer,
    acceptedAnswers: buildAcceptedAnswers(correctAnswer),
    answers: allAnswers,
    topic: selectedTopic,
    params: mergedParams,
    qType,
  });

  if (selectedTopic === "phonics") {
    attachEnglishPhonicsPracticeAudio(display, {
      gradeKey,
      sourceRow: englishSourceRow,
    });
  }

  if (selectedTopic === "vocabulary" && isLowerGradeG1G2Key(gradeKey)) {
    attachEnglishVocabPracticeAudio(display, { gradeKey });
  }

  const finalized = attachCanonicalMetadataToEnglishQuestion(display, {
    topic: selectedTopic,
    gradeKey,
    levelKey,
    sourceRow: englishSourceRow,
  });

  if (
    selectedTopic === "phonics" &&
    isLowerGradeG1G2Key(gradeKey) &&
    !isG1G2RuntimePracticeEligible(finalized, { gradeKey, subject: "english" })
  ) {
    const retry = Number(probeOpts?._runtimeQualityRetry) || 0;
    if (retry < 12) {
      return generateQuestion(level, selectedTopic, gradeKey, mixedOps, levelKey, {
        ...probeOpts,
        _runtimeQualityRetry: retry + 1,
      });
    }
  }

  return finalized;
}

export { ENGLISH_GRADES, ENGLISH_GRADE_ORDER };
