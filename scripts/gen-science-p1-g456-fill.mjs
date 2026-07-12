#!/usr/bin/env node
/**
 * Generates data/science-questions-p1-g456-fill.js — P1 Science G4–G6 blockers.
 * Run: node scripts/gen-science-p1-g456-fill.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "science-questions-p1-g456-fill.js");

/** @typedef {[string, string[], number, string, string, string?, string?]} Row */
/** @type {Record<string, { subtype: string, rows: Row[] }>} */
const CELLS = {};
function add(key, subtype, rows) {
  CELLS[key] = { subtype, rows };
}

const opts4 = (a, b, c, d) => [a, b, c, d];

// ——— G4 ———
add("g4:body:easy", "sci_body_general", [
  ["מה תפקיד העיכול במערכת הגוף?", opts4("לפרק מזון ולסייע בספיגה", "לייצר חמצן ישירות", "להחליף את הריאות", "לשמור על שלד בלבד"), 0, "מערכת העיכול מפרקת וסופגת חומרי מזון.", "g4_body_digest_easy_a", "basic", "understanding"],
  ["איזה איבר מסייע לחילוף גזים עם האוויר?", opts4("ריאות", "קיבה", "עצמות", "שיער"), 0, "הריאות מחליפות גזים.", "g4_body_lungs_easy_b", "basic", "recall"],
  ["למה חשוב לשמור על שיניים נקיות?", opts4("למנוע עששת ומחלות בפה", "כדי שלא נצטרך לישון", "כדי לחזק את השלד", "כדי שלא ננשום"), 0, "היגיינת פה מונעת מחלות.", "g4_body_teeth_easy_c", "basic", "understanding"],
  ["מה עושה הלב בגוף?", opts4("מזרים דם לרקמות", "מעכל מזון", "מסנן אור", "מחליף עור"), 0, "הלב הוא משאבת דם.", "g4_body_heart_easy_d", "basic", "recall"],
]);

add("g4:body:hard", "sci_body_general", [
  ["מה קורה לדופק בזמן ריצה קצרה?", opts4("לרוב עולה ואז יורד בהדרגה", "נעצר לחלוטין", "אינו משתנה", "נקבע רק על ידי צבע הבגד"), 0, "מאמץ מגביר דופק.", "g4_body_pulse_hard_a", "advanced", "application"],
  ["מה תפקיד הדם במערכת הנשימה?", opts4("מוביל חמצן לרקמות", "מייצר אור", "מעכל ירקות", "מחליף שרירים"), 0, "דם נושא חמצן.", "g4_body_blood_o2_hard_b", "advanced", "understanding"],
  ["למה שרירים זקוקים לחמצן?", opts4("לשחרור אנרגיה בפעילות", "לעיכול עצמות", "לייצור שיער", "להאזנה"), 0, "חמצן נחוץ לשריר.", "g4_body_muscle_o2_hard_c", "advanced", "application"],
  ["מה קשר בין מערכת העצבים לחושים?", opts4("מעבירה מידע מהחושים למוח", "מעכלת מזון", "מייצרת דם", "מחליפה ריאות"), 0, "עצבים מקשרים חושים למוח.", "g4_body_nerves_hard_d", "advanced", "understanding"],
  ["מה תפקיד הכליות?", opts4("מסננות דם ומווסתות נוזלים", "מייצרות חמצן", "שומעות צלילים", "מעכלות לחם"), 0, "כליות מסננות ומאזנות.", "g4_body_kidney_hard_e", "advanced", "recall"],
  ["למה חשוב חימום לפני פעילות?", opts4("מכין שרירים ומפרקים", "מבטל נשימה", "מחליף שינה", "סוגר את הלב"), 0, "חימום מפחית פציעות.", "g4_body_warmup_hard_f", "advanced", "application"],
]);

