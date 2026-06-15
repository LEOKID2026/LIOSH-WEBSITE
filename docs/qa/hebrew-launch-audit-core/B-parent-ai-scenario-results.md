# B - Parent AI/Copilot Scenario Results

תאריך: 2026-06-15  
מטרה: בדיקת תרחישי Copilot/AI/Report parent-facing בלבד, ללא שינוי קוד מוצר.

## 1. אין נתונים בכלל

- input: payload ללא `topicRecommendations` anchored וללא aggregate practice.
- gate/threshold: `buildTruthPacketV1`: אם `!listAllAnchoredTopicRows(payload).length && !hasAggregatePracticeEvidence(payload)` אז fallback. ב-fallback: `cannotConcludeYet=true`, `recommendationEligible=false`, `recommendationIntensityCap=RI0`.
- פלט צפוי/אפשרי: “כרגע אין מספיק נתוני תרגול...” וגם “כדאי לצבור עוד תרגול קצר לפני מסקנה: 10 דקות חזרה... 5-8 שאלות...”.
- האם תקין: לא.
- למה לא תקין: קיימת פעולה קונקרטית למרות שהחוזה אוסר recommendation.
- האם BLOCKER: כן.

## 2. מקצוע בלי שאלות

- input: parent asks על מקצוע קיים, `subjectQuestionCount=0`.
- gate/threshold: `classifySubjectEvidenceTier(0)=none`; `resolveAnswerContract` מחזיר `zero_evidence`.
- פלט צפוי/אפשרי: “בתקופה שנבחרה לא נאספו נתוני תרגול ב[מקצוע], ולכן אי אפשר לקבוע כיוון לפי הדוח הנוכחי.”
- האם תקין: כן, אם המסלול לא נופל ל-executive fallback.
- למה לא תקין: לא זוהה כשל במסלול הזה עצמו.
- האם BLOCKER: לא.

## 3. 3 שאלות בלבד

- input: topic row עם `questions=3`, parent asks “מה הקושי?”.
- gate/threshold: matrix: `1-4=insufficient`; diagnostic: `q<4 && w<2 => insufficient_data`; Copilot polarity thin.
- פלט צפוי/אפשרי: “יש 3 שאלות... עדיין מעט נתון”; “נכון לעכשיו כדאי לאסוף עוד תרגול לפני החלטה.”
- האם תקין: חלקית.
- למה לא תקין: cautious wording תקין, אבל כל צעד תרגול קונקרטי צריך להיות data-collection בלבד ולא המלצה מותאמת.
- האם BLOCKER: לא, אלא אם מוצג כתכנית אישית.

## 4. 8 שאלות

- input: topic row עם `questions=8`, accuracy בינוני/נמוך.
- gate/threshold: matrix: `INSIGHT_MIN=8`; Copilot: `STRONG_Q_MIN=8`, weak אם `acc<=54`, strong אם `acc>=75`.
- פלט צפוי/אפשרי: “הדבר המרכזי שדורש תשומת לב...” או “מה שעובד יחסית טוב...”.
- האם תקין: לא לגמרי.
- למה לא תקין: 8 שאלות הן insight, אך Copilot עשוי לסמן חולשה/חוזק יחסית בלי hedge מספיק.
- האם BLOCKER: לא תמיד; HIGH risk.

## 5. 12 שאלות

- input: topic row עם `questions=12`, כולל טעויות רלוונטיות.
- gate/threshold: matrix: `STRONG_MIN=12`; diagnostic: `q>=12 && wrong>=2 => moderate`; decision gates: q<12 weak, q=12 כבר לא weak לפי q.
- פלט צפוי/אפשרי: “חיזוק ממוקד לפי הדוח”, “מסקנה סבירה אך לא סופית”.
- האם תקין: תלוי recurrence.
- למה לא תקין: אם recurrence/טעויות לא מוצגים להורה, ההמלצה נראית חזקה מדי.
- האם BLOCKER: לא אם recurrence מוצג; אחרת HIGH.

## 6. 24 שאלות

- input: q=24, accuracy high.
- gate/threshold: Copilot-only `MASTERY_REALLOCATION_Q_MIN=24`.
- פלט צפוי/אפשרי: “נראה שיש שליטה... כדאי לשקול להפנות חלק מזמן התרגול לנושא אחר...”.
- האם תקין: לא לגמרי.
- למה לא תקין: threshold לא נמצא במטריצה הרשמית ואינו מוסבר להורה.
- האם BLOCKER: לא, MEDIUM.

## 7. דיוק נמוך אבל מעט שאלות

