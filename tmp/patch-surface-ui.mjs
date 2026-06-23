import fs from "node:fs";

const p = "components/parent-report-detailed-surface.jsx";
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf("/** שדות Phase 3");
const end = s.indexOf("/** פירוט מקוצר למקצוע");
if (start < 0 || end < 0) throw new Error("markers not found");

const replacement = `/** Parent-facing extras only — inline, no accordion. */
export function SubjectPhase3Insights({ sp, compact }) {
  void compact;
  const letter = useMemo(() => buildSubjectParentLetter(sp), [sp]);
  const rows = [];
  const dr = String(sp?.dominantLearningRiskLabelHe || "").trim();
  if (dr) rows.push({ k: "מה חוזר בטעויות", v: pr1ParentVisibleTextHe(dr) });
  const ds = String(sp?.dominantSuccessPatternLabelHe || "").trim();
  if (ds) rows.push({ k: "מה עובד טוב", v: pr1ParentVisibleTextHe(ds) });
  const wnt = String(sp?.whatNotToDoHe || "").trim();
  if (wnt && (!letter?.closing || !String(letter.closing).includes(wnt.slice(0, 24)))) {
    rows.push({ k: "מה לא לעשות", v: truncateHe(pr1ParentVisibleTextHe(wnt), 200) });
  }
  const trLine = String(transferReadinessLineHe(sp) || "").trim();
  const trMapped = pr1CrossSubjectTransferDisplayHe(String(sp?.subjectTransferReadiness || "").trim());
  const trCombined = pr1ParentVisibleTextHe(trLine || (trMapped !== "לא ברור" ? trMapped : ""));
  if (trCombined) {
    rows.push({ k: "האם זה נשמר בשאלה חדשה", v: truncateHe(trCombined, 160) });
  }

  if (!rows.length) return null;

  return (
    <div className="parent-surface-only pr-detailed-phase3-dl space-y-2 m-0 mb-2 rounded-lg border border-white/10 bg-black/10 px-2 py-2">
      {rows.map(({ k, v }) => (
        <div key={k} className="min-w-0">
          <div className="text-white/50 font-bold text-[11px] md:text-xs m-0 mb-0.5">{k}</div>
          <div className="m-0 text-white/[0.88] leading-relaxed text-[11px] md:text-sm">
            {pr1ParentVisibleTextHe(String(v))}
          </div>
        </div>
      ))}
    </div>
  );
}

`;

s = s.slice(0, start) + replacement + s.slice(end);

if (!s.includes("export function SubjectTopicTierGroups")) {
  const insertAt = s.indexOf("/** פירוט מקוצר למקצוע");
  const tierBlock = `/** Parent-facing topic rows grouped by unified tier. */
export function SubjectTopicTierGroups({ sp }) {
  const groups = sp?.topicGroupsByTier;
  if (!groups || typeof groups !== "object") return null;
  const order = [
    PARENT_TOPIC_TIER.STRONG,
    PARENT_TOPIC_TIER.MONITOR,
    PARENT_TOPIC_TIER.STRENGTHEN,
    PARENT_TOPIC_TIER.CLEAR_GAP,
    PARENT_TOPIC_TIER.NEEDS_GUIDANCE,
    PARENT_TOPIC_TIER.LOW_EVIDENCE,
  ];
  const sections = order
    .map((tier) => {
      const rows = Array.isArray(groups[tier]) ? groups[tier] : [];
      if (!rows.length) return null;
      return (
        <div key={tier} className="parent-surface-only pr-detailed-topic-tier-group mb-3">
          <p className="pr-detailed-topic-rec-head">{parentTopicTierSectionTitleHe(tier)}</p>
          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.topicRowKey}
                className="pr-detailed-topic-overview-item rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2.5"
              >
                <div className="pr-detailed-body-text font-bold text-white/95 leading-snug">
                  {row.narrativeTitleHe}
                </div>
                {row.gradeRelationSublineHe ? (
                  <p className="pr-detailed-muted text-xs m-0 mt-0.5 text-white/60">
                    {row.gradeRelationSublineHe}
                  </p>
                ) : null}
                <p className="pr-detailed-body-text text-sm m-0 mt-1.5 text-white/[0.88]">
                  {row.overviewStatusHe} · {row.questions} שאלות · דיוק {row.accuracy}%
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    })
    .filter(Boolean);
  if (!sections.length) return null;
  return <div className="pr-detailed-topic-overview-block parent-surface-only space-y-1">{sections}</div>;
}

export function SubjectPrimaryActionBlock({ actionHe }) {
  const text = pr1ParentVisibleTextHe(String(actionHe || ""));
  if (!text) return null;
  return (
    <div className="parent-surface-only rounded-lg border border-amber-400/28 bg-amber-950/14 px-3 py-2.5">
      <p className="pr-detailed-mini-heading font-bold text-amber-100/95 mb-1 text-sm">
        מה כדאי לעשות במקצוע הזה
      </p>
      <p className="pr-detailed-body-text text-sm leading-relaxed m-0 text-white/[0.91]">{text}</p>
    </div>
  );
}

`;
  s = s.slice(0, insertAt) + tierBlock + s.slice(insertAt);
}

s = s.replace(
  /\{L\.homeAction \? \(\s*<details className="rounded-lg border border-white\/12 bg-white\/\[0\.03\] px-3 py-2\.5">[\s\S]*?<\/details>\s*\) : null\}/,
  `{L.homeAction ? (
          <div className="parent-surface-only rounded-lg border border-amber-400/28 bg-amber-950/14 px-3 py-2.5">
            <p className="pr-detailed-mini-heading font-bold text-amber-100/95 mb-1 text-sm">איך כדאי לעבוד על זה</p>
            <p className="pr-detailed-body-text text-sm leading-relaxed m-0">{L.homeAction}</p>
          </div>
        ) : null}`
);

fs.writeFileSync(p, s);
console.log("patched", p);
