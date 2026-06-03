#!/usr/bin/env node
/**
 * Generates data/science-questions-phase-b.js — Phase B science expansion.
 * Run: node scripts/gen-science-phase-b.mjs
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "science-questions-phase-b.js");

/** @typedef {[string, string[], number, string, string, string, string]} Row */

/** @type {Record<string, { patternFamily: string, subtype: string, rows: Row[] }>} */
const CELLS = {};

function add(key, patternFamily, subtype, rows) {
  CELLS[key] = { patternFamily, subtype, rows };
}

const MAT = "sci_materials_properties";
const EARTH = "sci_earth_space_cycles";
const ENV = "sci_environment_conservation";

// ——— G1 materials ———
add("g1:materials:medium", MAT, "sci_materials_general", [
  ["איזה חומר נראה חלק למגע?", ["שולחן מלוטח", "קליפת תפוז", "ספוג יבש", "חול גס"], 0, "משטח חלק מרגישים בלי בליטות.", "g1_materials_smooth", "basic", "recall"],
  ["מה תכונה של ספוג?", ["רך וקל ללחוץ", "קשה כמו אבן", "שקוף לגמרי", "מתכת קרה"], 0, "ספוג רך וסופג.", "g1_materials_sponge_soft", "basic", "recall"],
  ["איזה חומר יכול להיות קר במגע?", ["קרח", "כוס תה חמה", "אבן חמה", "שמש"], 0, "קרח קר כי טמפרטורתו נמוכה.", "g1_materials_cold_touch", "basic", "understanding"],
  ["ממה עשוי כוס פלסטיק לרוב?", ["חומר סינתטי קל", "עץ מלא", "ברזל כבד", "זכוכית"], 0, "פלסטיק הוא חומר מלאכותי קל.", "g1_materials_plastic", "basic", "recall"],
]);
add("g1:materials:hard", MAT, "sci_materials_general", [
  ["למה אבן וספוג שונים במגע?", ["תכונות קשיחות שונות", "צבע בלבד", "גודל בלבד", "ריח בלבד"], 0, "קשיחות ורכות הן תכונות חומר.", "g1_materials_hardness_compare", "advanced", "understanding"],
  ["מה קורה כשלוחצים על ספוג?", ["משתנה צורה וחוזר חלקית", "נשבר לרסיסים", "הופך למתכת", "נעלם"], 0, "חומר רך מתעצב וחוזר.", "g1_materials_sponge_press", "advanced", "application"],
  ["איך בודקים אם חומר מחוספס?", ["מרגישים חיכוך באצבע", "שוקלים אותו", "מקשיבים לו", "מריחים בלבד"], 0, "מחוספס יוצר חיכוך במגע.", "g1_materials_rough_test", "advanced", "application"],
  ["למה חומרים שונים זה מזה?", ["לכל חומר תכונות שונות", "כולם זהים תמיד", "רק הצבע משנה", "אין הבדל"], 0, "תכונות כמו קשיחות ורכות משתנות.", "g1_materials_different_props", "advanced", "understanding"],
]);

// ——— G1 earth_space ———
add("g1:earth_space:medium", EARTH, "sci_earth_space_general", [
  ["מתי רואים שמש ביום?", ["כשהשמיים בהירים", "רק בלילה", "רק מתחת למים", "רק בחורף"], 0, "ביום השמש מאירה את השמיים.", "g1_earth_sun_day", "basic", "recall"],
  ["מה יוצר צל בחצוץ?", ["גוף חוסם אור השמש", "הירח בלבד", "גשם כבד", "רוח חזקה"], 0, "צל נוצר כשאור נחסם.", "g1_earth_shadow", "basic", "understanding"],
  ["מתי קר יותר לרוב בישראל?", ["בעונת החורף", "באמצע הקיץ", "בלילה בלבד", "תמיד אותו דבר"], 0, "בחורף הטמפרטורה נמוכה יותר.", "g1_earth_winter_cold", "basic", "recall"],
  ["מה רואים בלילה בשמיים?", ["ירח וכוכבים", "שמש בוהקת", "קשת בענן", "עננים בלבד"], 0, "בלילה השמש מוסתרת מאיתנו.", "g1_earth_night_sky", "basic", "recall"],
]);
add("g1:earth_space:hard", EARTH, "sci_earth_space_general", [
  ["למה יום ולילה מתחלפים?", ["כדור הארץ מסתובב", "הירח נעלם", "השמש נכבית", "העננים נעלמים"], 0, "סיבוב כדור הארץ יוצר מחזור יום-לילה.", "g1_earth_day_night_spin", "advanced", "understanding"],
  ["מה קורה כשענן מכסה שמש?", ["פחות אור ופחות חום ישיר", "הלילה מגיע מיד", "הירח גדל", "הים נעלם"], 0, "ענן מפזר ומסתיר קרינה.", "g1_earth_cloud_cover", "advanced", "application"],
  ["למה בקיץ חם יותר לרוב?", ["שעות אור ארוכות והשמש גבוהה", "אין שמש בקיץ", "הירח מחמם", "הגשם תמיד"], 0, "בקיץ יש יותר קרינת שמש.", "g1_earth_summer_heat", "advanced", "understanding"],
  ["למה לובשים מעיל בגשם?", ["מגן ממים ומרוח", "כדי לראות ירח", "כדי להאיץ סיבוב כדור הארץ", "כדי לעשות צל"], 0, "בגדים שומרים על גוף יבש.", "g1_earth_rain_coat", "advanced", "application"],
]);

