/**
 * One-off builder for Phase B English pool batch files.
 * Run: node scripts/build-english-pools-phase-b.mjs
 */
import { writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ERR = ["grammar_error", "grammar_pattern_error", "careless_error"];

function g(opts) {
  return {
    cognitiveLevel: opts.cognitiveLevel ?? (opts.difficulty === "advanced" ? "application" : "understanding"),
    expectedErrorTypes: ERR,
    skillId: opts.skillId ?? opts.patternFamily,
    subtype: opts.subtype,
    ...opts,
  };
}

function t(opts) {
  return { patternFamily: opts.patternFamily, ...opts };
}

// —— Grammar 55 items ——
const grammarItems = {
  present_simple: [],
  question_frames: [],
  progressive: [],
  quantifiers: [],
  past_simple: [],
  modals: [],
  comparatives: [],
  future_forms: [],
  complex_tenses: [],
  conditionals: [],
};

function pushGrammar(pool, item) {
  grammarItems[pool].push(g({ subtype: pool, ...item }));
}

/** @param {string} question @param {string[]} options @param {string} correct */
function finalizeGrammarAsSentenceMcq(question, options, correct) {
  const match = question.match(/Choose:\s*"([^"]+)"/);
  const template = match ? match[1] : question.replace(/^Choose:\s*/i, "").trim();

  function fillBlank(word) {
    if (/___+/.test(template)) return template.replace(/___+/g, word);
    if (/__+/.test(template)) return template.replace(/__+/g, word);
    return template;
  }

  const fullOptions = options.map((opt) => fillBlank(opt).trim());
  const correctSentence = fillBlank(correct).trim();

  return {
    question: "Choose the correct sentence:",
    options: fullOptions,
    correct: correctSentence,
  };
}

// G3 hard (5): 3 present_simple + 2 question_frames
[
  ["present_simple", "phase_b_g3_ps_hard_01", 3, 3, "Choose: \"My cousin ___ English and French fluently\"", ["speak", "speaks", "speaking", "spoken"], "speaks", "He/she/it → -s in present simple."],
  ["present_simple", "phase_b_g3_ps_hard_02", 3, 3, "Choose: \"___ your brother play the piano on Sundays?\"", ["Do", "Does", "Did", "Is"], "Does", "Questions with he/she/it → Does."],
  ["present_simple", "phase_b_g3_ps_hard_03", 3, 3, "Choose: \"We ___ watch TV before we finish homework\"", ["don't", "doesn't", "didn't", "aren't"], "don't", "We → don't + base verb for negatives."],
  ["question_frames", "phase_b_g3_qf_hard_01", 3, 3, "Choose: \"___ many students are in your class?\"", ["How", "What", "Where", "When"], "How", "How many → quantity questions."],
  ["question_frames", "phase_b_g3_qf_hard_02", 3, 3, "Choose: \"___ did you put your library book?\"", ["Where", "Who", "Whose", "Which"], "Where", "Asking about place → Where."],
  ["present_simple", "phase_b_g3_ps_hard_04", 3, 3, "Choose: \"The train ___ at eight every morning\"", ["leave", "leaves", "leaving", "left"], "leaves", "The train → leaves."],
  ["present_simple", "phase_b_g3_ps_hard_05", 3, 3, "Choose: \"Those children ___ soccer after school\"", ["play", "plays", "playing", "played"], "play", "Those children → play."],
  ["question_frames", "phase_b_g3_qf_hard_03", 3, 3, "Choose: \"___ is your favorite subject this year?\"", ["What", "Where", "When", "Who"], "What", "Asking about a thing → What."],
  ["question_frames", "phase_b_g3_qf_hard_04", 3, 3, "Choose: \"___ often do you visit your grandparents?\"", ["How", "What", "Where", "Which"], "How", "How often → frequency questions."],
  ["present_simple", "phase_b_g3_ps_hard_06", 3, 3, "Choose: \"She never ___ vegetables at lunch\"", ["eat", "eats", "eating", "ate"], "eats", "She → eats."],
  ["present_simple", "phase_b_g3_ps_hard_07", 3, 3, "Choose: \"We always ___ our classroom tidy\"", ["keep", "keeps", "keeping", "kept"], "keep", "We → keep."],
  ["question_frames", "phase_b_g3_qf_hard_05", 3, 3, "Choose: \"___ does the art lesson start on Thursdays?\"", ["When", "Who", "Whose", "Which"], "When", "Asking about time → When."],
].forEach(([pool, pf, minG, maxG, q, opts, correct, expl]) =>
  pushGrammar(pool, { minGrade: minG, maxGrade: maxG, patternFamily: pf, question: q, options: opts, correct, explanation: expl, difficulty: "advanced" })
);

// G4 medium (5)
[
  ["progressive", "phase_b_g4_prog_med_01", 4, 4, "Choose: \"Listen! The birds ___ in the trees\"", ["sing", "sings", "are singing", "sang"], "are singing", "Listen! → action now → present continuous."],
  ["progressive", "phase_b_g4_prog_med_02", 4, 4, "Choose: \"Right now, I ___ a letter to my pen pal\"", ["write", "writes", "am writing", "wrote"], "am writing", "Right now → am + verb-ing."],
  ["quantifiers", "phase_b_g4_quant_med_01", 4, 4, "Choose: \"There isn't ___ sugar left in the bowl\"", ["many", "much", "few", "several"], "much", "Uncountable nouns → much in negatives."],
  ["quantifiers", "phase_b_g4_quant_med_02", 4, 4, "Choose: \"We saw ___ interesting posters at the museum\"", ["much", "many", "little", "a little"], "many", "Countable plural → many."],
  ["present_simple", "phase_b_g4_ps_med_01", 4, 4, "Choose: \"The shop ___ at nine every morning\"", ["open", "opens", "opening", "opened"], "opens", "Habitual schedule → present simple, third person -s."],
].forEach(([pool, pf, minG, maxG, q, opts, correct, expl]) =>
  pushGrammar(pool, { minGrade: minG, maxGrade: maxG, patternFamily: pf, question: q, options: opts, correct, explanation: expl, difficulty: "standard" })
);