add("g4:experiments:easy", "sci_experiments_general", [
  ["מהי השערה?", opts4("חיזוי שניתן לבדוק", "תוצאה סופית", "מחיקת נתונים", "ציור בלבד"), 0, "השערה נבדקת בניסוי.", "g4_exp_hyp_easy_a", "basic", "recall"],
  ["למה רושמים תוצאות בטבלה?", opts4("להשוות ולזהות דפוסים", "למחוק", "לא לחזור", "לשנות הכל"), 0, "תיעוד מסייע בניתוח.", "g4_exp_table_easy_b", "basic", "understanding"],
  ["מה כלי מדידה למדידת אורך?", opts4("סרגל", "מדחום", "משקל", "שעון מעורר"), 0, "אורך נמדד בסרגל.", "g4_exp_ruler_easy_c", "basic", "recall"],
  ["מה משתנה מבוקר?", opts4("משתנה אחד", "הכל יחד", "שום דבר", "רק שם"), 0, "בידוד משתנה.", "g4_exp_variable_easy_d", "basic", "understanding"],
  ["למה לא טועמים חומר לא ידוע?", opts4("עלול להיות מסוכן", "חובה", "משפר תוצאות", "מחליף מדידה"), 0, "בטיחות בניסוי.", "g4_exp_safety_easy_e", "basic", "application"],
  ["מה תפקיד קבוצת ביקורת?", opts4("השוואה ללא שינוי", "מחיקה", "שינוי הכל", "לא נחוץ"), 0, "ביקורת מבודדת.", "g4_exp_control_easy_f", "basic", "understanding"],
]);

add("g4:experiments:hard", "sci_experiments_general", [
  ["למה חוזרים על מדידה?", opts4("לזהות טעויות ופיזור", "מיותר תמיד", "מדידה אחת מספיקה", "משנה מטרה"), 0, "חזרות משפרות אמינות.", "g4_exp_repeat_hard_a", "advanced", "understanding"],
  ["מה טעות מדידה?", opts4("הבדל בין מדידה לערך אמיתי", "תמיד אפס", "רק שם", "רק צבע"), 0, "טעויות קיימות.", "g4_exp_error_hard_b", "advanced", "understanding"],
  ["למה יחידות חשובות?", opts4("להשוואה נכונה", "לא חשוב", "רק ציור", "רק שם"), 0, "יחידות מאפשרות השוואה.", "g4_exp_units_hard_c", "advanced", "understanding"],
  ["מה מסקנה מבוססת נתונים?", opts4("נתמכת בתוצאות", "לפי רגש", "בלי ניסוי", "אקראית"), 0, "ראיות תומכות.", "g4_exp_conclude_hard_d", "advanced", "application"],
  ["מה הבדל תצפית לניסוי?", opts4("ניסוי בודק משתנה מבוקר", "אין הבדל", "תצפית משנה הכל", "ניסוי לא דורש רישום"), 0, "ניסוי מבודד משתנה.", "g4_exp_obs_exp_hard_e", "advanced", "application"],
]);

add("g4:animals:easy", "sci_animals_general", [
  ["מה מאפיין דג?", opts4("חי במים עם זימים", "עף", "מחמל בפרווה", "אין זנב"), 0, "דג מותאם למים.", "g4_anim_fish_easy_a", "basic", "recall"],
  ["מה מחזור חיים של פרפר?", opts4("ביצה, זחל, גולם, בוגר", "רק בוגר", "אין שלבים", "רק ביצה"), 0, "גלגול מלא.", "g4_anim_butterfly_easy_b", "basic", "understanding"],
  ["מה עושה דבורה לצמחים?", opts4("מאבקת", "אוכלת עצים", "שוחה", "מייצרת דם"), 0, "האבקה.", "g4_anim_bee_easy_c", "basic", "understanding"],
  ["מה מאפיין יונק?", opts4("מינק ופרווה לרוב", "זימים", "גלגול דג", "אין חום"), 0, "יונקים מחמלים.", "g4_anim_mammal_easy_d", "basic", "recall"],
  ["מה אוכלת פרה?", opts4("עשב", "בשר", "דגים", "אבנים"), 0, "פרה צמחונית.", "g4_anim_cow_easy_e", "basic", "recall"],
  ["למה לציפור יש מקור?", opts4("לאכילה ובניית קן", "לשחייה", "לנשימה במים", "לייצור חמצן"), 0, "מקור מותאם.", "g4_anim_beak_easy_f", "basic", "understanding"],
]);