- input: q=1-4, accuracy low.
- gate/threshold: matrix insufficient; diagnostic insufficient/withheld; `unitRequiresShortThinOverviewHedge`.
- פלט צפוי/אפשרי: “מידע מועט בנושא — כדאי להמשיך בתרגול לפני שקובעים כיוון חד משמעי.”
- האם תקין: כן אם נשאר hedge בלבד.
- למה לא תקין: לא תקין אם layer אחר מוסיף “קושי חוזר” או המלצה קונקרטית.
- האם BLOCKER: לא במסלול התקין.

## 8. דיוק נמוך והרבה שאלות

- input: q>=40, accuracy low, wrong/recurrence קיימים.
- gate/threshold: diagnostic `q>=40 => high`; output gating מאפשר intervention אם priority/recurrence מתאימים.
- פלט צפוי/אפשרי: “חיזוק ממוקד לפני קידום”; “כדאי לתרגל...”.
- האם תקין: כן עקרונית.
- למה לא תקין: אם parent sees raw “ביטחון גבוה ועדיפות מאשרות כיוון התערבות” או gating internals, זה לא תקין.
- האם BLOCKER: לא לתוכן, כן אם leakage קיים.

## 9. דיוק גבוה והרבה שאלות

- input: q>=40, accuracy>=78.
- gate/threshold: diagnostic high; positive strength profile; report strength rows.
- פלט צפוי/אפשרי: “על סמך 40 שאלות בנושא, נראית שליטה יציבה...”.
- האם תקין: כן.
- למה לא תקין: fallback strength body ללא q “ביצועים גבוהים ועקביים” פחות מגובה אם evidenceTrace חסר.
- האם BLOCKER: לא.

## 10. פעילות אישית בלבד

- input: evidence source `parent_assigned_activity`.
- gate/threshold: `evidenceSourcePhraseHe(parent_assigned_activity)=""`.
- פלט צפוי/אפשרי: אין מקור ראיה גלוי.
- האם תקין: חלקית.
- למה לא תקין: ההורה לא מבין על מה ההמלצה מבוססת; source מוסתר לגמרי.
- האם BLOCKER: לא; MEDIUM.

## 11. פעילות ספר בלבד

- input: evidence source `learning_book`.
- gate/threshold: source map.
- פלט צפוי/אפשרי: “לאחר עבודה בספר”.
- האם תקין: כן.
- למה לא תקין: אין כשל מרכזי.
- האם BLOCKER: לא.

## 12. תרגול עצמי בלבד

- input: evidence source `self_practice`.
- gate/threshold: source map.
- פלט צפוי/אפשרי: “בתרגול עצמאי”.
- האם תקין: כן.
- למה לא תקין: אין כשל מרכזי.
- האם BLOCKER: לא.

## 13. Mixed evidence

- input: אותו נושא בכמה רמות כיתה או מקורות שונים.
- gate/threshold: `gradeSplitTopicRowKeys.length>=2`; `gradeSplitNarrativeHe`.
- פלט צפוי/אפשרי: “באותו נושא יש תרגול בכמה רמות כיתה — ... הקו החלש יותר הוא...”.
- האם תקין: כן בזהירות.
- למה לא תקין: עלול להיות טכני; חייב לא להציג row keys או source ids.
- האם BLOCKER: לא.

## 14. הורה שואל שאלה לא קשורה

- input: “מה מזג האוויר?”.
- gate/threshold: `offTopicSignal>=0.4 && !hasStrongReportToken`.
- פלט צפוי/אפשרי: “אפשר לשאול כאן שאלות על הדוח והתקדמות הלמידה...”.
- האם תקין: כן.
- למה לא תקין: לא זוהה כשל אם validator מונע report-data contamination.
- האם BLOCKER: לא.

## 15. הורה שואל “הילד שלי חלש?”

- input: utterance עם “חלש”.
- gate/threshold: weakness category/report related; `TOPIC_PROBLEM_RE`; weak topic selection q>=8 acc<=54.
- פלט צפוי/אפשרי: “הדבר המרכזי שדורש תשומת לב כרגע הוא...”; “נראה קושי חוזר...”.
- האם תקין: לא לגמרי.
- למה לא תקין: צריך להימנע מלענות על הילד כ-“חלש”; יש לדבר על שורה בדוח, כמות שאלות, ודיוק.
- האם BLOCKER: לא תמיד; HIGH.

## 16. הורה שואל “מה לעשות השבוע?”