// G4 hard (5)
[
  ["progressive", "phase_b_g4_prog_hard_01", 4, 4, "Choose: \"While we ___ dinner, it started to rain\"", ["have", "had", "were having", "are having"], "were having", "Longer past action in progress → past continuous."],
  ["progressive", "phase_b_g4_prog_hard_02", 4, 4, "Choose: \"She usually walks, but today she ___ the bus\"", ["takes", "is taking", "took", "take"], "is taking", "Contrast: usually vs today → present continuous for now."],
  ["quantifiers", "phase_b_g4_quant_hard_01", 4, 4, "Choose: \"There are only ___ apples, so share them\"", ["a few", "a little", "much", "plenty"], "a few", "Countable → a few (small positive amount)."],
  ["quantifiers", "phase_b_g4_quant_hard_02", 4, 4, "Choose: \"We have ___ time before the bell rings\"", ["few", "a few", "little", "a little"], "a little", "Uncountable time → a little."],
  ["present_simple", "phase_b_g4_ps_hard_01", 4, 4, "Choose: \"___ your parents work near the school?\"", ["Do", "Does", "Are", "Did"], "Do", "Plural subject → Do in present simple questions."],
].forEach(([pool, pf, minG, maxG, q, opts, correct, expl]) =>
  pushGrammar(pool, { minGrade: minG, maxGrade: maxG, patternFamily: pf, question: q, options: opts, correct, explanation: expl, difficulty: "advanced" })
);

// G5 medium (10): 3+2+2+3
const g5Med = [
  ["past_simple", "phase_b_g5_past_med_01", 5, 5, "Choose: \"Last night they ___ a documentary about oceans\"", ["watch", "watched", "watching", "have watched"], "watched", "Last night → past simple."],
  ["past_simple", "phase_b_g5_past_med_02", 5, 5, "Choose: \"She ___ her keys on the bus yesterday\"", ["lose", "lost", "loses", "has lost"], "lost", "Irregular past: lose → lost."],
  ["past_simple", "phase_b_g5_past_med_03", 5, 5, "Choose: \"___ you finish the survey before lunch?\"", ["Do", "Did", "Have", "Are"], "Did", "Past time → Did for questions."],
  ["modals", "phase_b_g5_mod_med_01", 5, 5, "Choose: \"You ___ wear a helmet when you ride a bike\"", ["can", "must", "might", "would"], "must", "Rule/obligation → must."],
  ["modals", "phase_b_g5_mod_med_02", 5, 5, "Choose: \"We ___ visit grandma if the road is open\"", ["must", "can", "should", "had"], "can", "Possibility/ability → can."],
  ["comparatives", "phase_b_g5_comp_med_01", 5, 5, "Choose: \"This backpack is ___ than my old one\"", ["light", "lighter", "lightest", "more light"], "lighter", "Two items → comparative -er."],
  ["comparatives", "phase_b_g5_comp_med_02", 5, 5, "Choose: \"The second chapter is ___ interesting than the first\"", ["more", "most", "much", "many"], "more", "Long adjective → more + adjective."],
  ["future_forms", "phase_b_g5_fut_med_01", 5, 5, "Choose: \"We ___ a class party next Friday\"", ["have", "had", "are going to have", "having"], "are going to have", "Planned future → going to."],
  ["future_forms", "phase_b_g5_fut_med_02", 5, 5, "Choose: \"I think it ___ rain this afternoon\"", ["will", "is", "was", "goes"], "will", "Prediction → will."],
  ["future_forms", "phase_b_g5_fut_med_03", 5, 5, "Choose: \"They ___ travel to Haifa tomorrow morning\"", ["will", "went", "go", "going"], "will", "Tomorrow → will + base verb."],
];
g5Med.forEach(([pool, pf, minG, maxG, q, opts, correct, expl]) =>
  pushGrammar(pool, { minGrade: minG, maxGrade: maxG, patternFamily: pf, question: q, options: opts, correct, explanation: expl, difficulty: "standard" })
);

// G5 hard (10)
const g5Hard = [
  ["past_simple", "phase_b_g5_past_hard_01", 5, 5, "Choose: \"By the time we arrived, the show ___\"", ["begin", "began", "begins", "has begun"], "began", "Earlier past event → past simple."],
  ["past_simple", "phase_b_g5_past_hard_02", 5, 5, "Choose: \"Nobody ___ me about the schedule change\"", ["tell", "told", "tells", "has told"], "told", "Nobody + past context → told."],
  ["past_simple", "phase_b_g5_past_hard_03", 5, 5, "Choose: \"___ she already pack her bag last night?\"", ["Do", "Did", "Has", "Was"], "Did", "Completed past action → Did."],
  ["modals", "phase_b_g5_mod_hard_01", 5, 5, "Choose: \"You ___ eat so much candy; it's bad for teeth\"", ["mustn't", "can't", "shouldn't", "won't"], "shouldn't", "Advice → shouldn't."],
  ["modals", "phase_b_g5_mod_hard_02", 5, 5, "Choose: \"Guests ___ bring food without asking the host\"", ["must", "mustn't", "can", "will"], "mustn't", "Prohibition → mustn't."],
  ["comparatives", "phase_b_g5_comp_hard_01", 5, 5, "Choose: \"Mount Hermon is the ___ peak we studied\"", ["high", "higher", "highest", "more high"], "highest", "Superlative with the → -est."],
  ["comparatives", "phase_b_g5_comp_hard_02", 5, 5, "Choose: \"Her explanation was ___ clear than his\"", ["more", "most", "much", "many"], "more", "Comparative of clear → more clear."],
  ["future_forms", "phase_b_g5_fut_hard_01", 5, 5, "Choose: \"Look at those clouds — it ___ pour soon\"", ["will", "is going to", "went", "goes"], "is going to", "Evidence now → going to."],
  ["future_forms", "phase_b_g5_fut_hard_02", 5, 5, "Choose: \"I promise I ___ send you the photos tonight\"", ["am sending", "send", "will send", "sent"], "will send", "Promise → will."],
  ["future_forms", "phase_b_g5_fut_hard_03", 5, 5, "Choose: \"We ___ not decide until we hear from the coach\"", ["do", "will", "are", "did"], "will", "Future decision → will not."],
];
g5Hard.forEach(([pool, pf, minG, maxG, q, opts, correct, expl]) =>
  pushGrammar(pool, { minGrade: minG, maxGrade: maxG, patternFamily: pf, question: q, options: opts, correct, explanation: expl, difficulty: "advanced" })
);