add("g4:animals:hard", "sci_animals_general", [
  ["מה קורה כשמצמצמים טורף פסגה?", opts4("אוכלוסיית טרף עלולה לגדול", "אין השפעה", "צמחים נעלמים", "הכל נשאר"), 0, "טורפים מאזנים רשת.", "g4_anim_predator_hard_a", "advanced", "application"],
  ["מה התאמת גמל למדבר?", opts4("שומר מים וסובל חום", "חי במים מתוקים", "אין התאמה", "אוכל בשר בלבד"), 0, "גמל מותאם ליובש.", "g4_anim_camel_hard_b", "advanced", "application"],
  ["למה הסוואה עוזרת?", opts4("מקטינה זיהוי", "מייצרת אור", "מחליפה נשימה", "מונעת אכילה"), 0, "הסוואה = הגנה.", "g4_anim_camouflage_hard_c", "advanced", "understanding"],
  ["מה מחזור חיים של צפרדע?", opts4("ביצה במים, בגרות ביבשה", "רק בוגר ביבשה", "אין מים", "רק עוף"), 0, "מחזור דו-חיים.", "g4_anim_frog_hard_d", "advanced", "understanding"],
  ["למה חשוב לשמור על בית גידול?", opts4("מאפשר מזון ומחסה", "מונע גידול", "לא חשוב", "מחליף מים"), 0, "שמירת טבע.", "g4_anim_habitat_hard_e", "advanced", "application"],
]);

// ——— G5 ———
add("g5:body:easy", "sci_body_general", [
  ["מה תפקיד הכליות?", opts4("מסננות דם ומווסתות נוזלים", "מייצרות חמצן", "שומעות", "מעכלות לחם"), 0, "כליות מסננות.", "g5_body_kidney_easy_a", "basic", "recall"],
  ["מה קורה לדופק במאמץ מתון?", opts4("לרוב עולה", "נעצר", "אינו משתנה", "נקבע בצבע חולצה"), 0, "מאמץ מגביר דופק.", "g5_body_pulse_easy_b", "basic", "understanding"],
  ["מה תפקיד מערכת העצבים?", opts4("מעבירה הודעות", "מעכלת", "מייצרת אור", "מחליפה דם"), 0, "עצבים מתאמים.", "g5_body_nerves_easy_c", "basic", "recall"],
  ["למה חשוב תזונה מאוזנת?", opts4("תומכת באנרגיה ובריאות", "מחליפה שינה", "מונעת נשימה", "מבטלת מים"), 0, "תזונה מאוזנת.", "g5_body_nutrition_easy_d", "basic", "understanding"],
  ["מה עושות הריאות?", opts4("מחליפות גזים", "מעכלות", "מזרימות דם", "מחליפות עור"), 0, "ריאות = חילוף גזים.", "g5_body_lungs_easy_e", "basic", "recall"],
  ["מה תפקיד העור?", opts4("הגנה וחוש מישוש", "הפקת אור", "עיכול", "שאיבת אוויר"), 0, "עור מגן ומרגיש.", "g5_body_skin_easy_f", "basic", "understanding"],
]);

add("g5:body:medium", "sci_body_general", [
  ["מה קשר בין דם לריאות?", opts4("ריאות מעשירות דם בחמצן", "דם מייצר אור", "ריאות מעכלות", "אין קשר"), 0, "חילוף גזים.", "g5_body_blood_lungs_med_a", "standard", "understanding"],
  ["למה שרירים מתעייפים במאמץ?", opts4("צריכים חמצן ואנרגיה", "אין חמצן", "מפסיקים לנשום", "הופכים לעצם"), 0, "מאמץ דורש אנרגיה.", "g5_body_muscle_fatigue_med_b", "standard", "application"],
  ["מה תפקיד הכבד?", opts4("עוזר בעיכול וניקוי חומרים", "מזרים דם", "שומע", "מחליף שלד"), 0, "כבד בעיכול וניקוי.", "g5_body_liver_med_c", "standard", "understanding"],
  ["למה חשוב שתייה בפעילות?", opts4("מונעת התייבשות", "מבטלת לב", "מחליפה נשימה", "לא נחוצה"), 0, "מים שומרים איזון.", "g5_body_hydration_med_d", "standard", "application"],
  ["מה עושה מערכת העיכול?", opts4("מפרקת וסופגת מזון", "מייצרת חמצן", "מחליפה ריאות", "מגנה מפני קור"), 0, "עיכול וספיגה.", "g5_body_digest_med_e", "standard", "understanding"],
  ["מה משמעות דופק?", opts4("קצב פעימות הלב", "מהירות ריצה", "צבע עור", "גובה קול"), 0, "דופק = פעילות לב.", "g5_body_pulse_mean_med_f", "standard", "recall"],
]);

