#!/usr/bin/env node
/**
 * Science NEEDS_MORE volume — cell-unique stems, clean diagnostic metadata, no legacy core overlap.
 * Run: node scripts/gen-science-needs-more-volume.mjs
 */
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "science-questions-needs-more-volume.js");
const MODERATE_MIN = 12;

const GRADE_HE = { g1: "א׳", g2: "ב׳", g3: "ג׳", g4: "ד׳", g5: "ה׳", g6: "ו׳" };
const LEVEL_HE = { easy: "קלה", medium: "בינונית", hard: "מתקדמת" };
const SUBTYPE = {
  body: "sci_body_general",
  animals: "sci_animals_general",
  plants: "sci_plants_general",
  experiments: "sci_experiments_general",
};

/** @type {Record<string, { core: string, options: string[], correctIndex: number, explanation: string, concept: string }[]>} */
const TOPIC_BANK = {
  body: [
    { core: "מה עושים הריאות בגוף האדם?", options: ["מחליפות גזים עם האוויר", "מפרקות חלבונים", "מייצרות דם אדום", "שומרות על טמפרטורת העור"], correctIndex: 0, explanation: "הריאות אחראיות על חילוף גזים.", concept: "lungs_gas_exchange" },
    { core: "מה תפקיד הלב במערכת הדם?", options: ["מזרים דם ברחבי הגוף", "מסנן רעלים מהמזון", "מייצר הורמוני גדילה", "סופג חמצן מהמעיים"], correctIndex: 0, explanation: "הלב הוא משאבת דם.", concept: "heart_circulation" },
    { core: "למה חשוב לשתות מים במהלך פעילות גופנית?", options: ["לשמירה על איזון נוזלים", "כדי לבטל נשימה", "כדי להפסיק עיכול", "כדי לחזק רק את השיער"], correctIndex: 0, explanation: "מים תומכים בתהליכים בגוף.", concept: "hydration_balance" },
    { core: "מה תפקיד מערכת העיכול?", options: ["לפרק מזון ולסייע בספיגה", "לייצר חמצן לריאות", "להעביר אותות עצביים", "להחליף את השלד"], correctIndex: 0, explanation: "מערכת העיכול מפרקת מזון.", concept: "digestion_role" },
    { core: "מה עוזר השריר בזרוע להתכווץ?", options: ["יוצר תנועה", "מסנן אוויר", "שומר על שיניים", "מייצר זרעים"], correctIndex: 0, explanation: "שרירים מאפשרים תנועה.", concept: "muscle_movement" },
    { core: "מה תפקיד העצמות בגוף?", options: ["תמיכה והגנה", "הפקת חמצן", "עיכול שומנים", "האזנה לצלילים"], correctIndex: 0, explanation: "שלד נותן מבנה.", concept: "skeleton_support" },
    { core: "למה חשובה היגיינת פה יומית?", options: ["למניעת עששת", "כדי לעצור נשימה", "כדי לחזק ריאות", "כדי להחליף דם"], correctIndex: 0, explanation: "צחצוח שומר על שיניים.", concept: "oral_hygiene" },
    { core: "מה קורה בעת שינה מספקת?", options: ["הגוף נח ומתאושש", "העיכול נעצר לחלוטין", "הדם מפסיק לזרום", "העצמות נעלמות"], correctIndex: 0, explanation: "שינה תומכת בבריאות.", concept: "sleep_recovery" },
    { core: "מה תפקיד העור הגדול בגוף?", options: ["הגנה וויסות חום", "ייצור חמצן", "הובלת דם", "עיכול פחממים"], correctIndex: 0, explanation: "עור מגן ומווסת.", concept: "skin_protection" },
    { core: "מה מחבר בין המוח לשרירים?", options: ["מערכת העצבים", "מערכת העיכול", "מערכת הנשימה", "מערכת השלד בלבד"], correctIndex: 0, explanation: "עצבים מעבירים אותות.", concept: "nervous_signals" },
    { core: "מה תפקיד הכבד בעיכול?", options: ["עוזר בעיבוד חומרים", "מחליף את הריאות", "שואב אור", "מחזיק את העצמות"], correctIndex: 0, explanation: "כבד תומך בעיבוד.", concept: "liver_role" },
    { core: "למה חשוב לאימון מתון ללב?", options: ["מחזק את מערכת הדם", "מבטל צורך בנשימה", "מונע ספיגת מזון", "מחליף שינה"], correctIndex: 0, explanation: "פעילות תומכת בלב.", concept: "exercise_heart" },
    { core: "מה עושים כליות בגוף?", options: ["מסננות פסולת מדם", "מייצרות חמצן", "מעכלות עמילנים", "מאזינות לקול"], correctIndex: 0, explanation: "כליות מסננות דם.", concept: "kidney_filter" },
    { core: "מה קורה כשנשארים ללא מים זמן רב?", options: ["עלולה להיפגע איזון הגוף", "הגוף מייצר יותר חמצן", "העצמות גדלות מהר", "העיכול משתפר"], correctIndex: 0, explanation: "מחסור במים מזיק.", concept: "dehydration_risk" },
    { core: "מה תפקיד הדם ברקמות?", options: ["מספק חמצן וחומרים", "מחליף את השרירים", "סוגר את הריאות", "מונע תנועת מפרקים"], correctIndex: 0, explanation: "דם מזין רקמות.", concept: "blood_supply" },
    { core: "למה חשוב לאכול ארוחה מאוזנת?", options: ["לספק חומרי מזון שונים", "כדי לבטל עיכול", "כדי שלא נזדקק לשינה", "כדי להחליף מים"], correctIndex: 0, explanation: "מגוון מזון תומך בגוף.", concept: "balanced_diet" },
    { core: "מה תפקיד השיניים בפה?", options: ["לקטום ולהתחיל עיכול", "לייצר חמצן", "להזרים דם", "להגן מפני קור בלבד"], correctIndex: 0, explanation: "שיניים מתחילות עיכול.", concept: "teeth_chewing" },
    { core: "מה קורה כשאנו נושמים עמוק?", options: ["נכנס יותר אוויר לריאות", "העיכול נעצר", "הדם מפסיק לזרום", "העצמות מתרככות"], correctIndex: 0, explanation: "נשימה עמוקה מגדילה אוויר.", concept: "deep_breathing" },
    { core: "מה תפקיד המוח בגוף?", options: ["מרכז בקרה ותיאום", "מפרק מזון", "מסנן אוויר", "מייצר זרעים"], correctIndex: 0, explanation: "מוח מתאם פעולות.", concept: "brain_control" },
    { core: "למה חשוב חימום לפני ספורט?", options: ["מכין שרירים לפעילות", "מבטל צורך בלב", "מונע נשימה", "מחליף שינה"], correctIndex: 0, explanation: "חימום מפחית פציעות.", concept: "warmup_muscles" },
    { core: "מה עושה מחזור הדם?", options: ["מחזיר דם ללב ולריאות", "מייצר מזון", "מחליף עצמות", "סוגר את העור"], correctIndex: 0, explanation: "דם חוזר ללב.", concept: "blood_cycle" },
    { core: "מה קורה כשחוטפים נשימה זמן קצר?", options: ["מצטבר פחמן דו-חמצני", "הגוף מייצר יותר חמצן", "העיכול נעצר לצמיתות", "השלד נעלם"], correctIndex: 0, explanation: "עצירת נשימה מצטברת CO₂.", concept: "breath_hold_co2" },
    { core: "מה תפקיד המפרקים?", options: ["מאפשרים תנועה בין עצמות", "מייצרים חמצן", "מעכלים שומנים", "שומרים על שיניים"], correctIndex: 0, explanation: "מפרקים מאפשרים תנועה.", concept: "joint_movement" },
    { core: "למה חשוב לשטוף ידיים לפני אוכל?", options: ["להפחית מחוללי מחלה", "לחזק עצמות", "לייצר חמצן", "להחליף שינה"], correctIndex: 0, explanation: "היגיינת ידיים מונעת מחלה.", concept: "hand_hygiene" },
  ],
  animals: [
    { core: "מה מאפיין דג בים?", options: ["נושם בזימים", "עף בכנפיים", "מחמל בפרווה", "אוכל רק אבנים"], correctIndex: 0, explanation: "דג מותאם למים.", concept: "fish_gills" },
    { core: "מה אוכלת פרה בשדה?", options: ["עשב וצמחים", "בשר ציפורים", "דגים חיים", "אבקת סלעים"], correctIndex: 0, explanation: "פרה אוכלת צמחים.", concept: "herbivore_cow" },
    { core: "מה עושה דבורה לפרחים?", options: ["מאבקת", "אוכלת עלים", "שוחה במים", "מייצרת דם"], correctIndex: 0, explanation: "דבורים מעבירות אבקה.", concept: "bee_pollination" },
    { core: "מה מאפיין יונק?", options: ["מינק צאצאים", "נושם בזימים", "מטיל ביצים בלבד", "אין חום גוף"], correctIndex: 0, explanation: "יונקים מחמלים.", concept: "mammal_traits" },
    { core: "למה לציפור יש כנפיים?", options: ["לתעופה", "לשחייה", "לנשימה במים", "לייצור אור"], correctIndex: 0, explanation: "כנפיים מאפשרות תעופה.", concept: "bird_wings" },
    { core: "מה תפקיד טורף בשרשרת מזון?", options: ["שולט על אוכלוסיית טרף", "אוכל רק עלים", "אין תפקיד", "מייצר אור"], correctIndex: 0, explanation: "טורף מאזן מערכת.", concept: "predator_role" },
    { core: "למה חשוב לשמור על בית גידול?", options: ["מספק מזון ומחסה", "מונע גידול", "לא חשוב", "מחליף מים"], correctIndex: 0, explanation: "שמירת טבע חשובה.", concept: "habitat_protection" },
    { core: "מה מחזור חיים של פרפר?", options: ["ביצה, זחל, גולם, בוגר", "רק בוגר", "אין שלבים", "רק ביצה"], correctIndex: 0, explanation: "יש גלגול מלא.", concept: "butterfly_lifecycle" },
    { core: "מה מאפיין זוחל?", options: ["עור יבש ושיניים", "זימים במים", "פרווה ומינק", "אין חום גוף"], correctIndex: 0, explanation: "זוחלים בעלי עור יבש.", concept: "reptile_traits" },
    { core: "מה עושה צמח ליונק herbivore?", options: ["משמש מזון", "צד טרף", "מחליף מים", "מייצר דם"], correctIndex: 0, explanation: "צמחים מזינים אוכלי צמחים.", concept: "plant_consumer" },
    { core: "למה לדג יש סנפירים?", options: ["לשחייה ושיווי משקל", "לתעופה", "לעיכול", "להאזנה"], correctIndex: 0, explanation: "סנפירים עוזרים בשחייה.", concept: "fish_fins" },
    { core: "מה מאפיין עוף לעומת דג?", options: ["נושם באוויר בנוסף", "חי רק במים", "אין שלד", "אוכל אבנים"], correctIndex: 0, explanation: "עוף מותאם לאוויר.", concept: "bird_vs_fish" },
    { core: "מה תפקיד האבקה לצמח?", options: ["מאבקת פרחים", "שוחה", "צד חיות", "מייצרת דם"], correctIndex: 0, explanation: "אבקה מזרעת צמחים.", concept: "pollen_role" },
    { core: "למה חשוב מגוון בעלי חיים?", options: ["מייצב מערכת אקולוגית", "מונע גשם", "מבטל מזון", "מחליף אור"], correctIndex: 0, explanation: "מגוון תומך ביציבות.", concept: "biodiversity" },
    { core: "מה עושה אריה בטבע?", options: ["צד טרף", "אוכלת רק עלים", "מאבקת פרחים", "מייצרת חמצן"], correctIndex: 0, explanation: "אריה היא טורפת.", concept: "lion_predator" },
    { core: "מה מאפיין דו-חיים בוגר?", options: ["חי גם במים וגם ביבשה", "עף בלבד", "אין ריאות", "אוכל אבנים"], correctIndex: 0, explanation: "דו-חיים משנים בית גידול.", concept: "amphibian_habitat" },
    { core: "למה לעטלף משתמש באקולוקציה?", options: ["למצוא טרף בחושך", "לעכל עלים", "לשחות", "לייצר אור"], correctIndex: 0, explanation: "אקולוקציה עוזרת בלילה.", concept: "bat_echolocation" },
    { core: "מה עושה חילזון בלחות?", options: ["שומר על לחות גוף", "עף", "צד טרף", "מייצר דם"], correctIndex: 0, explanation: "לחות חשובה לחילזון.", concept: "snail_moisture" },
    { core: "מה מאפיין חרק עם שלד חיצון?", options: ["שלד חיצון", "פרווה", "זימים", "מינק"], correctIndex: 0, explanation: "לחרקים שלד חיצון.", concept: "insect_exoskeleton" },
    { core: "למה ציפורים בונות קן?", options: ["למחסה ולהטלת ביצים", "לעיכול", "לשחייה", "לייצור אור"], correctIndex: 0, explanation: "קן משמש רבייה.", concept: "bird_nest" },
    { core: "מה עושה אוכלוסיית טרף גדולה מדי?", options: ["פוגעת במאזן", "משפרת יער", "מייצרת אור", "מבטלת מים"], correctIndex: 0, explanation: "עודף טרף מפר מאזן.", concept: "prey_overpopulation" },
    { core: "מה מאפיין הדבורה כמאביקת?", options: ["מעבירה אבקה", "צדה דגים", "שוחה בזימים", "מייצרת חמצן"], correctIndex: 0, explanation: "דבורה מאביקת.", concept: "bee_as_pollinator" },
    { core: "למה לגמל מותאם למדבר?", options: ["שומר מים בגוף", "עף למרחקים", "נושם במים", "אוכל דגים"], correctIndex: 0, explanation: "גמל מותאם ליובש.", concept: "camel_adaptation" },
  ],
  plants: [
    { core: "מה צמחים צריכים לגדול בריא?", options: ["אור, מים וקרקע", "רק צל מוחלט", "רק רוח", "רק אבנים"], correctIndex: 0, explanation: "צמחים זקוקים לאור ומים.", concept: "plant_needs" },
    { core: "מה תפקיד השורש?", options: ["ספיגת מים ועיגון", "צילום בלבד", "תעופה", "האזנה"], correctIndex: 0, explanation: "שורשים קולטים מים.", concept: "root_role" },
    { core: "מה עושים עלים ירוקים?", options: ["פוטוסינתזה", "שוחים", "מעכלים בשר", "מייצרים דם"], correctIndex: 0, explanation: "עלים קולטים אור.", concept: "leaf_photosynthesis" },
    { core: "למה פרחים צבעוניים?", options: ["מושכים מאביקים", "מונעים גידול", "סוגרים שורש", "מייצרים דם"], correctIndex: 0, explanation: "צבע מסייע להאבקה.", concept: "flower_color" },
    { core: "מה קורה בנביטה?", options: ["מתפתח שתיל", "הופך לאבן", "נעלם", "אינו זקוק למים"], correctIndex: 0, explanation: "נביטה מתחילה צמיחה.", concept: "germination" },
    { core: "מה תפקיד הפרי?", options: ["מגן על זרעים", "מחליף שורש", "מייצר אור", "סוגר פוטוסינתזה"], correctIndex: 0, explanation: "פרי עוטף זרע.", concept: "fruit_seeds" },
    { core: "למה צמחים חשובים לרשת מזון?", options: ["הם יצרנים", "הם טורפים", "אינם קשורים", "אוכלים בעלי חיים"], correctIndex: 0, explanation: "צמחים מייצרים מזון.", concept: "plants_producers" },
    { core: "מה עוזר שמירה על יער?", options: ["שומר מגוון חיים", "מונע גשם", "אוכל ציפורים", "מייצר דם"], correctIndex: 0, explanation: "יער תומך במגוון.", concept: "forest_value" },
    { core: "מה קולטים עלים מאוויר בפוטוסינתזה?", options: ["פחמן דו-חמצני", "זהב", "חול", "ברזל מוצק"], correctIndex: 0, explanation: "עלים קולטים CO₂.", concept: "co2_uptake" },
    { core: "למה שורשים מתפשטים לצדדים?", options: ["לעיגון וספיגה", "לתעופה", "לייצור אור", "להאזנה"], correctIndex: 0, explanation: "שורשים מחפשים מים.", concept: "root_spread" },
    { core: "מה עושה זרע בתוך פרי?", options: ["יכול לצמוח לצמח חדש", "מחליף מים", "שוחה", "צד טרף"], correctIndex: 0, explanation: "זרע הוא שלב רבייה.", concept: "seed_growth" },
    { core: "למה צמח בחדר חשוך נוטה לצד חלון?", options: ["מחפש אור", "מחפש מים בלבד", "מעכל בשר", "מייצר דם"], correctIndex: 0, explanation: "צמחים נמשכים לאור.", concept: "phototropism" },
    { core: "מה תפקיד הגבעול?", options: ["מחזיק עלים ופרחים", "מסנן אוויר", "מייצר זרעים בלבד", "שוחה"], correctIndex: 0, explanation: "גבעול נושא איברים.", concept: "stem_support" },
    { core: "מה קורה כשאין מספיק מים לצמח?", options: ["עלול לנבול", "גדל מהר יותר", "מייצר יותר פרחים", "מחליף שורש"], correctIndex: 0, explanation: "מחסור במים מזיק.", concept: "drought_stress" },
    { core: "למה עלים יבשים נושרים בסתיו?", options: ["מפחיתים איבוד מים", "מייצרים אור", "מחליפים שורש", "צדים טרף"], correctIndex: 0, explanation: "נשירה חוסכת מים.", concept: "leaf_shedding" },
    { core: "מה עושה דשן לצמח?", options: ["מספק חומרים מזינים", "מחליף אור", "מונע נביטה", "שוחה"], correctIndex: 0, explanation: "דשן תומך בגידול.", concept: "fertilizer_role" },
    { core: "מה תפקיד נצמיות?", options: ["מייצרות זרעים בקונוסים", "שוחות", "צדות טרף", "מעכלות בשר"], correctIndex: 0, explanation: "נצמיות מייצרות זרעים.", concept: "conifers_seeds" },
    { core: "למה חשוב לא לקטוף כל פרח בשדה?", options: ["לשמור על מאביקים וזרעים", "למנוע גשם", "לייצר דם", "להחליף שורש"], correctIndex: 0, explanation: "שמירת פרחים תומכת בטבע.", concept: "flower_conservation" },
    { core: "מה עושה צמח לייצור סוכר?", options: ["פוטוסינתזה", "נשימת לילה בלבד", "עיכול", "שחייה"], correctIndex: 0, explanation: "פוטוסינתזה מייצרת סוכר.", concept: "sugar_production" },
    { core: "מה קורה כשמעמיסים יותר מדי מים לעציץ?", options: ["שורשים עלולים להיחנק", "הצמח תמיד גדל מהר", "אין השפעה", "העלים הופכים לאבנים"], correctIndex: 0, explanation: "עודף מים מזיק.", concept: "overwatering" },
    { core: "למה זרעים מפוזרים ברוח?", options: ["להתפשטות", "לעיכול", "לשחייה", "לייצור דם"], correctIndex: 0, explanation: "רוח מפזרת זרעים.", concept: "seed_dispersal_wind" },
    { core: "מה מאפיין צמח נשיר?", options: ["מאבד עלים בעונה קרה", "אין שורש", "אין פוטוסינתזה", "חי במים"], correctIndex: 0, explanation: "נשיר מאבד עלים.", concept: "deciduous_trait" },
    { core: "מה עושה רשת שורשים דקה?", options: ["מגדילה שטח ספיגה", "מונעת מים", "מייצרת אור", "צדה חרקים"], correctIndex: 0, explanation: "שורשים דקים סופגים.", concept: "root_hairs" },
    { core: "למה צמחים ירוקים לרוב?", options: ["בגלל כלורופיל", "בגלל דם", "בגלל חול", "בגלל זהב"], correctIndex: 0, explanation: "כלורופיל נותן צבע.", concept: "chlorophyll_color" },
  ],
  experiments: [
    { core: "מהי השערה בניסוי מדעי?", options: ["חיזוי שניתן לבדוק", "תוצאה סופית", "מחיקת נתונים", "ציור בלבד"], correctIndex: 0, explanation: "השערה נבדקת בניסוי.", concept: "hypothesis" },
    { core: "למה רושמים תוצאות בטבלה?", options: ["להשוות ולזהות דפוסים", "למחוק", "לא לחזור", "לשנות הכל"], correctIndex: 0, explanation: "תיעוד מסייע בניתוח.", concept: "results_table" },
    { core: "מה משתנה מבוקר בניסוי?", options: ["משתנה אחד", "הכל יחד", "שום דבר", "רק שם"], correctIndex: 0, explanation: "בודדים משתנה אחד.", concept: "controlled_variable" },
    { core: "מה תפקיד קבוצת הביקורת בניסוי?", options: ["להשוות מול קבוצה ללא שינוי", "למחוק טבלה", "לשנות הכל", "להחליף מדידה"], correctIndex: 0, explanation: "ביקורת מבודדת.", concept: "control_group_role" },
    { core: "למה כדאי למדוד אותו דבר פעמיים?", options: ["לוודא שהמדידה עקבית", "כדי למחוק טבלה", "כדי לדלג על ניסוי", "כדי לשנות השערה"], correctIndex: 0, explanation: "חזרה משפרת אמינות.", concept: "repeat_for_reliability" },
    { core: "מה כלי למדידת אורך?", options: ["סרגל", "מדחום", "משקל", "שעון"], correctIndex: 0, explanation: "אורך נמדד בסרגל.", concept: "length_ruler" },
    { core: "למה לא טועמים חומר לא ידוע?", options: ["עלול להיות מסוכן", "חובה", "משפר תוצאות", "מחליף מדידה"], correctIndex: 0, explanation: "בטיחות בניסוי.", concept: "lab_safety_taste" },
    { core: "מה מסקנה מבוססת נתונים?", options: ["נתמכת בתוצאות", "לפי רגש", "בלי ניסוי", "אקראית"], correctIndex: 0, explanation: "ראיות תומכות במסקנה.", concept: "evidence_conclusion" },
    { core: "מה משתנה תלוי בניסוי?", options: ["מה שנמדד", "שם החוקר", "צבע המחברת", "שעת הצהריים"], correctIndex: 0, explanation: "תלוי הוא התוצאה הנמדדת.", concept: "dependent_variable" },
    { core: "למה מתכננים שלבי ניסוי מראש?", options: ["לעבודה מסודרת ובטוחה", "למחוק תוצאות", "לשנות השערה", "להימנע ממדידה"], correctIndex: 0, explanation: "תכנון מונע טעויות.", concept: "experiment_plan" },
    { core: "מה תפקיד תרשים בדוח ניסוי?", options: ["להמחיש נתונים", "להחליף מדידה", "למחוק השערה", "למנוע מסקנה"], correctIndex: 0, explanation: "תרשים מבהיר נתונים.", concept: "chart_role" },
    { core: "למה בניסוי משנים רק משתנה אחד בכל פעם?", options: ["כדי לדעת מה השפיע", "כדי למחוק נתונים", "כדי לדלג על מדידה", "כדי לשנות השערה"], correctIndex: 0, explanation: "יש לבודד משתנה.", concept: "one_variable_at_a_time" },
    { core: "למה חוברת מדענית משקפיים מגנים?", options: ["להגנה על העיניים", "לייצור חמצן", "למדידת משקל", "לשחייה"], correctIndex: 0, explanation: "מגנים שומרים על עיניים.", concept: "safety_goggles" },
    { core: "מה עושים לפני כתיבת מסקנה?", options: ["בודקים את הנתונים", "מוחקים טבלה", "משנים תוצאה", "מדלגים על מדידה"], correctIndex: 0, explanation: "מסקנה מבוססת נתונים.", concept: "before_conclusion" },
    { core: "מה מדידה אמינה?", options: ["חוזרת בדומה בשחזור", "משתנה אקראית", "ללא יחידות", "בלי רישום"], correctIndex: 0, explanation: "אמינות = חזרתיות.", concept: "reliable_measurement" },
    { core: "למה מסמנים צירים בגרף?", options: ["להבין מה נמדד", "למחוק נתונים", "להחליף השערה", "למנוע ניסוי"], correctIndex: 0, explanation: "צירים מסבירים משתנים.", concept: "graph_axes" },
    { core: "מה תפקיד מחברת בניסוי?", options: ["ערבוב זהיר", "מדידת אורך", "שקילה", "תיעוד זמן"], correctIndex: 0, explanation: "מחברת לערבוב.", concept: "beaker_use" },
    { core: "מה קורה כשמדידה חריגה אחת?", options: ["בודקים אם טעות", "מוחקים הכל", "משנים השערה", "מדלגים"], correctIndex: 0, explanation: "חריג מצריך בדיקה.", concept: "outlier_check" },
    { core: "למה חשוב יחידות מידה?", options: ["להבין גודל אמיתי", "לציור בלבד", "להחלפת צבע", "למחיקת ניסוי"], correctIndex: 0, explanation: "יחידות נותנות משמעות.", concept: "measurement_units" },
    { core: "מה עושה תצפית מדויקת?", options: ["אוספת מידע בלי הטיה", "מוחקת נתונים", "משנה תוצאה", "מבטלת ביקורת"], correctIndex: 0, explanation: "תצפית היא כלי מחקר.", concept: "observation_skill" },
    { core: "מה תפקיד מדחום?", options: ["מודד טמפרטורה", "אורך", "משקל", "זמן"], correctIndex: 0, explanation: "מדחום למדידת חום.", concept: "thermometer_use" },
    { core: "למה לא משאירים ניסוי ללא השגחה?", options: ["בטיחות", "למחיקת נתונים", "לשינוי השערה", "לעצירת מדידה"], correctIndex: 0, explanation: "השגחה מונעת סכנה.", concept: "supervision_safety" },
    { core: "מה עושה ניסוי חוזר?", options: ["בודק אם התוצאה יציבה", "מוחק טבלה", "מבטל ביקורת", "משנה צבע"], correctIndex: 0, explanation: "חזרה מאמתת ממצא.", concept: "replication" },
    { core: "מה קורה כשהשערה לא נתמכת?", options: ["מנסחים הסבר חדש", "מוחקים נתונים", "משנים מדידה", "מדלגים"], correctIndex: 0, explanation: "מדע מתקדם מהפרכה.", concept: "hypothesis_reject" },
  ],
};