// ——— G1 environment ———
add("g1:environment:medium", ENV, "sci_environment_general", [
  ["למה זורקים פח לפח אשפה?", ["שומרים על ניקיון", "מגדילים זבל", "מונעים מים", "סוגרים שמש"], 0, "פח נכון מונע לכלוך.", "g1_env_trash_bin", "basic", "understanding"],
  ["מה עוזר לצמחים בגינה?", ["מים ואור שמש", "רק צל כבד", "רק רוח", "רק אבנים"], 0, "צמחים זקוקים למים ולאור.", "g1_env_plants_needs", "basic", "recall"],
  ["למה לא רוצים בוץ בכיתה?", ["עלול להיות מלכלך וחלק", "זה מחזק עצים", "זה מייצר כוכבים", "אין סיבה"], 0, "בוץ מלכלך ועלול להחליק.", "g1_env_mud_class", "basic", "understanding"],
  ["מה חשוב לחיות בטבע?", ["מקום מחיה ומזון", "רק צבע פרווה", "רק שם בעל חיים", "רק גובה עץ"], 0, "בעלי חיים זקוקים למזון ומחסה.", "g1_env_habitat_needs", "basic", "understanding"],
]);
add("g1:environment:hard", ENV, "sci_environment_general", [
  ["למה חשוב לחסוך מים?", ["מים מוגבלים לכולם", "מים לא נחוצים", "מים מחליפים שמש", "אין צורך במים"], 0, "מים יקרים וצריך לחסוך.", "g1_env_save_water", "advanced", "application"],
  ["מה קורה אם זורקים זבל בים?", ["מזהם מים ומזיק לדגים", "מנקה את הים", "מגדיל דגים", "אין השפעה"], 0, "זבל פוגע בחיים ימיים.", "g1_env_sea_litter", "advanced", "application"],
  ["למה שומרים על עצים בפארק?", ["נותנים צל וחמצן", "מונעים גשם", "אוכלים בעלי חיים", "מייצרים דלק"], 0, "עצים תורמים לאוויר ולצל.", "g1_env_park_trees", "advanced", "understanding"],
  ["מה דואגים לטבע בביקור?", ["לא לקטוף ולזרוק לאשפה", "לשרוף עלים", "לשבור ענפים", "להשאיר זבל"], 0, "התנהגות זהירה שומרת על הטבע.", "g1_env_visit_care", "advanced", "application"],
]);

// ——— G2 materials ———
add("g2:materials:hard", MAT, "sci_materials_general", [
  ["מה שונה במגע בין מתכת לעץ?", ["מתכת קשה וקרה לעיתים, עץ פחות", "עץ תמיד שקוף", "מתכת תמיד רכה", "אין הבדל"], 0, "מתכות קשיחות ומוליכות חום.", "g2_materials_metal_wood", "advanced", "understanding"],
  ["איך בודקים אם חומר שקוף?", ["רואים דרכו צורה או אור", "שוקלים אותו בלבד", "מריחים אותו", "שומעים צליל"], 0, "שקיפות מאפשרת מעבר אור.", "g2_materials_transparent", "advanced", "application"],
  ["למה פלסטיק קל לרוב?", ["צפיפות נמוכה יחסית", "הוא עשוי מברזל", "הוא תמיד כבד", "אין לו מסה"], 0, "חומר קל שוקל פחות.", "g2_materials_plastic_light", "advanced", "understanding"],
  ["מה קורה לשעווה ליד מקור חום?", ["נוטה להימס", "הופכת לאבן", "נעלמת", "מקפיאה מים"], 0, "חום מעביר שעווה למצב נוזלי.", "g2_materials_wax_melt", "advanced", "application"],
]);

