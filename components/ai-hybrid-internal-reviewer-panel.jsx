import { useMemo, useState } from "react";
import { summarizeHybridRuntimeForReview } from "../utils/ai-hybrid-diagnostic/hybrid-review-summary.js";

const INTERNAL_HYBRID_REVIEWER_UI =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_INTERNAL_HYBRID_REVIEWER === "1";

function FieldRow({ label, children, mono = false }) {
  return (
    <div className="ai-hybrid-rev-row grid grid-cols-1 sm:grid-cols-[minmax(0,140px)_1fr] gap-1 sm:gap-3 text-sm border-b border-white/10 py-2 last:border-0">
      <div className="text-amber-200/90 font-semibold shrink-0">{label}</div>
      <div className={`text-white/90 min-w-0 break-words ${mono ? "font-mono text-xs" : ""}`}>{children}</div>
    </div>
  );
}

function UnitBlock({ unit, idx }) {
  const u = unit;
  const snap = u.v2AuthoritySnapshot || {};
  const aa = u.aiAssist || {};
  const rank = u.hypothesisRanking || {};
  const d = u.disagreement || {};
  const p = u.probeIntelligence || {};
  const ec = u.explanationContract || {};
  const ex = u.explanations || {};
  const par = ex.parent || {};
  const tea = ex.teacher || {};
  const ev = u.explanationValidator || {};
  const cands = Array.isArray(rank.candidates) ? rank.candidates : [];

  return (
    <details
      className="rounded-lg border border-emerald-500/25 bg-emerald-950/20 overflow-hidden mb-3 open:border-emerald-400/40"
      open={idx === 0}
    >
      <summary className="cursor-pointer select-none px-3 py-2.5 text-sm font-bold text-emerald-100/95 bg-emerald-950/30">
        יחידה {idx + 1}: <span className="font-mono text-xs opacity-90">{u.unitKey || "-"}</span>
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-1">
        <h4 className="text-xs font-extrabold text-white/70 uppercase tracking-wide mt-2 mb-1">v2AuthoritySnapshot</h4>
        <FieldRow label="taxonomyId">
          <span className="font-mono text-xs">{String(snap.taxonomyId ?? "-")}</span>
        </FieldRow>
        <FieldRow label="אבחון">
          {snap.diagnosis ? (
            <span className="font-mono text-xs">
              allowed={String(!!snap.diagnosis.allowed)} · taxonomyId={String(snap.diagnosis.taxonomyId ?? "-")}
            </span>
          ) : (
            "-"
          )}
        </FieldRow>
        <FieldRow label="snapshotHash">
          <span className="font-mono text-[11px] break-all">{String(snap.snapshotHash ?? "-")}</span>
        </FieldRow>

        <h4 className="text-xs font-extrabold text-white/70 uppercase tracking-wide mt-3 mb-1">aiAssist</h4>
        <FieldRow label="mode">
          <span className="font-mono text-xs font-bold text-sky-200">{String(aa.mode ?? "-")}</span>
        </FieldRow>
        <FieldRow label="suppressionFlags">
          {Array.isArray(aa.suppressionFlags) && aa.suppressionFlags.length ? (
            <ul className="list-disc pr-4 m-0 space-y-0.5 font-mono text-xs">
              {aa.suppressionFlags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : (
            <span className="text-white/50">אין</span>
          )}
        </FieldRow>

        <h4 className="text-xs font-extrabold text-white/70 uppercase tracking-wide mt-3 mb-1">היפותזה עליונה</h4>
        <FieldRow label="top1">
          <span className="font-mono text-xs">
            {String(rank.top1Id || "-")} · p={Number(rank.top1Probability || 0).toFixed(4)} · band=
            {String(rank.calibrationBand || "-")}
          </span>
        </FieldRow>
        {cands.length ? (
          <FieldRow label="מועמדים (עד 5)">
            <ol className="list-decimal pr-5 m-0 space-y-1 font-mono text-[11px]">
              {cands.slice(0, 5).map((c) => (
                <li key={`${c.candidateId}-${c.rank}`}>
                  #{c.rank} {c.candidateId} - p={Number(c.probability).toFixed(4)}
                </li>
              ))}
            </ol>
          </FieldRow>
        ) : null}

        <h4 className="text-xs font-extrabold text-white/70 uppercase tracking-wide mt-3 mb-1">התנגשות מול V2</h4>
        <FieldRow label="hasDisagreement">
          <span className={d.hasDisagreement ? "text-amber-300 font-bold" : "text-emerald-300"}>
            {String(!!d.hasDisagreement)}
          </span>
        </FieldRow>
        <FieldRow label="severity / action">
          <span className="font-mono text-xs">
            {String(d.severity ?? "-")} / {String(d.action ?? "-")}
          </span>
        </FieldRow>
        <FieldRow label="v2TopId vs aiTopId">
          <span className="font-mono text-xs break-all">
            {String(d.v2TopId || "-")} vs {String(d.aiTopId || "-")}
          </span>
        </FieldRow>
        <FieldRow label="reasonCodes">
          {Array.isArray(d.reasonCodes) && d.reasonCodes.length ? (
            <span className="font-mono text-[11px]">{d.reasonCodes.join(", ")}</span>
          ) : (
            "-"
          )}
        </FieldRow>

        <h4 className="text-xs font-extrabold text-white/70 uppercase tracking-wide mt-3 mb-1">צעד בדיקה (probe)</h4>
        <FieldRow label="suggestedProbeId">
          <span className="font-mono text-xs">{String(p.suggestedProbeId ?? "-")}</span>
        </FieldRow>
        <FieldRow label="מדדים">
          <span className="font-mono text-[11px]">
            Δאי ודאות≈{Number(p.uncertaintyReductionEstimate || 0).toFixed(3)} · עצירה=
            {String(p.stoppingRuleMet)} · הסלמה={String(p.escalationRuleTriggered)}
          </span>
        </FieldRow>

        <h4 className="text-xs font-extrabold text-white/70 uppercase tracking-wide mt-3 mb-1">הסבר (טקסט / סטטוס)</h4>
        <FieldRow label="outputStatus">{String(ec.outputStatus ?? "-")}</FieldRow>
        <FieldRow label="הורה (קצר)">
          <p className="text-xs leading-relaxed text-white/85 m-0 whitespace-pre-wrap">{par.text || "-"}</p>
        </FieldRow>
        <FieldRow label="מורה (קצר)">
          <p className="text-xs leading-relaxed text-white/85 m-0 whitespace-pre-wrap">{tea.text || "-"}</p>
        </FieldRow>

        <h4 className="text-xs font-extrabold text-white/70 uppercase tracking-wide mt-3 mb-1">אימות (validator)</h4>
        <FieldRow label="overallPass">
          <span className={ev.overallPass ? "text-emerald-300 font-bold" : "text-rose-300 font-bold"}>
            {String(!!ev.overallPass)}
          </span>
        </FieldRow>
        <FieldRow label="פירוט">
          <span className="font-mono text-[11px]">
            boundary={String(ev.boundaryPass)} · evidenceLink={String(ev.evidenceLinkPass)} · uncertainty=
            {String(ev.uncertaintyCompliancePass)}
          </span>
        </FieldRow>
        <FieldRow label="reasonCodes">
          {Array.isArray(ev.reasonCodes) && ev.reasonCodes.length ? (
            <span className="font-mono text-[11px] break-all">{ev.reasonCodes.join(", ")}</span>
          ) : (
            "-"
          )}
        </FieldRow>
      </div>
    </details>
  );
}

/**
 * Internal-only hybrid runtime inspector. Parent report narrative is unchanged; this block is mounted in a no-pdf region.
 */
export function AiHybridInternalReviewerPanel({ hybridRuntime }) {
  const summary = useMemo(() => summarizeHybridRuntimeForReview(hybridRuntime), [hybridRuntime]);
  const [jsonOpen, setJsonOpen] = useState(false);

  if (!INTERNAL_HYBRID_REVIEWER_UI) return null;

  if (!hybridRuntime) {
    return (
      <section
        className="ai-hybrid-internal-reviewer rounded-xl border border-amber-500/30 bg-amber-950/25 p-4 text-amber-100/90"
        dir="rtl"
      >
        <h3 className="text-base font-black m-0 mb-2">ביקורת פנימית - AI Hybrid</h3>
        <p className="text-sm m-0">
          אין <span className="font-mono">hybridRuntime</span> בדוח (null או לא עבר ולידציה). בדוק שהדוח נבנה עם מנוע V2
          ושאין כשל בטיחות.
        </p>
      </section>
    );
  }

  const units = Array.isArray(hybridRuntime.units) ? hybridRuntime.units : [];

  return (
    <section
      className="ai-hybrid-internal-reviewer rounded-xl border border-emerald-500/35 bg-[#0d1a14] p-3 md:p-4 text-white"
      dir="rtl"
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-lg font-black m-0 text-emerald-100">ביקורת פנימית - hybridRuntime</h3>
          <p className="text-xs text-white/60 m-0 mt-1">
            לא מוצג להורים בהדפסה. גרסה {summary.hybridRuntimeVersion || "-"} · exposure {summary.exposureMode || "-"}
          </p>
        </div>
        <button
          type="button"
          className="text-xs font-bold px-2 py-1 rounded border border-white/20 bg-white/5 hover:bg-white/10"
          onClick={() => setJsonOpen((v) => !v)}
        >
          {jsonOpen ? "הסתר JSON" : "הצג JSON גולמי (משני)"}
        </button>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/25 p-3 mb-4 text-sm">
        <h4 className="text-xs font-extrabold text-emerald-200/90 uppercase tracking-wide m-0 mb-2">סיכום Shadow (מקומי)</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div>
            <div className="text-white/50">סה״כ יחידות</div>
            <div className="text-white font-bold">{summary.totalUnits}</div>
          </div>
          <div>
            <div className="text-white/50">assist</div>
            <div>{summary.modeCounts.assist}</div>
          </div>
          <div>
            <div className="text-white/50">rank_only</div>
            <div>{summary.modeCounts.rank_only}</div>
          </div>
          <div>
            <div className="text-white/50">explain_only</div>
            <div>{summary.modeCounts.explain_only}</div>
          </div>
          <div>
            <div className="text-white/50">suppressed</div>
            <div>{summary.modeCounts.suppressed}</div>
          </div>
          <div>
            <div className="text-white/50">התנגשויות</div>
            <div className={summary.disagreementCount ? "text-amber-300 font-bold" : ""}>{summary.disagreementCount}</div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-white/50">פירוט חומרה (יחידות עם התנגשות)</div>
            <div className="text-[11px]">
              low {summary.disagreementSeveritySplit.low} · medium {summary.disagreementSeveritySplit.medium} · high{" "}
              {summary.disagreementSeveritySplit.high}
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="text-white/50">כל היחידות לפי severity (כולל none)</div>
            <div className="text-[11px]">
              none {summary.disagreementSeverityAllUnits.none} · low {summary.disagreementSeverityAllUnits.low} · medium{" "}
              {summary.disagreementSeverityAllUnits.medium} · high {summary.disagreementSeverityAllUnits.high}
            </div>
          </div>
          {summary.shadowEntriesSampled != null ? (
            <div className="sm:col-span-2">
              <div className="text-white/50">רשומות shadow שנדגמו (session)</div>
              <div>{summary.shadowEntriesSampled}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-extrabold text-white m-0 mb-2">לפי יחידה</h4>
        {units.map((unit, idx) => (
          <UnitBlock key={unit.unitKey || idx} unit={unit} idx={idx} />
        ))}
      </div>

      {jsonOpen ? (
        <div className="mt-2 text-[10px] font-mono text-white/50 break-all whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto border border-white/10 rounded p-2">
          {JSON.stringify(hybridRuntime, null, 2)}
        </div>
      ) : null}
    </section>
  );
}