// G6 medium (10)
const g6Med = [
  ["complex_tenses", "phase_b_g6_ct_med_01", 6, 6, "Choose: \"She ___ in this choir since last year\"", ["sings", "sang", "has sung", "is singing"], "has sung", "Since + point in past → present perfect."],
  ["complex_tenses", "phase_b_g6_ct_med_02", 6, 6, "Choose: \"While I ___ homework, my sister called\"", ["did", "was doing", "do", "have done"], "was doing", "Interrupted past → past continuous."],
  ["complex_tenses", "phase_b_g6_ct_med_03", 6, 6, "Choose: \"They ___ the project before the deadline\"", ["finish", "finished", "have finished", "finishing"], "have finished", "Before now, result matters → present perfect."],
  ["conditionals", "phase_b_g6_cond_med_01", 6, 6, "Choose: \"If it rains, we ___ the picnic indoors\"", ["have", "will have", "had", "having"], "will have", "Zero/first conditional → will."],
  ["conditionals", "phase_b_g6_cond_med_02", 6, 6, "Choose: \"If you heat ice, it ___\"", ["melted", "melts", "will melt", "is melting"], "melts", "General truth → present simple."],
  ["modals", "phase_b_g6_mod_med_01", 6, 6, "Choose: \"Students ___ submit the form by Thursday\"", ["might", "have to", "could", "would"], "have to", "External obligation → have to."],
  ["modals", "phase_b_g6_mod_med_02", 6, 6, "Choose: \"You ___ be tired after the hike\"", ["must", "might", "mustn't", "shouldn't"], "might", "Possibility → might."],
  ["comparatives", "phase_b_g6_comp_med_01", 6, 6, "Choose: \"This essay is ___ organized than the draft\"", ["well", "better", "best", "gooder"], "better", "Irregular comparative: good → better."],
  ["comparatives", "phase_b_g6_comp_med_02", 6, 6, "Choose: \"The data set is ___ accurate than we expected\"", ["more", "most", "much", "many"], "more", "Long adjective → more accurate."],
  ["comparatives", "phase_b_g6_comp_med_03", 6, 6, "Choose: \"Of the three routes, this one is the ___\"", ["safe", "safer", "safest", "more safe"], "safest", "Three or more → superlative."],
];
g6Med.forEach(([pool, pf, minG, maxG, q, opts, correct, expl]) =>
  pushGrammar(pool, { minGrade: minG, maxGrade: maxG, patternFamily: pf, question: q, options: opts, correct, explanation: expl, difficulty: "standard" })
);

// G6 hard (10)
const g6Hard = [
  ["complex_tenses", "phase_b_g6_ct_hard_01", 6, 6, "Choose: \"By noon, we ___ three chapters\"", ["read", "were reading", "had read", "have read"], "had read", "Earlier past before another past → past perfect."],
  ["complex_tenses", "phase_b_g6_ct_hard_02", 6, 6, "Choose: \"She ___ for the team when she lived here\"", ["has played", "played", "was playing", "plays"], "was playing", "Past habit in progress → past continuous."],
  ["complex_tenses", "phase_b_g6_ct_hard_03", 6, 6, "Choose: \"I ___ never seen such a detailed map before\"", ["have", "had", "was", "did"], "have", "Experience up to now → present perfect."],
  ["conditionals", "phase_b_g6_cond_hard_01", 6, 6, "Choose: \"If I ___ more time, I would join the club\"", ["have", "had", "will have", "has"], "had", "Second conditional → If + past, would."],
  ["conditionals", "phase_b_g6_cond_hard_02", 6, 6, "Choose: \"Unless you ___ now, you'll miss the bus\"", ["leave", "left", "will leave", "leaving"], "leave", "Unless + present → future warning."],
  ["modals", "phase_b_g6_mod_hard_01", 6, 6, "Choose: \"You ___ have told me about the change earlier\"", ["should", "must", "can", "will"], "should", "Past advice/regret → should have."],
  ["modals", "phase_b_g6_mod_hard_02", 6, 6, "Choose: \"The keys ___ be in the drawer; I checked\"", ["can't", "must", "might", "should"], "can't", "Strong negative deduction → can't."],
  ["comparatives", "phase_b_g6_comp_hard_01", 6, 6, "Choose: \"This is the ___ difficult puzzle in the set\"", ["more", "most", "much", "many"], "most", "Superlative of difficult → most."],
  ["comparatives", "phase_b_g6_comp_hard_02", 6, 6, "Choose: \"Her score was ___ higher than anyone else's\"", ["even", "ever", "much", "many"], "even", "Emphasis with comparative → even higher."],
  ["comparatives", "phase_b_g6_comp_hard_03", 6, 6, "Choose: \"No other city is ___ historic than Jerusalem\"", ["more", "most", "as", "so"], "more", "Comparative with than → more historic."],
];
g6Hard.forEach(([pool, pf, minG, maxG, q, opts, correct, expl]) =>
  pushGrammar(pool, {
    minGrade: minG,
    maxGrade: maxG,
    patternFamily: pf,
    question: q,
    options: opts,
    correct,
    explanation: expl,
    difficulty: "advanced",
    cognitiveLevel: "analysis",
  })
);

for (const arr of Object.values(grammarItems)) {
  for (const item of arr) {
    const finalized = finalizeGrammarAsSentenceMcq(
      item.question,
      item.options,
      item.correct
    );
    item.question = finalized.question;
    item.options = finalized.options;
    item.correct = finalized.correct;
  }
}