add("g5:body:hard", "sci_body_general", [
  ["מה קורה לספיקת דם במאמץ?", opts4("עלולה לעלות לענות על חמצן", "יורדת לאפס", "אינה משתנה", "נקבעת בעור"), 0, "לב מגיב למאמץ.", "g5_body_cardio_hard_a", "advanced", "application"],
  ["למה חימום לפני ספורט?", opts4("מכין שרירים", "מבטל נשימה", "מחליף שינה", "סוגר לב"), 0, "חימום מפחית פציעה.", "g5_body_warmup_hard_b", "advanced", "application"],
  ["מה תפקיד כלי דם?", opts4("הובלת דם לרקמות", "עיכול", "ראייה", "שמיעה"), 0, "כלי דם מובילים דם.", "g5_body_vessels_hard_c", "advanced", "understanding"],
]);

add("g5:experiments:easy", "sci_experiments_general", [
  ["מה השערה?", opts4("חיזוי לבדיקה", "תוצאה סופית", "מחיקה", "ציור"), 0, "השערה נבדקת.", "g5_exp_hyp_easy_a", "basic", "recall"],
  ["למה משתנה מבוקר?", opts4("משתנה אחד", "הכל", "שום דבר", "שם בלבד"), 0, "בידוד משתנה.", "g5_exp_var_easy_b", "basic", "understanding"],
  ["מה תיעוד ניסוי?", opts4("רישום ברור של תוצאות", "מחיקה", "שינוי הכל", "הימנעות ממדידה"), 0, "תיעוד = אמינות.", "g5_exp_log_easy_c", "basic", "understanding"],
  ["למה חזרה על מדידה?", opts4("לאמת תוצאות", "מיותר", "למחוק", "לשנות השערה"), 0, "חזרה משפרת אמינות.", "g5_exp_repeat_easy_d", "basic", "understanding"],
  ["מה כלי למדידת מסה?", opts4("משקל", "סרגל", "מדחום", "שעון"), 0, "מסה במשקל.", "g5_exp_mass_easy_e", "basic", "recall"],
  ["מה בטיחות בניסוי?", opts4("פיקוח והוראות", "טעימת חומר", "הדלקה", "שינוי הכל"), 0, "בטיחות קודמת.", "g5_exp_safety_easy_f", "basic", "application"],
  ["מה קבוצת ביקורת?", opts4("השוואה ללא שינוי", "מחיקה", "שינוי הכל", "לא נחוץ"), 0, "ביקורת מבודדת.", "g5_exp_control_easy_g", "basic", "understanding"],
]);

add("g5:animals:easy", "sci_animals_general", [
  ["מה מאפיין טורף?", opts4("צד טרף", "אוכל עלים", "אין שיניים", "חי במים בלבד"), 0, "טורף אוכל בעלי חיים.", "g5_anim_pred_easy_a", "basic", "understanding"],
  ["מה מחזור חיים של חרק?", opts4("ביצה, זחל, גולם, בוגר", "רק בוגר", "אין שלבים", "רק ביצה"), 0, "גלגול מלא.", "g5_anim_insect_easy_b", "basic", "understanding"],
  ["למה דבורים חשובות?", opts4("מאבקות", "אוכלות עצים", "שוחות", "מייצרות דם"), 0, "האבקה.", "g5_anim_bee_easy_c", "basic", "understanding"],
  ["מה אוכלת ארנבת?", opts4("עשב", "בשר", "דגים", "אבנים"), 0, "ארנבת צמחונית.", "g5_anim_rabbit_easy_d", "basic", "recall"],
  ["מה מאפיין זוחל?", opts4("מתחמם מסביבה", "מחמל", "זימים", "עוף"), 0, "זוחל = אקוטרמי.", "g5_anim_reptile_easy_e", "basic", "recall"],
  ["למה לדג יש זימים?", opts4("נשימה במים", "עוף", "ריצה", "אין זימים"), 0, "זימים במים.", "g5_anim_gills_easy_f", "basic", "understanding"],
  ["מה תפקיד יצרן ברשת מזון?", opts4("צמח מייצר מזון", "נמר", "עכבר", "אדם"), 0, "צמח = בסיס.", "g5_anim_producer_easy_g", "basic", "recall"],
]);