// ——— G2 earth_space ———
add("g2:earth_space:medium", EARTH, "sci_earth_space_general", [
  ["מה סימן של יום גשום?", ["עננים וטיפות מים", "ירח מלא בלבד", "שמש חזקה", "כוכבים בלבד"], 0, "גשם מלווה עננים ומים.", "g2_earth_rain_signs", "standard", "recall"],
  ["מה גורם לרוח לעיתים?", ["תנועת אוויר בין אזורים", "סיבוב הירח בלבד", "צבע העננים", "גובה עצים"], 0, "הבדלי לחץ מניעים רוח.", "g2_earth_wind_cause", "standard", "understanding"],
]);
add("g2:earth_space:hard", EARTH, "sci_earth_space_general", [
  ["למה יש עונות שונות בשנה?", ["מיקום השמש משתנה לאורך השנה", "הירח נעלם", "הים נסגר", "אין שמש"], 0, "זווית השמש משנה עונות.", "g2_earth_seasons", "advanced", "understanding"],
  ["מה קורה במחזור המים כשחם?", ["אידוי ממים גדל", "המים נעלמים לנצח", "אין אידוי", "השמש נכבית"], 0, "חום מגביר אידוי.", "g2_earth_evaporation_heat", "advanced", "application"],
  ["למה יש מלח בים המלח?", ["אידוי גדול והמלח נשאר", "אין מים בים", "גשם ממיס מלח", "הירח מוסיף מלח"], 0, "אידוי מרוכז מלחים.", "g2_earth_dead_sea_salt", "advanced", "understanding"],
  ["מה תפקיד הענן במזג אוויר?", ["נושא אדי מים ומצל", "מייצר כוכבים", "סוגר את הלילה", "מחליף את השמש"], 0, "עננים חלק ממחזור המים.", "g2_earth_cloud_role", "advanced", "understanding"],
]);

// ——— G2 environment ———
add("g2:environment:medium", ENV, "sci_environment_general", [
  ["למה ממחזרים בקבוקים?", ["מפחיתים זבל וחוסכים משאבים", "מגדילים פסולת", "מונעים מים", "סוגרים שמש"], 0, "מיחזור חוסך חומרים.", "g2_env_recycle_bottles", "standard", "understanding"],
]);
add("g2:environment:hard", ENV, "sci_environment_general", [
  ["למה לא שורפים פסולת בחוץ?", ["מזהם אוויר ומסוכן", "מחזק עצים", "מייצר מים", "אין סיכון"], 0, "שריפה פולטת עשן מזיק.", "g2_env_no_burning", "advanced", "application"],
  ["מה קורה כשמזהמים נחל?", ["מזיק לדגים ולצמחים", "מנקה את המים", "מגדיל דגים", "אין השפעה"], 0, "זיהום פוגע בחיים.", "g2_env_stream_pollution", "advanced", "application"],
  ["למה שותלים עצים בשכונה?", ["מייצרים חמצן וצל", "מונעים גשם לנצח", "אוכלים בעלי חיים", "מייצרים פלסטיק"], 0, "עצים משפרים אוויר וצל.", "g2_env_plant_trees", "advanced", "understanding"],
  ["מה התנהגות ידידותית לטבע?", ["הליכה על שבילים מסומנים", "קטיפת כל הפרחים", "השארת זבל", "שבירת ענפים"], 0, "שבילים שומרים על בית גידול.", "g2_env_trail_behavior", "advanced", "application"],
]);