// —— Sentences 40 ——
function sentenceItem(grade, diff, pf, correct, wrongs, expl) {
  const options = [correct, ...wrongs.slice(0, 3)];
  return {
    template: "Choose the correct sentence:",
    options,
    correct,
    explanation: expl,
    minGrade: grade,
    maxGrade: grade,
    patternFamily: pf,
    difficulty: diff === "medium" ? "standard" : "advanced",
    cognitiveLevel: diff === "medium" ? "understanding" : "analysis",
    expectedErrorTypes: ["grammar_error", "sentence_order_error", "careless_error"],
    skillId: pf,
    subtype: "assigned_sentence_mcq",
  };
}

const sentenceRows = [
  // G3 medium
  [3, "medium", "phase_b_sent_g3_med_01", "After school, she always does her homework before dinner.", ["After school, she always do her homework before dinner.", "After school, she always doing her homework before dinner.", "After school, she always did her homework before dinner."], "Subject she → does; routine → present simple."],
  [3, "medium", "phase_b_sent_g3_med_02", "My brother usually walks to the library on Tuesdays.", ["My brother usually walk to the library on Tuesdays.", "My brother usually walking to the library on Tuesdays.", "My brother usually walked to the library on Tuesdays."], "Third person singular → walks."],
  [3, "medium", "phase_b_sent_g3_med_03", "We brush our teeth and then we go to bed.", ["We brushes our teeth and then we go to bed.", "We brush our teeth and then we goes to bed.", "We brushing our teeth and then we go to bed."], "Plural subjects → brush, go."],
  [3, "medium", "phase_b_sent_g3_med_04", "The small dog runs quickly across the quiet park.", ["The small dog run quickly across the quiet park.", "The small dog running quickly across the quiet park.", "The small dog ran quickly across the quiet park."], "Singular dog → runs."],
  [3, "medium", "phase_b_sent_g3_med_05", "Every morning, I eat cereal and drink orange juice.", ["Every morning, I eats cereal and drink orange juice.", "Every morning, I eating cereal and drink orange juice.", "Every morning, I ate cereal and drink orange juice."], "I → base verbs eat, drink."],
  // G3 hard
  [3, "hard", "phase_b_sent_g3_hard_01", "Before the bell rings, we always line up quietly near the door.", ["Before the bell rings, we always lines up quietly near the door.", "Before the bell ring, we always line up quietly near the door.", "Before the bell rings, we always lining up quietly near the door."], "We → line; bell rings (third person)."],
  [3, "hard", "phase_b_sent_g3_hard_02", "When it rains, our class sometimes stays inside for recess.", ["When it rains, our class sometimes stay inside for recess.", "When it rain, our class sometimes stays inside for recess.", "When it rains, our class sometimes staying inside for recess."], "Class → stays; rains."],
  [3, "hard", "phase_b_sent_g3_hard_03", "Nobody in our group forgets to bring a water bottle to practice.", ["Nobody in our group forget to bring a water bottle to practice.", "Nobody in our group forgetting to bring a water bottle to practice.", "Nobody in our group forgot to bring a water bottle to practice."], "Nobody → singular forgets."],
  [3, "hard", "phase_b_sent_g3_hard_04", "After we finish art, we usually help the teacher clean the tables.", ["After we finish art, we usually helps the teacher clean the tables.", "After we finishes art, we usually help the teacher clean the tables.", "After we finishing art, we usually help the teacher clean the tables."], "We → finish, help."],
  [3, "hard", "phase_b_sent_g3_hard_05", "The tallest boy in our class often carries the heavy science kit.", ["The tallest boy in our class often carry the heavy science kit.", "The tallest boy in our class often carrying the heavy science kit.", "The tallest boy in our class often carried the heavy science kit."], "Boy → carries."],
  // G4 medium
  [4, "medium", "phase_b_sent_g4_med_01", "The old lighthouse stands proudly on the rocky gray cliff.", ["The old lighthouse stand proudly on the rocky gray cliff.", "The old lighthouse standing proudly on the rocky gray cliff.", "The old lighthouse stood proudly on the rocky gray cliff."], "Lighthouse → stands (description)."],
  [4, "medium", "phase_b_sent_g4_med_02", "While we were waiting, a friendly guide told us a short story.", ["While we were waiting, a friendly guide tell us a short story.", "While we are waiting, a friendly guide told us a short story.", "While we waiting, a friendly guide told us a short story."], "Past narrative → told; while + past continuous."],
  [4, "medium", "phase_b_sent_g4_med_03", "My cousin is painting a colorful mural in the community center today.", ["My cousin is paint a colorful mural in the community center today.", "My cousin are painting a colorful mural in the community center today.", "My cousin painting a colorful mural in the community center today."], "Now → is painting."],
  [4, "medium", "phase_b_sent_g4_med_04", "There are many bright flowers blooming beside the winding river path.", ["There is many bright flowers blooming beside the winding river path.", "There are many bright flower blooming beside the winding river path.", "There are many bright flowers bloom beside the winding river path."], "Flowers plural → are; blooming."],
  [4, "medium", "phase_b_sent_g4_med_05", "Last weekend, our family visited a small museum near the sea.", ["Last weekend, our family visit a small museum near the sea.", "Last weekend, our family visiting a small museum near the sea.", "Last weekend, our family visits a small museum near the sea."], "Last weekend → visited."],
  // G4 hard
  [4, "hard", "phase_b_sent_g4_hard_01", "Although the trail was steep, we reached the lookout before sunset.", ["Although the trail was steep, we reach the lookout before sunset.", "Although the trail is steep, we reached the lookout before sunset.", "Although the trail was steep, we reaching the lookout before sunset."], "Past narrative consistency → was, reached."],
  [4, "hard", "phase_b_sent_g4_hard_02", "The curious kitten hid behind the sofa when the loud thunder started.", ["The curious kitten hide behind the sofa when the loud thunder started.", "The curious kitten hid behind the sofa when the loud thunder start.", "The curious kitten hiding behind the sofa when the loud thunder started."], "Past sequence → hid, started."],
  [4, "hard", "phase_b_sent_g4_hard_03", "Nobody knew why the lights flickered during the short winter storm.", ["Nobody know why the lights flickered during the short winter storm.", "Nobody knew why the lights flicker during the short winter storm.", "Nobody knew why the lights flickering during the short winter storm."], "Past story → knew, flickered."],
  [4, "hard", "phase_b_sent_g4_hard_04", "If you listen carefully, you can hear waves behind the tall dunes.", ["If you listen carefully, you can hears waves behind the tall dunes.", "If you listens carefully, you can hear waves behind the tall dunes.", "If you listen carefully, you can heard waves behind the tall dunes."], "You → listen, can hear."],
  [4, "hard", "phase_b_sent_g4_hard_05", "The volunteers cleaned the beach and collected plastic near the pier.", ["The volunteers clean the beach and collected plastic near the pier.", "The volunteers cleaned the beach and collect plastic near the pier.", "The volunteers cleaning the beach and collected plastic near the pier."], "Parallel past verbs → cleaned, collected."],
  // G5 medium
  [5, "medium", "phase_b_sent_g5_med_01", "However, the team practiced harder and finally won the regional match.", ["However, the team practiced harder and finally win the regional match.", "However, the team practice harder and finally won the regional match.", "However, the team practicing harder and finally won the regional match."], "Past narrative → practiced, won."],
  [5, "medium", "phase_b_sent_g5_med_02", "While I was reading, my friend called to share some exciting news.", ["While I was reading, my friend call to share some exciting news.", "While I am reading, my friend called to share some exciting news.", "While I reading, my friend called to share some exciting news."], "Interrupted action → was reading, called."],
  [5, "medium", "phase_b_sent_g5_med_03", "The coach said that we should stretch before every long practice.", ["The coach said that we should stretched before every long practice.", "The coach say that we should stretch before every long practice.", "The coach said that we should stretching before every long practice."], "Reported advice → said, should stretch."],
  [5, "medium", "phase_b_sent_g5_med_04", "There were fewer mistakes in our report after we checked the data.", ["There were fewer mistakes in our report after we check the data.", "There was fewer mistakes in our report after we checked the data.", "There were fewer mistakes in our report after we checking the data."], "Mistakes plural → were; past → checked."],
  [5, "medium", "phase_b_sent_g5_med_05", "Tomorrow our class will present the results of the water survey.", ["Tomorrow our class will presented the results of the water survey.", "Tomorrow our class present the results of the water survey.", "Tomorrow our class will presenting the results of the water survey."], "Future → will present."],
  // G5 hard
  [5, "hard", "phase_b_sent_g5_hard_01", "The journalist explained that the festival would begin at dawn.", ["The journalist explained that the festival will begin at dawn.", "The journalist explain that the festival would begin at dawn.", "The journalist explained that the festival begins at dawn."], "Reported speech backshift → would begin."],
  [5, "hard", "phase_b_sent_g5_hard_02", "Although the evidence was thin, the students formed a reasonable hypothesis.", ["Although the evidence was thin, the students form a reasonable hypothesis.", "Although the evidence is thin, the students formed a reasonable hypothesis.", "Although the evidence was thin, the students forming a reasonable hypothesis."], "Past context → was, formed."],
  [5, "hard", "phase_b_sent_g5_hard_03", "Nobody remembered where they had left the shared science folder.", ["Nobody remembered where they have left the shared science folder.", "Nobody remember where they had left the shared science folder.", "Nobody remembered where they had leave the shared science folder."], "Past perfect → had left."],
  [5, "hard", "phase_b_sent_g5_hard_04", "If the sensor fails, the robot will stop near the marked safety line.", ["If the sensor fails, the robot stop near the marked safety line.", "If the sensor fail, the robot will stop near the marked safety line.", "If the sensor fails, the robot will stopped near the marked safety line."], "First conditional → fails, will stop."],
  [5, "hard", "phase_b_sent_g5_hard_05", "The mayor thanked the volunteers who had organized the river cleanup.", ["The mayor thanked the volunteers who has organized the river cleanup.", "The mayor thank the volunteers who had organized the river cleanup.", "The mayor thanked the volunteers who organize the river cleanup."], "Earlier past → had organized."],
  // G6 medium
  [6, "medium", "phase_b_sent_g6_med_01", "Furthermore, the study shows that sleep improves memory over several nights.", ["Furthermore, the study show that sleep improves memory over several nights.", "Furthermore, the study shows that sleep improve memory over several nights.", "Furthermore, the study showing that sleep improves memory over several nights."], "Study → shows; improves."],
  [6, "medium", "phase_b_sent_g6_med_02", "If you practice daily, you will notice steady progress by June.", ["If you practice daily, you will noticed steady progress by June.", "If you practices daily, you will notice steady progress by June.", "If you practice daily, you will noticing steady progress by June."], "Conditional → practice, will notice."],
  [6, "medium", "phase_b_sent_g6_med_03", "The committee will announce the winners after they review every entry.", ["The committee will announce the winners after they reviews every entry.", "The committee will announced the winners after they review every entry.", "The committee will announce the winners after they reviewing every entry."], "Future + present after → will announce, review."],
  [6, "medium", "phase_b_sent_g6_med_04", "In contrast, the second experiment produced clearer and more reliable results.", ["In contrast, the second experiment produce clearer and more reliable results.", "In contrast, the second experiment produced clearer and more reliable result.", "In contrast, the second experiment producing clearer and more reliable results."], "Past result → produced."],
  [6, "medium", "phase_b_sent_g6_med_05", "Students who submit early may receive feedback before the final draft.", ["Students who submit early may received feedback before the final draft.", "Students who submits early may receive feedback before the final draft.", "Students who submit early may receiving feedback before the final draft."], "May + base → receive."],
  // G6 hard
  [6, "hard", "phase_b_sent_g6_hard_01", "Had the alarm sounded earlier, fewer devices would have been damaged.", ["Had the alarm sounded earlier, fewer devices would be damaged.", "Had the alarm sound earlier, fewer devices would have been damaged.", "Had the alarm sounded earlier, fewer devices will have been damaged."], "Third conditional → Had..., would have been."],
  [6, "hard", "phase_b_sent_g6_hard_02", "Not only did the team finish early, but they also documented every step.", ["Not only did the team finish early, but they also document every step.", "Not only the team finished early, but they also documented every step.", "Not only did the team finish early, but they also documenting every step."], "Inversion → Not only did... documented."],
  [6, "hard", "phase_b_sent_g6_hard_03", "The editor asked whether the article had cited trustworthy primary sources.", ["The editor asked whether the article has cited trustworthy primary sources.", "The editor ask whether the article had cited trustworthy primary sources.", "The editor asked whether the article had cite trustworthy primary sources."], "Reported question → had cited."],
  [6, "hard", "phase_b_sent_g6_hard_04", "Unless the network improves, remote classes will remain difficult for many.", ["Unless the network improves, remote classes will remained difficult for many.", "Unless the network improve, remote classes will remain difficult for many.", "Unless the network improves, remote classes remain difficult for many."], "Unless + present → will remain."],
  [6, "hard", "phase_b_sent_g6_hard_05", "Rarely have we seen such a thoughtful response to a complex ethical dilemma.", ["Rarely we have seen such a thoughtful response to a complex ethical dilemma.", "Rarely have we saw such a thoughtful response to a complex ethical dilemma.", "Rarely we seen such a thoughtful response to a complex ethical dilemma."], "Inversion after Rarely → have we seen."],
];