add("g5:animals:medium", "sci_animals_general", [
  ["מה קורה כשמצמצמים מזון לטורף?", opts4("רשת המזון משתנה", "אין השפעה", "צמחים נעלמים", "הכל קבוע"), 0, "טורפים מאזנים.", "g5_anim_food_web_med_a", "standard", "application"],
  ["מה התאמה לסביבה קרה?", opts4("פרווה או שומן", "זימים", "אין", "אבנים"), 0, "בידוד תרמי.", "g5_anim_cold_med_b", "standard", "understanding"],
  ["למה הסוואה עוזרת?", opts4("מקטינה זיהוי", "מייצרת אור", "מחליפה נשימה", "מונעת אכילה"), 0, "הסוואה.", "g5_anim_camouflage_med_c", "standard", "understanding"],
  ["מה מחזור חיים של יונק?", opts4("ילוד וגדילה", "רק ביצה", "אין שלבים", "גולם"), 0, "יונקים יולדים.", "g5_anim_mammal_med_d", "standard", "understanding"],
  ["למה חשוב לשמור על קן?", opts4("הפרעה מסכנת", "לא חשוב", "ביצים אבנים", "אין קן"), 0, "הפרעה מזיקה.", "g5_anim_nest_med_e", "standard", "application"],
  ["מה מאפיין ציפור?", opts4("נוצות ומקור", "זימים", "פרווה במים", "גלגול דג"), 0, "ציפור מותאמת.", "g5_anim_bird_med_f", "standard", "recall"],
]);

add("g5:animals:hard", "sci_animals_general", [
  ["מה השפעת אובדן בית גידול?", opts4("בעלי חיים עלולים לעזוב", "תמיד משפר", "אין השפעה", "צמחים גדלים"), 0, "הרס בית גידול.", "g5_anim_habitat_loss_hard_a", "advanced", "application"],
  ["מה קורה לרשת מזון?", opts4("שינוי בטורף משפיע על טרף", "אין שינוי", "צמחים לא חשובים", "הכל גדל"), 0, "רשת מזון דינמית.", "g5_anim_food_chain_hard_b", "advanced", "application"],
  ["למה עטלף פעיל בלילה?", opts4("פחות טורפים וחום", "אין אוזניים", "צמחוני", "חי במים"), 0, "פעילות לילית.", "g5_anim_bat_hard_c", "advanced", "application"],
]);

// ——— G6 ———
add("g6:body:easy", "sci_body_general", [
  ["מה תפקיד מערכת העיכול?", opts4("מפרקת וסופגת מזון", "מייצרת חמצן", "מחליפה ריאות", "מגנה מקור"), 0, "עיכול וספיגה.", "g6_body_digest_easy_a", "basic", "understanding"],
  ["מה עושה הלב?", opts4("מזרים דם", "מעכל", "מסנן אור", "מחליף עור"), 0, "לב = משאבה.", "g6_body_heart_easy_b", "basic", "recall"],
  ["למה חשוב שתייה?", opts4("שומרת איזון נוזלים", "מבטלת נשימה", "מחליפה שינה", "לא נחוצה"), 0, "מים חיוניים.", "g6_body_water_easy_c", "basic", "understanding"],
  ["מה תפקיד הריאות?", opts4("חילוף גזים", "עיכול", "ראייה", "שמיעה"), 0, "ריאות = גזים.", "g6_body_lungs_easy_d", "basic", "recall"],
  ["מה קשר תזונה לאנרגיה?", opts4("מזון מספק אנרגיה", "מחליף שינה", "מונע נשימה", "אין קשר"), 0, "תזונה = אנרגיה.", "g6_body_food_energy_easy_e", "basic", "understanding"],
]);