// ——— G3 materials ———
add("g3:materials:easy", MAT, "sci_materials_general", [
  ["איזה חומר מוליך חשמל טוב?", ["נחושת", "פלסטיק", "עץ יבש", "זכוכית"], 0, "מתכות מוליכות זרם.", "g3_materials_conductor", "basic", "recall"],
  ["מה מצב הצבירה של מים בחדר?", ["נוזל", "מוצק", "גז בלבד", "פלסמה"], 0, "בטמפרטורת חדר מים נוזלים.", "g3_materials_water_liquid", "basic", "recall"],
]);
add("g3:materials:hard", MAT, "sci_materials_general", [
  ["מה משפיע על מהירות התכת קרח?", ["טמפרטורה סביב ושטח מגע", "צבע הקיר", "שם הילד", "גובה כיסא"], 0, "חום ושטח משפיעים על התכה.", "g3_materials_ice_melt_rate", "advanced", "application"],
  ["מה הבדל בין שינוי פיזיקלי לכימי?", ["פיזיקלי אותו חומר, כימי חדש", "אין הבדל", "כימי תמיד צבע", "פיזיקלי תמיד אש"], 0, "בכימי נוצר חומר אחר.", "g3_materials_phys_vs_chem", "advanced", "understanding"],
]);

// ——— G3 earth_space ———
add("g3:earth_space:easy", EARTH, "sci_earth_space_general", [
  ["מה גורם ליום ולילה?", ["סיבוב כדור הארץ", "הירח נעלם", "השמש נכבית", "הגשם"], 0, "סיבוב יוצר מחזור אור-חושך.", "g3_earth_day_night", "basic", "recall"],
  ["מאיפה האור שאנו רואים מהירח?", ["מאור השמש", "מהירח עצמו", "מהים", "מהעננים בלבד"], 0, "הירח מחזיר אור שמש.", "g3_earth_moon_light", "basic", "understanding"],
]);
add("g3:earth_space:hard", EARTH, "sci_earth_space_general", [
  ["למה בישראל חם בקיץ וגשום בחורף?", ["אקלים ים תיכוני", "אין עונות", "הירח קובע גשם", "הים נעלם"], 0, "אקלים מקומי קובע עונות.", "g3_earth_med_climate", "advanced", "understanding"],
  ["מה שלב אחרי אידוי במחזור המים?", ["התעבות לעננים", "הצטברות באוקיינוס בלבד", "היעלמות מים", "הפסקת שמש"], 0, "אדים מתעבים לטיפות.", "g3_earth_condensation", "advanced", "understanding"],
]);

// ——— G3 environment ———
add("g3:environment:easy", ENV, "sci_environment_general", [
  ["מי בתחילת שרשרת מזון?", ["צמחים", "נמר", "עכבר", "עורב"], 0, "צמחים מייצרים מזון מאור.", "g3_env_food_chain_start", "basic", "recall"],
  ["למה ממחזרים נייר?", ["חוסך עצים ומשאבים", "מגדיל זבל", "מונע מים", "סוגר שמש"], 0, "נייר ממוחזר חוסך עצים.", "g3_env_paper_recycle", "basic", "understanding"],
]);
add("g3:environment:hard", ENV, "sci_environment_general", [
  ["מה קורה כשמכריתים יער?", ["פוגעים בבתי גידול", "מגדילים מינים", "מייצרים יותר חמצן", "אין השפעה"], 0, "כריתה מצמצמת מחיה.", "g3_env_deforestation", "advanced", "application"],
  ["למה זיהום אוויר מזיק?", ["מקשה על נשימה ובריאות", "מחזק צמחים", "מייצר מים", "אין השפעה"], 0, "חומרים באוויר פוגעים בריאות.", "g3_env_air_pollution", "advanced", "application"],
]);

// ——— G4 materials ———
add("g4:materials:easy", MAT, "sci_materials_general", [
  ["איך מפרידים חול ממים בכלי?", ["סינון או שקיעה", "בישול בלבד", "צביעה", "הקפאה"], 0, "הפרדה פיזית לפי גודל וצפיפות.", "g4_materials_sand_water_sep", "basic", "application"],
  ["מה תכונה של נוזל?", ["לוקח את צורת הכלי", "תמיד קשיח", "לא זז", "תמיד שקוף"], 0, "נוזלים נזילים.", "g4_materials_liquid_shape", "basic", "recall"],
]);