const SENTENCE_POOLS_PHASE_B = {
  assigned_sentence_mcq: sentenceRows.map(([grade, diff, pf, correct, wrongs, expl]) =>
    sentenceItem(grade, diff, pf, correct, wrongs, expl)
  ),
};

// —— Translation 64 ——
const TRANSLATION_POOLS_PHASE_B = {
  global_advanced: [],
  phase_b_routines: [],
  phase_b_hobbies: [],
  phase_b_community: [],
  phase_b_technology: [],
};

function pushTrans(pool, item) {
  TRANSLATION_POOLS_PHASE_B[pool].push(t(item));
}

// G6 global_advanced: 5 basic, 5 standard, 5 advanced (5+ words for standard/advanced)
const g6Global = [
  ["basic", "phase_b_g6_glob_basic_01", "We should turn off unused lights at home", "כדאי לכבות אורות שלא בשימוש בבית"],
  ["basic", "phase_b_g6_glob_basic_02", "Our class discussed online safety rules today", "הכיתה שלנו דנה היום בכללי בטיחות ברשת"],
  ["basic", "phase_b_g6_glob_basic_03", "The speaker explained how media shapes opinions", "הדובר הסביר איך התקשורת מעצבת דעות"],
  ["basic", "phase_b_g6_glob_basic_04", "Students exchanged emails with partners abroad", "תלמידים החליפו מיילים עם שותפים בחו\"ל"],
  ["basic", "phase_b_g6_glob_basic_05", "The club plans a cultural food fair next month", "המועדון מתכנן יריד אוכל תרבותי בחודש הבא"],
  ["standard", "phase_b_g6_glob_std_01", "Reliable sources help us verify facts before we share posts online", "מקורות אמינים עוזרים לנו לאמת עובדות לפני שאנחנו משתפים פוסטים ברשת"],
  ["standard", "phase_b_g6_glob_std_02", "Climate change affects rainfall patterns in many regions around the world", "שינויי האקלים משפיעים על דפוסי גשם באזורים רבים בעולם"],
  ["standard", "phase_b_g6_glob_std_03", "Digital citizenship means respecting others when we comment on public forums", "אזרחות דיגיטלית פירושה לכבד אחרים כשאנחנו מגיבים בפורומים ציבוריים"],
  ["standard", "phase_b_g6_glob_std_04", "The debate team argued politely about whether homework should be shorter", "נבחרת הדיון טענה בנימוס האם שיעורי הבית צריכים להיות קצרים יותר"],
  ["standard", "phase_b_g6_glob_std_05", "Volunteers translated the welcome guide for visitors from several different countries", "מתנדבים תרגמו את מדריך הקבלה לאורחים ממדינות שונות"],
  ["advanced", "phase_b_g6_glob_adv_01", "If communities reduce waste, local rivers will gradually become cleaner for wildlife", "אם קהילות מצמצמות פסולת, נהרות מקומיים יהפכו בהדרגה לנקיים יותר עבור חיות בר"],
  ["advanced", "phase_b_g6_glob_adv_02", "Although the article was long, it explained how algorithms recommend videos to users", "למרות שהמאמר היה ארוך, הוא הסביר איך אלגוריתמים ממליצים סרטונים למשתמשים"],
  ["advanced", "phase_b_g6_glob_adv_03", "The ambassador encouraged students to ask critical questions during the live video call", "השגריר עודד תלמידים לשאול שאלות ביקורתיות במהלך שיחת הווידאו החיה"],
  ["advanced", "phase_b_g6_glob_adv_04", "Before publishing the podcast, we checked whether every interview quote was accurate", "לפני פרסום הפודקאסט בדקנו האם כל ציטוט בראיון היה מדויק"],
  ["advanced", "phase_b_g6_glob_adv_05", "Global cooperation is necessary when countries share research about protecting endangered species", "שיתוף פעולה עולמי הכרחי כשמדינות חולקות מחקר על הגנה על מינים בסכנת הכחדה"],
];
g6Global.forEach(([diff, pf, en, he]) =>
  pushTrans("global_advanced", { en, he, minGrade: 6, maxGrade: 6, patternFamily: pf, difficulty: diff })
);

