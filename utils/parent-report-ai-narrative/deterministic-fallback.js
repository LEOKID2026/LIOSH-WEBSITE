/**
 * Deterministic Hebrew narrative builder. Produces the SAME structured shape as the LLM:
 *   { summary, strengths[{textHe, sourceId}], focusAreas[{textHe, sourceId}], homeTips[], cautionNote }
 *
 * The fallback is the safety net for: no API key, LLM disabled, network failure, or AI output
 * that fails any validator step. Output passes all 9 validator steps by construction.
 */

function trim(s, max) {
  const t = typeof s === "string" ? s.trim() : "";
  return t.length > max ? t.slice(0, max) : t;
}

function bandToCopy(band) {
  switch (String(band || "").toLowerCase()) {
    case "high":
      return "תרגול בוגר ויציב";
    case "moderate":
      return "תרגול עקבי עם יציבות סבירה";
    case "mixed":
      return "תרגול מעורב, חלק מהתחומים יציבים יותר";
    default:
      return "תרגול שעדיין כדאי להתייחס אליו בזהירות";
  }
}

function buildSummary(packet) {
  const total = Math.max(0, Math.round(Number(packet?.overall?.totalQuestions) || 0));
  const accuracy = Math.max(0, Math.min(100, Number(packet?.overall?.accuracyPct) || 0));
  const dc = String(packet?.overall?.dataConfidence || "").toLowerCase();
  const studentName = trim(packet?.student?.displayName, 40);
  const subjectStr = (packet?.subjects || [])
    .filter((s) => Number(s.totalQuestions) > 0)
    .map((s) => s.displayNameHe)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const strengths = Array.isArray(packet?.strengths) ? packet.strengths : [];
  const focusAreas = Array.isArray(packet?.focusAreas) ? packet.focusAreas : [];
  const mixedGrade = packet?.mixedGradePractice === true;

  if (total === 0) {
    return "בתקופה זו לא נאסף תרגול במערכת. כדאי להמשיך לעקוב לאחר תרגול נוסף לפני הסקת מסקנות.";
  }
  if (mixedGrade && strengths.length === 0 && focusAreas.length === 0) {
    return "יש מעט תרגול בחומר של הכיתה הרשומה, ולכן כדאי להמשיך לתרגל עוד לפני הסקת מסקנות רחבות.";
  }
  if (dc === "thin" || dc === "low") {
    const opening = studentName ? `מהתרגול של ${studentName} בתקופה זו` : "מהתרגול בתקופה זו";
    return trim(
      `${opening} ניתן לקבל כיוון ראשוני בלבד. ${subjectStr ? `המקצועות המרכזיים שתורגלו: ${subjectStr}.` : ""} כדאי להמשיך לעקוב בעדינות ולא לקבוע חד משמעית רק ממפגש בודד.`,
      560
    );
  }
  const opening = studentName ? `מהתרגול של ${studentName} בתקופה זו` : "מהתרגול בתקופה זו";
  const accuracyDesc = bandToCopy(packet?.overall?.accuracyPct >= 85 ? "high" : packet?.overall?.accuracyPct >= 70 ? "moderate" : packet?.overall?.accuracyPct >= 50 ? "mixed" : "low");
  return trim(
    `${opening} עולה תמונה של ${accuracyDesc}. ${subjectStr ? `המקצועות שתורגלו בתקופה: ${subjectStr}.` : ""} מומלץ להמשיך עם שגרת תרגול קצרה ושוטפת כדי לחזק את התובנה.`,
    560
  );
}

function buildStrengthsBullets(packet) {
  const out = [];
  const candidates = Array.isArray(packet?.strengths) ? packet.strengths : [];
  for (const s of candidates) {
    if (out.length >= 3) break;
    if (!s?.sourceId || !s?.displayNameHe) continue;
    const evidence = trim(s.evidenceHe, 60);
    const text = evidence
      ? `התרגול ב${s.displayNameHe} נראה יציב - ${evidence}.`
      : `התרגול ב${s.displayNameHe} נראה יציב.`;
    out.push({ textHe: trim(text, 150), sourceId: s.sourceId });
  }
  return out;
}

function buildFocusBullets(packet) {
  const out = [];
  const candidates = Array.isArray(packet?.focusAreas) ? packet.focusAreas : [];
  for (const f of candidates) {
    if (out.length >= 3) break;
    if (!f?.sourceId || !f?.displayNameHe) continue;
    const evidence = trim(f.evidenceHe, 60);
    const text = evidence
      ? `כדאי להמשיך לחזק את ${f.displayNameHe} - ${evidence}.`
      : `כדאי להמשיך לחזק בעדינות את ${f.displayNameHe}.`;
    out.push({ textHe: trim(text, 150), sourceId: f.sourceId });
  }
  return out;
}

function buildHomeTips(packet) {
  const tips = [];
  const focusFirst = (packet?.focusAreas || [])[0];
  const strengthFirst = (packet?.strengths || [])[0];
  if (focusFirst?.displayNameHe) {
    tips.push(`לקבוע זמן קצר וקבוע בבית לתרגול עדין של ${focusFirst.displayNameHe}, ללא לחץ של זמן.`);
  } else {
    tips.push("לקבוע זמן קצר וקבוע בבית לתרגול שגרתי, ללא לחץ של זמן.");
  }
  if (strengthFirst?.displayNameHe) {
    tips.push(`להמשיך לעודד את ${strengthFirst.displayNameHe} בשיחה רגועה ובמשחקים פשוטים בבית.`);
  } else {
    tips.push("להעניק חיזוק חיובי על ניסיון ולא רק על תוצאה, ולשמור על שיח רגוע סביב הלמידה.");
  }
  if (tips.length < 3) {
    tips.push("לעקוב לאורך זמן ולתת לתמונה להתגבש לפני הסקת מסקנות חזקות.");
  }
  return tips.slice(0, 3).map((t) => trim(t, 150));
}

function buildCautionNote(packet) {
  const warnings = Array.isArray(packet?.thinDataWarnings) ? packet.thinDataWarnings : [];
  if (warnings.length === 0) return "";
  const overall = warnings.find((w) => w.scope === "overall");
  if (overall) {
    return trim("חשוב לזכור שהנתונים בתקופה זו מועטים - מדובר בכיוון ראשוני בלבד וכדאי להימנע ממסקנות חזקות.", 280);
  }
  const subjects = warnings
    .filter((w) => w.scope === "subject" && w.displayNameHe)
    .map((w) => w.displayNameHe)
    .slice(0, 3);
  if (subjects.length === 0) {
    return trim("חשוב לזכור שהנתונים בחלק מהתחומים מצומצמים - כדאי להמשיך לעקוב לפני הסקת מסקנות.", 280);
  }
  return trim(
    `חשוב לזכור שבמקצועות ${subjects.join(", ")} הנתונים מצומצמים בתקופה זו - מדובר בכיוון ראשוני בלבד.`,
    280
  );
}

/**
 * Builds a deterministic narrative output that matches the LLM output schema exactly.
 * @param {object} packet — Insight Packet (full, not the AI projection)
 * @returns {{ summary: string, strengths: {textHe:string,sourceId:string}[], focusAreas: {textHe:string,sourceId:string}[], homeTips: string[], cautionNote: string }}
 */
export function buildDeterministicFallbackNarrative(packet) {
  return {
    summary: buildSummary(packet),
    strengths: buildStrengthsBullets(packet),
    focusAreas: buildFocusBullets(packet),
    homeTips: buildHomeTips(packet),
    cautionNote: buildCautionNote(packet),
  };
}