// ——— G4 earth_space ———
add("g4:earth_space:easy", EARTH, "sci_earth_space_general", [
  ["מה גורם ליום ולילה?", ["סיבוב כדור הארץ סביב צירו", "הירח נעלם", "השמש נכבית", "רק גשם"], 0, "סיבוב יוצר מחזור יום-לילה.", "g4_earth_rotation_day", "basic", "understanding"],
  ["מה השלב הראשון במחזור המים?", ["אידוי", "גשם", "התעבות", "שקיעה"], 0, "חום מגביר אידוי.", "g4_earth_water_cycle_start", "basic", "recall"],
]);

// ——— G4 environment ———
add("g4:environment:easy", ENV, "sci_environment_general", [
  ["מהו בית גידול?", ["מקום שבו בעל חיים וצמח חיים", "סוג מזון בלבד", "שם של פרח", "כלי בית ספר"], 0, "בית גידול כולל תנאים לחיים.", "g4_env_habitat_def", "basic", "recall"],
  ["מה מקור האנרגיה בשרשרת מזון?", ["השמש", "הירח", "האדמה בלבד", "הרוח בלבד"], 0, "אור השמש מזין יצרנים.", "g4_env_sun_energy_chain", "basic", "understanding"],
]);

// ——— G5 materials ———
add("g5:materials:easy", MAT, "sci_materials_general", [
  ["איזה חומר מבודד חשמל טוב?", ["גומי", "נחושת", "אלומיניום", "ברזל"], 0, "גומי עוצר זרימת זרם.", "g5_materials_insulator", "basic", "recall"],
  ["מה דוגמה לשינוי פיזיקלי?", ["התכת קרח", "בעירת נייר", "חמצון ברז", "הפקת אור"], 0, "התכה שומרת על מים.", "g5_materials_physical_change", "basic", "understanding"],
  ["מה תכונה אופיינית של מתכת?", ["מוליכה וגמישה לרוב", "תמיד שקופה", "תמיד רכה", "לא מוליכה"], 0, "מתכות מוליכות וניתנות לעיצוב.", "g5_materials_metal_props", "basic", "recall"],
]);
add("g5:materials:medium", MAT, "sci_materials_general", [
  ["מה משפיע על מהירות התמוססות מלח?", ["ערבוב וטמפרטורה", "צבע הקערה", "גובה החדר", "שם המלח בלבד"], 0, "חום וערבוב משנים קצב.", "g5_materials_dissolve_rate", "standard", "application"],
  ["מה הבדל בין תערובת לתרכוב?", ["תערובת ניתנת להפרדה פיזית", "אין הבדל", "תרכוב תמיד גז", "תערובת תמיד אטום"], 0, "בתרכוב חומרים משולבים כימית.", "g5_materials_mixture_compound", "standard", "understanding"],
]);

// ——— G5 earth_space ———
add("g5:earth_space:easy", EARTH, "sci_earth_space_general", [
  ["מה משפיע על מזג אוויר יומי?", ["טמפרטורה, לחות ורוח", "צבע הבגד", "גובה הכיסא", "שם העיר"], 0, "גורמים מטאורולוגיים קובעים מזג.", "g5_earth_daily_weather", "basic", "understanding"],
  ["למה נוצרת רוח?", ["תנועת אוויר בין אזורי לחץ", "סיבוב ירח בלבד", "צבע עננים", "גובה עצים"], 0, "הבדלי לחץ מניעים רוח.", "g5_earth_wind_pressure", "basic", "understanding"],
]);

// ——— G5 environment ———
add("g5:environment:easy", ENV, "sci_environment_general", [
  ["מה משמעות שימור טבע?", ["הגנה על מינים ובתי גידול", "ציד חופשי", "כריתת יער", "זריקת זבל"], 0, "שימור שומר על מערכות חיות.", "g5_env_conservation", "basic", "recall"],
  ["למה מיחזור חשוב?", ["מפחית פסולת ומשאבים", "מגדיל זבל", "מונע מים", "סוגר שמש"], 0, "מיחזור חוסך חומרים.", "g5_env_recycle_importance", "basic", "understanding"],
]);