// G2 hard routines (4)
const g2HardRoutines = [
  ["phase_b_g2_rout_hard_01", "After breakfast, I always pack my school bag carefully", "אחרי ארוחת הבוקר אני תמיד אורז את התיק בזהירות"],
  ["phase_b_g2_rout_hard_02", "My sister sometimes helps me tie my shoes before we leave", "אחותי לפעמים עוזרת לי לקשור נעליים לפני שיוצאים"],
  ["phase_b_g2_rout_hard_03", "We never forget to wash our hands before we eat lunch", "אנחנו אף פעם לא שוכחים לשטוף ידיים לפני שאוכלים צהריים"],
  ["phase_b_g2_rout_hard_04", "Dad reads us a short story when the lights go out", "אבא קורא לנו סיפור קצר כשהאורות כבים"],
];
g2HardRoutines.forEach(([pf, en, he]) =>
  pushTrans("phase_b_routines", { en, he, minGrade: 2, maxGrade: 2, patternFamily: pf, difficulty: "advanced" })
);

// G3 routines (15): 5 basic, 5 standard, 5 advanced
const g3Routines = [
  ["basic", "phase_b_g3_rout_basic_01", "I feed the cat before I go to school", "אני מאכיל את החתול לפני שאני הולך לבית ספר"],
  ["basic", "phase_b_g3_rout_basic_02", "She sets the table every evening", "היא מערכת את השולחן כל ערב"],
  ["basic", "phase_b_g3_rout_basic_03", "We take a short walk after dinner", "אנחנו הולכים בסיבוב קצר אחרי ארוחת ערב"],
  ["basic", "phase_b_g3_rout_basic_04", "He waters the plants on the balcony", "הוא מרוווה את הצמחים במרפסת"],
  ["basic", "phase_b_g3_rout_basic_05", "They practice spelling after homework time", "הם מתרגלים איות אחרי זמן שיעורי בית"],
  ["standard", "phase_b_g3_rout_std_01", "On Tuesdays, I usually help my grandma carry groceries upstairs", "בימי שלישי אני בדרך כלל עוזר לסבתא להעלות קניות למעלה"],
  ["standard", "phase_b_g3_rout_std_02", "Before bedtime, we always tidy our room and put toys away", "לפני השינה אנחנו תמיד מסדרים את החדר ומאחסנים צעצועים"],
  ["standard", "phase_b_g3_rout_std_03", "My brother rarely forgets to charge his tablet at night", "אחי לעיתים רחוקות שוכח להטעין את הטאבלט בלילה"],
  ["standard", "phase_b_g3_rout_std_04", "After the lesson, the class lines up quietly near the door", "אחרי השיעור הכיתה מתייצבת בשקט ליד הדלת"],
  ["standard", "phase_b_g3_rout_std_05", "Every Friday, Mom bakes bread and we smell it in the kitchen", "כל שישי אמא אופה לחם ואנחנו מריחים אותו במטבח"],
  ["advanced", "phase_b_g3_rout_adv_01", "If I finish my chores early, I may read an extra chapter tonight", "אם אסיים את המטלות מוקדם, אולי אקרא פרק נוסף הלילה"],
  ["advanced", "phase_b_g3_rout_adv_02", "While Dad cooked soup, I practiced the recorder in my room", "בזמן שאבא בישל מרק, תרגלתי בחדר על חלילית"],
  ["advanced", "phase_b_g3_rout_adv_03", "Nobody in our house leaves dishes in the sink overnight anymore", "אף אחד בבית שלנו לא משאיר כלים בכיור בלילה יותר"],
  ["advanced", "phase_b_g3_rout_adv_04", "We sometimes ride bikes to the park when the weather is cool", "לפעמים אנחנו רוכבים על אופניים לפארק כשמזג האוויר נעים"],
  ["advanced", "phase_b_g3_rout_adv_05", "Before the test, she always reviews her notes with a highlighter", "לפני המבחן היא תמיד חוזרת על הרשימות עם מדגש"],
];
g3Routines.forEach(([diff, pf, en, he]) =>
  pushTrans("phase_b_routines", { en, he, minGrade: 3, maxGrade: 3, patternFamily: pf, difficulty: diff })
);

