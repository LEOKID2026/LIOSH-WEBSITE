# Site Decision Hebrew Copy Inventory — Summary

Generated: 2026-05-29T15:26:52.910Z

## Counts

| Metric | Value |
|--------|------:|
| Files scanned | 186 |
| Hebrew strings/templates (decision-relevant) | 2094 |
| Decision-visible | 1779 |
| Internal-only | 66 |
| Prompt-internal (AI) | 2 |
| Needs review | 247 |
| AI/prompt related | 1088 |
| Diagnostic + recommendation related | 444 |
| Student feedback related | 210 |
| Permission/validation related | 99 |
| Owner review candidates | 393 |

## Top 30 highest-risk decision-impacting phrases

1. **high** [mixed_or_unclear/other] — `החלפת קוד PIN` (lib/platform-ui/hebrew-display-labels.js:85)
2. **high** [parent/validation_error] — `PIN לא תקין` (pages/api/parent/create-student-access-code.js:38)
3. **high** [parent/ai_answer] — `עדיין אין מספיק נתונים כדי להסיק מסקנה חזקה. כדאי לבדוק שוב אחרי עוד תרגול.` (utils/parent-copilot/contract-reader.js:269)
4. **high** [parent/ai_answer] — `עצירת קידום ברמה קשורה בדרך כלל לניסוח שעדיין לא נסגר בדוח — לא בהכרח כישלון.` (utils/parent-copilot/direct-answer-openers.js:54)
5. **high** [parent/ai_answer] — `ב${label} יש ${questions} שאלות בלבד — עדיין מוקדם לסגור מסקנה חזקה.` (utils/parent-copilot/evidence-polarity.js:48)
6. **high** [parent/ai_answer] — `יש כרגע מעט נתוני תרגול, ולכן אין עדיין מספיק מידע למסקנה חזקה.` (utils/parent-copilot/index.js:163)
7. **high** [parent/ai_answer] — `ב${displayName} יש עדיין מעט תרגול (${q} שאלות) — מוקדם לסגור מסקנה חדה.` (utils/parent-copilot/intent-answer-composers.js:377)
8. **high** [parent/ai_answer] — `החלטה של קידום מול המתנה טובה כשהיא נשענת על אותם אותות שבדוח, לא על תחושת בטן בלבד.` (utils/parent-copilot/parent-coaching-packs.js:126)
9. **high** [parent/ai_answer] — `ירידה` (utils/parent-copilot/question-classifier.js:121)
10. **high** [parent/ai_answer] — `בדוח אין כרגע מספיק שאלות מעוגנות כדי לענות בצורה מדויקת — הנתונים עדיין מצומצמים ומוקדם למסקנה חזקה…` (utils/parent-copilot/scope-resolver.js:468)
11. **high** [parent/ai_answer] — `בדוח יש נושאים שעדיין בלי בסיס מספיק להחלטת קידום, בהם: ${blocked.slice(0, 3).map(labelPair).join(" …` (utils/parent-copilot/truth-packet-v1.js:589)
12. **high** [parent/ai_answer] — `לפי הניסוחים המעוגנים, לא נחשפה עכשיו חסימת קידום חדה אצל כל הנקודות המדודות — עדיין חשוב לעקוב לפני…` (utils/parent-copilot/truth-packet-v1.js:590)
13. **high** [parent/ai_answer] — `כשמסלול הקידום לא מתעדכן, זה בדרך כלל משקף שחלק מהניסוחים עדיין לא סוגרים מספיק — במיוחד סביב: ${nam…` (utils/parent-copilot/truth-packet-v1.js:595)
14. **high** [parent/ai_answer] — `יש כרגע מעט נתוני תרגול, כלומר נפח הנתונים עדיין מצומצם ואין עדיין מספיק מידע למסקנה חזקה.` (utils/parent-copilot/truth-packet-v1.js:749)
15. **high** [parent/ai_answer] — `יש כרגע מעט נתוני תרגול בדוח — נפח הנתונים עדיין קטן יחסית, ולכן התמונה כללית עדיין חלקית; כדאי לצבו…` (utils/parent-copilot/truth-packet-v1.js:796)
16. **high** [mixed_or_unclear/next_step] — `תרגול קצר וחוזר — בלי ציפייה להעברה מהירה.` (utils/topic-next-step-phase2.js:683)
17. **high** [mixed_or_unclear/next_step] — `חשש מקידום מוקדם` (utils/topic-next-step-phase2.js:1194)
18. **medium** [mixed_or_unclear/other] — `מיפוי לפי מבנה דף האנגלית באתר ומול מסגרת POP של אנגלית יסודי, עם הצלבה לעותק התוכנית (Curriculum202…` (pages/learning/curriculum.js:64)
19. **medium** [student/other] — `בדוק מה מתאים: I/You/We/They = are, He/She/It = is` (pages/learning/english-master.js:265)
20. **medium** [student/other] — `נבדוק מה מתאים לפי כללי הדקדוק: I/You/We/They = are, He/She/It = is.` (pages/learning/english-master.js:381)
21. **medium** [student/other] — `נפרק את המשפט לחלקים ונחשוב איך אומרים כל חלק באנגלית.` (pages/learning/english-master.js:415)
22. **medium** [student/other] — `בדוק שוב את כללי הדקדוק: I am, You/We/They are, He/She/It is.` (pages/learning/english-master.js:449)
23. **medium** [student/other] — `בדוק שוב: האם המילה שבחרת מתאימה לנושא המשפט? זכור: I/You/We/They = are, He/She/It = is.` (pages/learning/english-master.js:455)
24. **medium** [student/other] — `כנראה שטעית באיות (spelling). בדוק שוב אות-אחר-אות, שים לב ל־th / sh / ch ולסיום המילה (s / ed / ing…` (pages/learning/english-master.js:458)
25. **medium** [student/other] — `לחץ על 💡 Hint כדי לקבל רמז, ועל "📘 הסבר מלא" כדי לראות פתרון צעד־אחר־צעד.` (pages/learning/english-master.js:3612)
26. **medium** [student/progression] — `ניקוד גבוה, רצף תשובות נכון, כוכבים ו־Badges עוזרים לך לעלות רמה כשחקן.` (pages/learning/english-master.js:3613)
27. **medium** [student/progression] — `ניקוד גבוה, רצף תשובות נכון, כוכבים ו־Badges עוזרים לך לעלות רמה כשחקן.` (pages/learning/geometry-master.js:3782)
28. **medium** [student/other] — `לחץ על 💡 Hint כדי לקבל רמז, ועל "📘 הסבר מלא" כדי לראות פתרון צעד־אחר־צעד.` (pages/learning/hebrew-master.js:4386)
29. **medium** [student/progression] — `ניקוד גבוה, רצף תשובות נכון, כוכבים ו־Badges עוזרים לך לעלות רמה כשחקן.` (pages/learning/hebrew-master.js:4387)
30. **medium** [student/progression] — `ניקוד גבוה, רצף תשובות נכון, כוכבים ו־Badges עוזרים לך לעלות רמה כשחקן.` (pages/learning/math-master.js:6095)

## Excluded from this scan

Regular parent report copy, teacher/school report copy (prior inventories), live classroom docs, student games/coins, review-packages, test-only scripts.

## Notes

- No product source code modified.
- Excel: `reports/site-decision-hebrew-copy-inventory.xlsx`
