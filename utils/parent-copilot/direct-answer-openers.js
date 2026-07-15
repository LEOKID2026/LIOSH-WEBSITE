/**
 * Short parent-facing direct openers (behavior class), prepended before grounded contract text.
 * Must stay bounded and non-meta; specifics follow from contract slots.
 */

/**
 * @param {string} intent
 * @param {object} truthPacket
 */
export function parentDirectOpenerHe(intent, truthPacket) {
  const k = String(intent || "").trim();
  const dl = truthPacket?.derivedLimits || {};
  const exec = String(truthPacket?.scopeType || "") === "executive";
  const recOk = !!dl.recommendationEligible && String(dl.recommendationIntensityCap || "RI0") !== "RI0";
  const fragile = !!dl.cannotConcludeYet || String(dl.confidenceBand || "") === "low" || String(dl.readiness || "") === "insufficient";
  const sfQ = Math.max(0, Number(truthPacket?.surfaceFacts?.questions ?? 0));
  const sfA = Math.max(0, Number(truthPacket?.surfaceFacts?.accuracy ?? 0));
  /** Enough practice in-window to avoid «no basis» framing for action intents (executive rollup). */
  const practiceLooksSubstantial = sfQ >= 90 && sfA >= 50;

  switch (k) {
    case "explain_report":
    case "ask_topic_specific":
    case "ask_subject_specific":
      return exec
        ? "הנה מה שמופיע בדוח לגבי התקופה:"
        : "הנה מה שמופיע בדוח לגבי הנושא הזה:";
    case "what_is_most_important":
      return fragile
        ? "יש כמה תחומים שעדיין לא יציבים - כדאי להתחיל מהם:"
        : exec
          ? ""
          : "הנה מה שכדאי לשים לב אליו קודם לפי הדוח:";
    case "what_to_do_today":
    case "what_to_do_this_week":
      if (recOk) {
        if (exec) return "";
        return k === "what_to_do_today"
          ? "הנה מה שכדאי לעשות היום לפי הנתונים:"
          : "הנה הצעד המומלץ לשבוע הקרוב לפי הנתונים:";
      }
      if (practiceLooksSubstantial && !fragile) {
        return k === "what_to_do_today"
          ? "יש מספיק נתונים לבחור צעד קטן וממוקד להיום:"
          : "בשבוע הקרוב אפשר לבחור תרגול קצר וממוקד:";
      }
      if (practiceLooksSubstantial && fragile) {
        return "יש נפח תרגול בדוח, אבל חלק מהניסוחים עדיין זהירים - כדאי לצעדים קטנים ומדידים:";
      }
      return k === "what_to_do_today"
        ? "כדאי להתחיל בצעד קטן ולצבור עוד תרגול:"
        : "כדאי לצבור עוד תרגול - הנה כיוון ראשוני:";
    case "why_not_advance":
      return "עצירת קידום ברמה קשורה בדרך כלל לניסוח שעדיין לא נסגר בדוח - לא בהכרח כישלון.";
    case "what_is_going_well":
      return exec ? "" : "הנה מה שנראה חזק יחסית בתרגול, לפי הדוח:";
    case "what_is_still_difficult":
      return "הנה מה שעדיין דורש חיזוק ותרגול, לפי הדוח:";
    case "how_to_tell_child":
      return "עדיף משפט אחד רגוע על מה שרואים בדוח, ורק אז משפט משמעות קצר - בשפה פשוטה.";
    case "question_for_teacher":
      return "שאלה טובה למורה מצביעה על מה שמופיע בדוח - קצרה וספציפית.";
    case "is_intervention_needed":
      return fragile
        ? "הדוח מציג כמה תחומים שעדיין לא מיושבים לגמרי. זה לא בהכרח \"בעיה חמורה\":"
        : exec
          ? ""
          : "בשלב הזה אין סיבה לדאגה גדולה לפי הדוח. הנה מה שמופיע:";
    case "clarify_term":
      return "נשארים עם המילים שמופיעות בדוח עצמו:";
    case "strength_vs_weakness_summary":
      return "הנה שני הכיוונים שהדוח מציג - מה חזק יותר ומה עדיין דורש עבודה:";
    case "off_topic_redirect":
    case "simple_parent_explanation":
      return "";
    default:
      return exec ? "" : "";
  }
}

export default { parentDirectOpenerHe };