// G4 hobbies (15)
const g4Hobbies = [
  ["basic", "phase_b_g4_hob_basic_01", "I enjoy drawing comics in my notebook", "אני נהנה לצייר קומיקס במחברת"],
  ["basic", "phase_b_g4_hob_basic_02", "She plays chess with her grandfather", "היא משחקת שחמט עם סבא"],
  ["basic", "phase_b_g4_hob_basic_03", "We collect interesting stamps from other countries", "אנחנו אוספים בולים מעניינים ממדינות אחרות"],
  ["basic", "phase_b_g4_hob_basic_04", "He builds small models with recycled cardboard", "הוא בונה דגמים קטנים מקרטון ממוחזר"],
  ["basic", "phase_b_g4_hob_basic_05", "They practice juggling after school on Wednesdays", "הם מתרגלים ג'גלינג אחרי בית ספר בימי רביעי"],
  ["standard", "phase_b_g4_hob_std_01", "My hobby is learning simple songs on the keyboard during winter breaks", "התחביב שלי הוא ללמוד שירים פשוטים על הקלידים בחופשת החורף"],
  ["standard", "phase_b_g4_hob_std_02", "She prefers painting landscapes because colors help her relax after tests", "היא מעדיפה לצייר נופים כי צבעים עוזרים לה להירגע אחרי מבחנים"],
  ["standard", "phase_b_g4_hob_std_03", "We joined a photography club that meets near the old city walls", "הצטרפנו למועדון צילום שנפגש ליד חומות העיר העתיקה"],
  ["standard", "phase_b_g4_hob_std_04", "He often fixes broken bikes for neighbors who cannot ride to school", "הוא לעיתים קרובות מתקן אופניים שבורים לשכנים שלא יכולים לרכוב לבית ספר"],
  ["standard", "phase_b_g4_hob_std_05", "They sometimes bake muffins and share them with friends at the library", "לפעמים הם אופים מאפינס וחולקים אותם עם חברים בספרייה"],
  ["advanced", "phase_b_g4_hob_adv_01", "Although the puzzle was difficult, we finished it together on Saturday morning", "למרות שהפאזל היה קשה, סיימנו אותו יחד בבוקר שבת"],
  ["advanced", "phase_b_g4_hob_adv_02", "If you practice dribbling daily, you will improve before the next tournament", "אם תתרגל כדרור כל יום, תשתפר לפני הטורניר הבא"],
  ["advanced", "phase_b_g4_hob_adv_03", "Nobody expected our robot kit to win the school creativity award", "אף אחד לא ציפה שערכת הרובוט שלנו תזכה בפרס היצירתיות"],
  ["advanced", "phase_b_g4_hob_adv_04", "While I sketched the harbor, seagulls circled above the fishing boats", "בזמן ששרטטי את הנמל, שחפים עפו מעל סירות הדיג"],
  ["advanced", "phase_b_g4_hob_adv_05", "We have never tried pottery, but we might sign up for a workshop soon", "מעולם לא ניסינו קדרות, אבל אולי נירשם לסדנה בקרוב"],
];
g4Hobbies.forEach(([diff, pf, en, he]) =>
  pushTrans("phase_b_hobbies", { en, he, minGrade: 4, maxGrade: 4, patternFamily: pf, difficulty: diff })
);