// ——— G6 materials ———
add("g6:materials:easy", MAT, "sci_materials_general", [
  ["מה דוגמה לשינוי כימי?", ["חלודה על ברז", "התכת קרח", "שבירת זכוכית", "קיפיאון מים"], 0, "חמצון יוצר חומר חדש.", "g6_materials_chemical_change", "basic", "understanding"],
  ["איזה חומר מבודד חשמל?", ["פלסטיק עבה", "נחושת", "אלומיניום", "ברזל"], 0, "פלסטיק עוצר זרם.", "g6_materials_insulator_plastic", "basic", "recall"],
  ["מה מצבי הצבירה של מים?", ["מוצק, נוזל וגז", "רק נוזל", "רק גז", "רק פלסמה"], 0, "מים יכולים בכל שלושת המצבים.", "g6_materials_water_states", "basic", "recall"],
]);
add("g6:materials:medium", MAT, "sci_materials_general", [
  ["מה דוגמה לשינוי פיזיקלי במים?", ["קיפיאון והתכה", "בעירה לגז הליום", "חמצון לחלודה", "הפקת אור"], 0, "מעבר מצב צבירה הוא פיזיקלי.", "g6_materials_phase_change", "standard", "understanding"],
  ["מה משפיע על קצב התמוססות?", ["טמפרטורה וגודל גרגרים", "צבע הקערה", "שם החומר בלבד", "גובה השולחן"], 0, "חום ושטח פנים משנים קצב.", "g6_materials_dissolution_factors", "standard", "application"],
]);

// ——— G6 earth_space ———
add("g6:earth_space:easy", EARTH, "sci_earth_space_general", [
  ["מה קשור לעונות בחצי כדור?", ["נטיית ציר והקפה סביב השמש", "סיבוב ירח", "גובה עננים", "צבע ים"], 0, "זווית השמש ומסלול קובעים עונות.", "g6_earth_seasons_tilt", "basic", "understanding"],
  ["מה תפקיד השמש במחזור המים?", ["מספקת אנרגיה לאידוי", "מונעת גשם", "סוגרת עננים", "מחליפה את הירח"], 0, "חום השמש מאיץ אידוי.", "g6_earth_sun_water_cycle", "basic", "understanding"],
]);

// ——— G6 environment ———
add("g6:environment:easy", ENV, "sci_environment_general", [
  ["מהו גיוון ביולוגי?", ["מגוון מינים בסביבה", "צבע עננים", "גובה הר", "סוג בגד"], 0, "גיוון = הרבה מינים שונים.", "g6_env_biodiversity", "basic", "recall"],
  ["למה זיהום מים מסוכן?", ["פוגע בבריאות ובמערכות אקולוגיות", "מחזק דגים", "מייצר חמצן", "אין השפעה"], 0, "זיהום מזיק לחיים במים.", "g6_env_water_pollution", "basic", "understanding"],
]);

const LEVEL_ABBR = { easy: "eas", medium: "med", hard: "hard" };

function emitQuestion(key, patternFamily, subtype, row, index) {
  const [g, topic, lvl] = key.split(":");
  const [stem, options, correctIndex, explanation, conceptTag, difficulty, cognitiveLevel] = row;
  const abbr = LEVEL_ABBR[lvl];
  const num = String(index + 1).padStart(2, "0");
  const id = `sci_phb_${g}_${topic}_${abbr}_${num}`;
  return JSON.stringify(
    {
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
      params: {
        patternFamily: `sci_phb_${topic}_${g}_${lvl}_${conceptTag}`,
        subtype,
        conceptTag,
        difficulty,
        cognitiveLevel,
        kind: "phase_b",
      },
    },
    null,
    2,
  );
}

const parts = [];
const summary = {};
for (const [key, { patternFamily, subtype, rows }] of Object.entries(CELLS)) {
  rows.forEach((row, i) => {
    parts.push(emitQuestion(key, patternFamily, subtype, row, i));
    summary[key] = (summary[key] || 0) + 1;
  });
}

const outJs = `/**
 * Phase B Science expansion — materials, earth_space, environment (g1–g6).
 * Generated by scripts/gen-science-phase-b.mjs
 * Do not hand-edit; regenerate if batch structure changes.
 */
export const SCIENCE_QUESTIONS_PHASE_B = [
${parts.join(",\n")},
];
`;

writeFileSync(OUT, outJs, "utf8");
console.log(`Wrote ${parts.length} questions to ${OUT}`);
console.log("Summary by cell:", summary);
const total = Object.values(summary).reduce((a, b) => a + b, 0);
console.log("Total:", total);
if (total !== 75) {
  console.error(`ERROR: expected 75 items, got ${total}`);
  process.exit(1);
}