add("g6:body:medium", "sci_body_general", [
  ["מה קשר דם לחמצן?", opts4("דם מוביל חמצן", "דם מייצר אור", "דם מעכל", "אין קשר"), 0, "דם נושא חמצן.", "g6_body_o2_blood_med_a", "standard", "understanding"],
  ["למה שרירים זקוקים לחמצן?", opts4("לאנרגיה בפעילות", "לעיכול עצם", "לשיער", "להאזנה"), 0, "חמצן לשריר.", "g6_body_muscle_o2_med_b", "standard", "application"],
  ["מה תפקיד הכליות?", opts4("סינון ואיזון נוזלים", "חמצן", "שמיעה", "עיכול לחם"), 0, "כליות מסננות.", "g6_body_kidney_med_c", "standard", "recall"],
  ["מה מערכת העצבים?", opts4("מעבירה הודעות", "מעכלת", "מייצרת אור", "מחליפה דם"), 0, "עצבים מתאמים.", "g6_body_nerves_med_d", "standard", "understanding"],
  ["למה חימום לפני מאמץ?", opts4("מכין שרירים", "מבטל נשימה", "מחליף שינה", "סוגר לב"), 0, "חימום מונע פציעה.", "g6_body_warmup_med_e", "standard", "application"],
  ["מה תפקיד העור?", opts4("הגנה ומישוש", "אור", "עיכול", "אוויר"), 0, "עור מגן.", "g6_body_skin_med_f", "standard", "recall"],
]);

add("g6:body:hard", "sci_body_general", [
  ["מה קורה לדופק במאמץ ארוך?", opts4("עולה ואז יורד בהדרגה", "נעצר", "לא משתנה", "נקבע בעור"), 0, "לב מתאים למאמץ.", "g6_body_pulse_hard_a", "advanced", "application"],
  ["מה תפקיד כלי דם?", opts4("הובלת דם", "עיכול", "ראייה", "שמיעה"), 0, "כלי דם מובילים.", "g6_body_vessels_hard_b", "advanced", "understanding"],
  ["למה חמצן חיוני לתאים?", opts4("לשחרור אנרגיה", "לעיכול עצם", "לשיער", "לא נחוץ"), 0, "חמצן בתאים.", "g6_body_cell_o2_hard_c", "advanced", "understanding"],
]);

add("g6:experiments:easy", "sci_experiments_general", [
  ["מה השערה?", opts4("חיזוי לבדיקה", "תוצאה סופית", "מחיקה", "ציור"), 0, "השערה נבדקת.", "g6_exp_hyp_easy_a", "basic", "recall"],
  ["למה משתנה מבוקר?", opts4("משתנה אחד", "הכל", "שום דבר", "שם"), 0, "בידוד.", "g6_exp_var_easy_b", "basic", "understanding"],
  ["מה תיעוד?", opts4("רישום תוצאות", "מחיקה", "שינוי הכל", "הימנעות"), 0, "תיעוד.", "g6_exp_log_easy_c", "basic", "understanding"],
  ["למה חזרה?", opts4("לאמת", "מיותר", "למחוק", "לשנות"), 0, "חזרה.", "g6_exp_repeat_easy_d", "basic", "understanding"],
  ["מה יחידות?", opts4("להשוואה", "לא", "ציור", "שם"), 0, "יחידות.", "g6_exp_units_easy_e", "basic", "understanding"],
  ["מה ביקורת?", opts4("השוואה ללא שינוי", "מחיקה", "שינוי", "לא"), 0, "ביקורת.", "g6_exp_control_easy_f", "basic", "understanding"],
  ["מה בטיחות?", opts4("פיקוח", "טעימה", "הדלקה", "שינוי"), 0, "בטיחות.", "g6_exp_safety_easy_g", "basic", "application"],
]);

add("g6:animals:easy", "sci_animals_general", [
  ["מה מאפיין יונק?", opts4("מינק ופרווה", "זימים", "גלגול דג", "אין חום"), 0, "יונק.", "g6_anim_mammal_easy_a", "basic", "recall"],
  ["מה אוכלת פרה?", opts4("עשב", "בשר", "דג", "אבן"), 0, "פרה צמחונית.", "g6_anim_cow_easy_b", "basic", "recall"],
  ["מה דג?", opts4("חי במים", "עוף", "ארנב", "חתול"), 0, "דג ימי.", "g6_anim_fish_easy_c", "basic", "recall"],
  ["מה דבורה?", opts4("מאבקת", "אוכלת עץ", "שוחה", "דם"), 0, "האבקה.", "g6_anim_bee_easy_d", "basic", "understanding"],
  ["מה ציפור?", opts4("נוצות ומקור", "זימים", "פרווה במים", "גולם"), 0, "ציפור.", "g6_anim_bird_easy_e", "basic", "recall"],
  ["מה זוחל?", opts4("מתחמם מסביבה", "מחמל", "זימים", "עוף"), 0, "זוחל.", "g6_anim_reptile_easy_f", "basic", "recall"],
  ["מה טורף?", opts4("צד טרף", "עלים", "אין שיניים", "מים בלבד"), 0, "טורף.", "g6_anim_pred_easy_g", "basic", "understanding"],
]);