// G5 community (8) + technology (7) = 15 for g5
const g5Community = [
  ["basic", "phase_b_g5_com_basic_01", "The library opens early on school days", "הספרייה נפתחת מוקדם בימי לימודים"],
  ["basic", "phase_b_g5_com_basic_02", "Volunteers cleaned the neighborhood park last Sunday", "מתנדבים ניקו את הפארק השכונתי ביום ראשון שעבר"],
  ["basic", "phase_b_g5_com_basic_03", "Our class planted trees near the community center", "הכיתה שלנו נטעה עצים ליד המרכז הקהילתי"],
  ["standard", "phase_b_g5_com_std_01", "The mayor thanked families who donated books to the public library", "ראש העיר הודה למשפחות שתרמו ספרים לספרייה הציבורית"],
  ["standard", "phase_b_g5_com_std_02", "Students designed posters that encourage people to recycle plastic bottles", "תלמידים עיצבו פוסטרים שמעודדים אנשים למחזר בקבוקי פלסטיק"],
  ["standard", "phase_b_g5_com_std_03", "Neighbors organized a food drive for families who needed extra support", "שכנים ארגנו מבצע איסוף מזון למשפחות שהיו זקוקות לתמיכה"],
  ["advanced", "phase_b_g5_com_adv_01", "If more residents vote, the city council will hear diverse opinions about parks", "אם יותר תושבים יצביעו, מועצת העיר תשמע דעות מגוונות על פארקים"],
  ["advanced", "phase_b_g5_com_adv_02", "Although the meeting was long, teenagers presented ideas for safer crosswalks", "למרות שהפגישה הייתה ארוכה, בני נוער הציגו רעיונות למעברים בטוחים יותר"],
];
g5Community.forEach(([diff, pf, en, he]) =>
  pushTrans("phase_b_community", { en, he, minGrade: 5, maxGrade: 5, patternFamily: pf, difficulty: diff })
);

const g5Tech = [
  ["basic", "phase_b_g5_tech_basic_01", "Please charge the tablet before the online lesson", "בבקשה טענו את הטאבלט לפני השיעור המקוון"],
  ["basic", "phase_b_g5_tech_basic_02", "Save your document before you close the laptop", "שמרו את המסמך לפני שסוגרים את המחשב"],
  ["standard", "phase_b_g5_tech_std_01", "Always use a strong password when you create a new account online", "תמיד השתמשו בסיסמה חזקה כשיוצרים חשבון חדש ברשת"],
  ["standard", "phase_b_g5_tech_std_02", "The teacher showed us how to cite websites in our research project", "המורה הראתה לנו איך לצטט אתרים בפרויקט המחקר"],
  ["advanced", "phase_b_g5_tech_adv_01", "If the Wi-Fi fails, we will continue the lesson using printed worksheets", "אם ה-Wi-Fi נכשל, נמשיך את השיעור עם דפי עבודה מודפסים"],
  ["advanced", "phase_b_g5_tech_adv_02", "Before sharing a photo, ask whether everyone in the picture agrees", "לפני שמשתפים תמונה, שאלו האם כולם בתמונה מסכימים"],
  ["advanced", "phase_b_g5_tech_adv_03", "Students learned to spot misleading headlines during the media literacy workshop", "תלמידים למדו לזהות כותרות מטעות במהלך סדנת אוריינות מדיה"],
];
g5Tech.forEach(([diff, pf, en, he]) =>
  pushTrans("phase_b_technology", { en, he, minGrade: 5, maxGrade: 5, patternFamily: pf, difficulty: diff })
);

// G3 hobbies overlap for dedup (0 extra) — plan puts g3 in routines only (15). hobbies g3-g4: add 0 g3 to hobbies
// Need 64 total check

function countGrammar() {
  return Object.values(grammarItems).reduce((s, arr) => s + arr.length, 0);
}

function countTrans() {
  return Object.values(TRANSLATION_POOLS_PHASE_B).reduce((s, arr) => s + arr.length, 0);
}

const grammarTotal = countGrammar();
const sentenceTotal = SENTENCE_POOLS_PHASE_B.assigned_sentence_mcq.length;
const transTotal = countTrans();

if (grammarTotal !== 62) throw new Error(`Grammar count ${grammarTotal}, expected 62`);
if (sentenceTotal !== 40) throw new Error(`Sentence count ${sentenceTotal}, expected 40`);
if (transTotal !== 64) throw new Error(`Translation count ${transTotal}, expected 64`);

// Check unique en in translation
const allEn = [];
for (const arr of Object.values(TRANSLATION_POOLS_PHASE_B)) {
  for (const item of arr) {
    if (allEn.includes(item.en)) throw new Error(`Duplicate en: ${item.en}`);
    allEn.push(item.en);
  }
}

function serializePools(name, pools) {
  const keys = Object.keys(pools);
  const lines = [`// Phase B English ${name} — assigned-activity MCQ expansion (do not merge into base pools until wired).`, `export const ${name} = {`];
  for (const key of keys) {
    lines.push(`  "${key}": [`);
    for (const item of pools[key]) {
      lines.push(`    ${JSON.stringify(item, null, 2).split("\n").join("\n    ")},`);
    }
    lines.push("  ],");
  }
  lines.push("};", "");
  return lines.join("\n");
}

writeFileSync(
  join(root, "data/english-questions/grammar-pools-phase-b.js"),
  serializePools("GRAMMAR_POOLS_PHASE_B", grammarItems)
);

console.log("Wrote Phase B pools:", { grammarTotal, sentenceTotal, transTotal });
console.log("Grammar by pool:", Object.fromEntries(Object.entries(grammarItems).map(([k, v]) => [k, v.length])));
console.log("Translation by pool:", Object.fromEntries(Object.entries(TRANSLATION_POOLS_PHASE_B).map(([k, v]) => [k, v.length])));