- input: weekly/home practice utterance.
- gate/threshold: `HOME_PRACTICE_RE`; `recommendationEligible`; executive plan thresholds `globalQ<90`, `STRONG_GLOBAL_QUESTION_FLOOR`.
- פלט צפוי/אפשרי: “3 פעמים בשבוע, כ-10 דקות... 5-8 שאלות...”.
- האם תקין: לא.
- למה לא תקין: יש מסלולים שמייצרים תכנית קונקרטית גם כש-`recommendationEligible=false` או כשהטקסט יושב בתוך `meaning` ולא `next_step`.
- האם BLOCKER: כן.

## 17. הורה שואל על מקצוע שאין בו נתונים

- input: “מה עם אנגלית?” כש-English q=0.
- gate/threshold: subject tier none או off_report_subject_clarification.
- פלט צפוי/אפשרי: “אין כרגע נתונים על הנושא/מקצוע ששאלת עליו...”.
- האם תקין: כן.
- למה לא תקין: לא זוהה כשל אם route נכון.
- האם BLOCKER: לא.

## 18. מנוע מחזיר internal labels

- input: diagnostic units/cards serialized.
- gate/threshold: אין gate מספיק ב-report object; sanitizer חלקי.
- פלט צפוי/אפשרי: `label=topic:...`, taxonomy id, `source.unitId`, `topicEngineRowSignals.gating`.
- האם תקין: לא.
- למה לא תקין: labels ושדות debug/internal עלולים להגיע ללקוח או PDF/API.
- האם BLOCKER: כן.

## 19. fallback מופעל

- input: LLM disabled/invalid או אין anchors.
- gate/threshold: validator fallback; no-anchor fallback; `fallbackUsed` rules.
- פלט צפוי/אפשרי: fallback contract_slot/composed; no-anchor action-like uncertainty.
- האם תקין: לא במסלול no-anchor.
- למה לא תקין: fallback אמור להיות conservative, אבל כולל פעולה קונקרטית.
- האם BLOCKER: כן.

## 20. sanitizer אמור לנקות פלט

- input: public report payload containing internal keys/ids.
- gate/threshold: `INTERNAL_PARENT_REPORT_KEYS` + `INTERNAL_TAXONOMY_VALUE_RES`.
- פלט צפוי/אפשרי: known keys removed, but `label`, `source`, `topicEngineRowSignals`, `topic:*`, `dc:*` may remain.
- האם תקין: לא.
- למה לא תקין: denylist לא מכסה את כל schema parent-facing; צריך allowlist.
- האם BLOCKER: כן.

## רשימת BLOCKERS מהתרחישים

- Scenario 1: no-data fallback נותן פעולה קונקרטית תחת `RI0`.
- Scenario 16: weekly plan יכול להופיע גם כשאין eligibility מלא.
- Scenario 18: internal labels / source / gating עלולים להופיע.
- Scenario 19: fallback route אינו conservative מספיק.
- Scenario 20: sanitizer חלקי ואינו schema allowlist.
- ממצא משלים: AI insight packet יכול לייצר strength/focus כבר ב-3-4 שאלות, מתחת ל-`INSIGHT_MIN=8`.
- ממצא משלים: grade-aware recommendation templates עם null Hebrew defaults עלולות להפעיל engine fallback לא מאושר.
- ממצא משלים: short report ו-detailed report משתמשים ב-`summaryHe` fallback שונה לאותו מצב נתונים.

## ממצאי סוכנים משלימים

לאחר סיום החקירה המקבילה, נוספו שלושה סיכוני השקה רוחביים שאינם תרחיש משתמש יחיד, אבל משפיעים על התרחישים 3-6 ו-16:

- `utils/parent-report-insights/derive-topic-insights.js`: strength/focus thresholds עצמאיים (`4` שאלות ל-strength, `3` ל-focus) נמוכים ממטריצת `PARENT_EVIDENCE_VOLUME`. זה מחמיר את תרחישי מעט-נתונים כי AI narrative עלול להפוך מדגם קטן ל”יציב” או “מוקד”.
- `utils/parent-report-insights/derive-data-confidence.js`: טווחי confidence עצמאיים (`thin<6`, `moderate<12`, `strong>=40`) אינם אחד-לאחד עם `5-7 preliminary`, `8-11 insight`, `12+ strong`. זה יכול לגרום ל-copy סותר בין AI narrative לבין report/Copilot.
- `utils/parent-report-language/grade-aware-recommendation-templates.js`: templates רבים משאירים `actionTextHe`/`goalTextHe` ריקים ומצהירים על engine fallback. לפני השקה צריך להחליט חסימה או אישור לכל fallback כזה.