add("g6:animals:medium", "sci_animals_general", [
  ["מה רשת מזון?", opts4("קשרי אכילה בין יצורים", "אין קשר", "רק צמחים", "רק אבנים"), 0, "רשת מזון.", "g6_anim_food_web_med_a", "standard", "application"],
  ["מה התאמה לקור?", opts4("פרווה או שומן", "זימים", "אין", "אבנים"), 0, "בידוד.", "g6_anim_cold_med_b", "standard", "understanding"],
  ["מה הסוואה?", opts4("התמזגות עם סביבה", "אור", "נשימה", "אכילה"), 0, "הסוואה.", "g6_anim_camouflage_med_c", "standard", "understanding"],
  ["מה מחזור יונק?", opts4("ילוד וגדילה", "ביצה", "אין", "גולם"), 0, "יונק.", "g6_anim_cycle_med_d", "standard", "understanding"],
  ["למה לשמור על קן?", opts4("הפרעה מסכנת", "לא", "אבן", "אין"), 0, "קן רגיש.", "g6_anim_nest_med_e", "standard", "application"],
  ["מה בית גידול?", opts4("מקום לחיות ולמצוא מזון", "אבן", "אור", "דם"), 0, "בית גידול.", "g6_anim_habitat_med_f", "standard", "understanding"],
  ["מה פיזור זרעים?", opts4("העברת זרעים", "אכילה", "שחייה", "דם"), 0, "פיזור.", "g6_anim_seed_disp_med_g", "standard", "understanding"],
]);

add("g6:animals:hard", "sci_animals_general", [
  ["מה השפעת טורף על טרף?", opts4("מאזנת אוכלוסיות", "אין", "צמחים נעלמים", "הכל קבוע"), 0, "טורף מאזן.", "g6_anim_pred_prey_hard_a", "advanced", "application"],
  ["מה אובדן בית גידול?", opts4("בעלי חיים נפגעים", "משפר", "אין", "צמחים גדלים"), 0, "הרס בית גידול.", "g6_anim_habitat_loss_hard_b", "advanced", "application"],
  ["למה עטלף בלילה?", opts4("התאמה", "אין אוזן", "צמחוני", "מים"), 0, "לילה.", "g6_anim_bat_hard_c", "advanced", "application"],
  ["מה מחזור דו-חיים?", opts4("מים ויבשה", "רק יבשה", "רק מים", "רק עוף"), 0, "דו-חיים.", "g6_anim_amphibian_hard_d", "advanced", "understanding"],
]);

const EXPECTED = {
  "g4:body:easy": 4, "g4:body:hard": 6, "g4:experiments:easy": 6, "g4:experiments:hard": 5,
  "g4:animals:easy": 6, "g4:animals:hard": 5,
  "g5:body:easy": 6, "g5:body:medium": 6, "g5:body:hard": 3,
  "g5:experiments:easy": 7, "g5:animals:easy": 7, "g5:animals:medium": 6, "g5:animals:hard": 3,
  "g6:body:easy": 5, "g6:body:medium": 6, "g6:body:hard": 3,
  "g6:experiments:easy": 7, "g6:animals:easy": 7, "g6:animals:medium": 7, "g6:animals:hard": 4,
};

for (const [key, n] of Object.entries(EXPECTED)) {
  const got = CELLS[key]?.rows?.length ?? 0;
  if (got !== n) {
    console.error(`Cell ${key}: expected ${n} rows, got ${got}`);
    process.exit(1);
  }
}