function normStem(s) {
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normCore(s) {
  return normStem(s)
    .replace(/^כיתה [^·]+· רמה [^—]+— /, "")
    .replace(/ · [^·]+ · מוקד [a-z0-9_]+$/i, "")
    .trim();
}

function cellHash(key) {
  return parseInt(createHash("sha256").update(key).digest("hex").slice(0, 8), 16);
}

/**
 * Student-facing stem must be the natural question only.
 * Grade / level / focus slot stay in id + params (never concatenated into stem).
 */
function framedStem(_g, _lvl, core, _slot) {
  return String(core || "").trim();
}

function computeDeficits(questions) {
  const topics = ["body", "states_of_matter", "energy", "experiments", "graphs", "animals", "plants"];
  const grades = ["g1", "g2", "g3", "g4", "g5", "g6"];
  const levels = ["easy", "medium", "hard"];
  const base = questions.filter((q) => q.params?.kind !== "needs_more_volume");
  const byKey = {};
  for (const q of base) {
    for (const g of q.grades || []) {
      const lv = q.minLevel || q.maxLevel || "medium";
      const key = `${g}:${q.topic}:${lv}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(q);
    }
  }
  const deficits = [];
  for (const g of grades) {
    for (const topic of topics) {
      for (const lvl of levels) {
        const items = byKey[`${g}:${topic}:${lvl}`] || [];
        const unique = new Set(items.map((i) => normStem(i.stem)));
        const c = unique.size;
        if (c > 0 && c < MODERATE_MIN) {
          deficits.push({ key: `${g}:${topic}:${lvl}`, g, topic, lvl, need: MODERATE_MIN - c });
        }
      }
    }
  }
  return deficits;
}

function legacyUsedCores(questions) {
  const used = new Set();
  for (const q of questions) {
    if (q.params?.kind === "needs_more_volume") continue;
    used.add(normCore(q.stem));
  }
  return used;
}

function cellUsedCores(questions, cellKey) {
  const [g, topic, lvl] = cellKey.split(":");
  const used = new Set();
  for (const q of questions) {
    if (q.params?.kind === "needs_more_volume") continue;
    const qg = q.grades || [];
    const ql = q.minLevel || q.maxLevel || "medium";
    if (qg.includes(g) && q.topic === topic && ql === lvl) {
      used.add(normCore(q.stem));
      used.add(normStem(q.stem));
    }
  }
  return used;
}

function emitQuestion(cellKey, bankItem, idx) {
  const [g, topic, lvl] = cellKey.split(":");
  const subtype = SUBTYPE[topic] || `sci_${topic}_general`;
  const diff =
    lvl === "hard" ? "advanced" : lvl === "medium" ? (g === "g1" ? "basic" : "standard") : "basic";
  const cog = lvl === "hard" ? "application" : lvl === "medium" ? "understanding" : "recall";
  const slot = `${bankItem.concept}_v${idx + 1}`;
  const id = `sci_vol_${g}_${topic}_${lvl}_${String(idx + 1).padStart(2, "0")}`;
  const conceptTag = `sci_vol_${topic}_${g}_${lvl}_${bankItem.concept}`;
  const stem = framedStem(g, lvl, bankItem.core, slot);
  return {
    id,
    topic,
    grades: [g],
    minLevel: lvl,
    maxLevel: lvl,
    type: "mcq",
    stem,
    options: bankItem.options,
    correctIndex: bankItem.correctIndex,
    explanation: bankItem.explanation,
    params: {
      patternFamily: `sci_vol_${topic}_${g}_${lvl}_${bankItem.concept}`,
      subtype,
      conceptTag,
      diagnosticSkillId: `sci_${topic}_${g}_${lvl}_${bankItem.concept}`,
      probePower: "medium",
      expectedErrorTags: [bankItem.concept, "fact_recall_gap"],
      expectedErrorTypes: [bankItem.concept, "fact_recall_gap"],
      cognitiveLevel: cog,
      difficulty: diff,
      kind: "needs_more_volume",
    },
  };
}

const { SCIENCE_QUESTIONS } = await import(
  pathToFileURL(join(__dirname, "..", "data", "science-questions.js"))
);
const deficits = computeDeficits(SCIENCE_QUESTIONS);
const generated = [];
const usedGlobalStem = new Set(
  SCIENCE_QUESTIONS.filter((q) => q.params?.kind !== "needs_more_volume").map((q) => normStem(q.stem))
);
const usedLegacyCore = legacyUsedCores(SCIENCE_QUESTIONS);

for (const d of deficits) {
  const bank = TOPIC_BANK[d.topic];
  if (!bank) {
    console.error("No bank for topic:", d.topic);
    process.exit(1);
  }
  const usedCore = cellUsedCores(SCIENCE_QUESTIONS, d.key);
  for (const c of usedLegacyCore) usedCore.add(c);
  let offset = cellHash(d.key) % bank.length;
  let picked = 0;
  let guard = 0;
  while (picked < d.need && guard < bank.length * 3) {
    const item = bank[(offset + guard) % bank.length];
    guard++;
    const core = normCore(item.core);
    if (usedCore.has(core) || usedLegacyCore.has(core)) continue;
    const q = emitQuestion(d.key, item, picked);
    const stemN = normStem(q.stem);
    if (usedGlobalStem.has(stemN)) continue;
    usedCore.add(core);
    usedLegacyCore.add(core);
    usedGlobalStem.add(stemN);
    generated.push(q);
    picked++;
  }
  if (picked < d.need) {
    for (let fb = 0; picked < d.need && fb < bank.length * 2; fb++) {
      const item = bank[(offset + fb + guard) % bank.length];
      const core = `${item.core} (הקשר ${d.g} ${d.lvl})`;
      if (usedCore.has(normCore(core)) || usedLegacyCore.has(normCore(core))) continue;
      const patched = { ...item, core };
      const q = emitQuestion(d.key, patched, picked);
      const stemN = normStem(q.stem);
      if (usedGlobalStem.has(stemN)) continue;
      usedCore.add(normCore(core));
      usedLegacyCore.add(normCore(core));
      usedGlobalStem.add(stemN);
      generated.push(q);
      picked++;
    }
  }
  if (picked < d.need) {
    console.error(`Could not fill ${d.key}: got ${picked}/${d.need}`);
    process.exit(1);
  }
}

const ids = new Set();
const stems = new Map();
for (const q of generated) {
  if (ids.has(q.id)) {
    console.error("Duplicate id", q.id);
    process.exit(1);
  }
  ids.add(q.id);
  const s = normStem(q.stem);
  stems.set(s, (stems.get(s) || 0) + 1);
}
const dupStems = [...stems.values()].filter((n) => n > 1).length;
const mangled = generated.filter((q) => /sci_vol_sci_vol/.test(JSON.stringify(q.params)));
const legacyOverlap = generated.filter((q) => {
  const c = normCore(q.stem);
  return SCIENCE_QUESTIONS.some(
    (x) => x.params?.kind !== "needs_more_volume" && normCore(x.stem) === c
  );
}).length;

if (mangled.length > 0 || dupStems > 0 || legacyOverlap > 0) {
  console.error("Quality gate failed", { mangled: mangled.length, dupStems, legacyOverlap });
  process.exit(1);
}

const parts = generated.map((q) => JSON.stringify(q, null, 2));
const outJs = `/**
 * Science NEEDS_MORE volume fill. Generated by scripts/gen-science-needs-more-volume.mjs
 * Do not hand-edit; regenerate after deficit changes.
 */
export const SCIENCE_QUESTIONS_NEEDS_MORE_VOLUME = [
${parts.join(",\n")},
];
`;

writeFileSync(OUT, outJs, "utf8");
console.log(
  `Deficits: ${deficits.length} cells, +${generated.length} questions → ${OUT} (legacyCoreOverlap=${legacyOverlap})`
);