function emitQuestion(key, subtype, row, idx) {
  const [g, topic, lvl] = key.split(":");
  const [rawStem, options, correctIndex, explanation, conceptTag, pDiff, cog] = row;
  // Source templates must already be child-facing only (no grade/level framing).
  const stem = String(rawStem || "").trim();
  if (/^בכיתה\s+[אבגדהו]/u.test(stem) || /מוקד\s+[a-z0-9_]+/iu.test(stem)) {
    throw new Error(
      `Dirty source stem in gen-science-p1 cell ${key}#${idx}: ${stem.slice(0, 80)}`
    );
  }
  const id = `sci_p1_${g}_${topic}_${lvl}_${String(idx + 1).padStart(2, "0")}`;
  const diff =
    pDiff ||
    (lvl === "hard" ? "advanced" : lvl === "medium" ? "standard" : "basic");
  const cogLevel =
    cog || (lvl === "hard" ? "application" : lvl === "medium" ? "understanding" : "recall");
  return {
    id,
    topic,
    grades: [g],
    minLevel: lvl,
    maxLevel: lvl,
    type: "mcq",
    stem,
    options,
    correctIndex,
    explanation,
    theoryLines: [
      "שאלות P1 נועדו לסגור פערי כיסוי בכיתות ד׳–ו׳ לפי נושא ורמה.",
      "בדקו את ההסבר לאחר בחירת התשובה.",
    ],
    params: {
      patternFamily: `sci_p1_${topic}_${g}_${lvl}_${conceptTag}`,
      subtype,
      conceptTag,
      diagnosticSkillId: `sci_p1_${topic}_${conceptTag}`,
      probePower: "medium",
      expectedErrorTags: [conceptTag, "fact_recall_gap"],
      expectedErrorTypes: [conceptTag, "fact_recall_gap"],
      cognitiveLevel: cogLevel,
      difficulty: diff,
      kind: "p1_g456_fill",
    },
  };
}

const questions = [];
for (const [key, { subtype, rows }] of Object.entries(CELLS)) {
  rows.forEach((row, i) => questions.push(emitQuestion(key, subtype, row, i)));
}

const ids = new Set();
for (const q of questions) {
  if (ids.has(q.id)) {
    console.error("Duplicate id:", q.id);
    process.exit(1);
  }
  ids.add(q.id);
  if (!q.params.diagnosticSkillId || !q.params.conceptTag) {
    console.error("Missing metadata:", q.id);
    process.exit(1);
  }
  if (
    !q.params.expectedErrorTags?.length &&
    !q.params.expectedErrorTypes?.length
  ) {
    console.error("Missing error tags:", q.id);
    process.exit(1);
  }
}

async function validateAgainstBank() {
  const { SCIENCE_QUESTIONS } = await import(
    new URL("../data/science-questions.js", import.meta.url).href
  );
  function norm(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }
  for (const [key, { rows }] of Object.entries(CELLS)) {
    const [g, topic, lvl] = key.split(":");
    const existing = new Set();
    for (const q of SCIENCE_QUESTIONS) {
      for (const gr of q.grades || []) {
        if (gr !== g || q.topic !== topic) continue;
        const lv = q.minLevel || q.maxLevel || "medium";
        if (lv !== lvl) continue;
        existing.add(norm(q.stem));
      }
    }
    for (const row of rows) {
      const stem = norm(row[0]);
      if (existing.has(stem)) {
        console.error(`Stem collision in ${key}:`, row[0].slice(0, 60));
        process.exit(1);
      }
      existing.add(stem);
    }
  }
  for (const key of Object.keys(CELLS)) {
    const [g, topic, lvl] = key.split(":");
    const stems = new Set();
    for (const item of SCIENCE_QUESTIONS) {
      for (const g2 of item.grades || []) {
        if (g2 !== g || item.topic !== topic) continue;
        const l2 = item.minLevel || item.maxLevel || "medium";
        if (l2 !== lvl) continue;
        stems.add(norm(item.stem));
      }
    }
    for (const row of CELLS[key].rows) stems.add(norm(row[0]));
    if (stems.size < 10) {
      console.error(`After merge ${key} unique=${stems.size} < 10`);
      process.exit(1);
    }
  }
}

await validateAgainstBank();

const parts = questions.map((q) => JSON.stringify(q, null, 2));
const outJs = `/**
 * P1 Science fill — G4–G6 blockers (launch gate). Generated by scripts/gen-science-p1-g456-fill.mjs
 */
export const SCIENCE_QUESTIONS_P1_G456_FILL = [
${parts.join(",\n")},
];
`;

writeFileSync(OUT, outJs, "utf8");
console.log(`Wrote ${questions.length} questions to ${OUT}`);
console.log("Pre-write validation: OK (ids, metadata, no stem collisions, projected >=10 per cell)");
