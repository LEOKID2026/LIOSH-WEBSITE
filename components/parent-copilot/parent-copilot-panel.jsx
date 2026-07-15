import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import parentCopilot from "../../utils/parent-copilot/index.js";
import { ParentCopilotQuickActions } from "./parent-copilot-quick-actions.jsx";

/** Deterministic UI pacing (ms), plan range 250–450 */
const PROCESSING_UI_MS = 320;

/** Scroll "at bottom" tolerance (px) */
const SCROLL_BOTTOM_EPS = 28;

function makeSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `pc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lineId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `ln-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function previewText(text, maxLen) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

/**
 * Completed assistant turns = assistant bubbles that carry a runtime response (not intro, not processing).
 * @param {Array<{ role: string; kind?: string; response?: object }>} lines
 */
function countCompletedAssistantTurns(lines) {
  let n = 0;
  for (const ln of lines) {
    if (ln.role === "assistant" && ln.kind !== "processing" && ln.response) n += 1;
  }
  return n;
}

/**
 * Optional server-side runner (e.g. `/api/parent/copilot-turn`) - keeps LLM keys off the client.
 * When omitted, uses bundled `runParentCopilotTurnAsync` / `runParentCopilotTurn` (detailed report default).
 *
 * @param {{ payload: object; selectedContextRef?: object | null; asyncTurnRunner?: ((input: object) => Promise<unknown>) | null }} props
 */
export function ParentCopilotPanel({ payload, selectedContextRef = null, asyncTurnRunner = null }) {
  const formId = useId();
  const [sessionId] = useState(() => makeSessionId());
  const [utterance, setUtterance] = useState("");
  const [lines, setLines] = useState(() => []);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const userPinnedBottomRef = useRef(true);

  const updatePinnedFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    userPinnedBottomRef.current = dist <= SCROLL_BOTTOM_EPS;
  }, []);

  const scrollToBottomIfPinned = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !userPinnedBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottomIfPinned();
  }, [lines, scrollToBottomIfPinned]);

  const submit = useCallback(
    async (text, meta = {}) => {
      const q = String(text || "").trim();
      if (!q || busy) return;
      setBusy(true);
      userPinnedBottomRef.current = true;

      const userLine = { id: lineId(), role: "user", text: q };
      const processingLine = {
        id: lineId(),
        role: "assistant",
        kind: "processing",
        text: "מעבד את הדוח…",
      };

      setLines((prev) => [...prev, userLine, processingLine]);
      await sleep(PROCESSING_UI_MS);

      try {
        const turnInput = {
          audience: "parent",
          payload,
          utterance: q,
          sessionId,
          selectedContextRef,
          clickedFollowupFamily: meta.clickedFollowupFamily || null,
        };
        const res =
          typeof asyncTurnRunner === "function"
            ? await asyncTurnRunner(turnInput)
            : await (typeof parentCopilot.runParentCopilotTurnAsync === "function"
                ? parentCopilot.runParentCopilotTurnAsync(turnInput)
                : Promise.resolve(parentCopilot.runParentCopilotTurn(turnInput)));

        let answerCore = "";
        let fullText = "";
        if (res.resolutionStatus === "clarification_required") {
          answerCore = String(res.clarificationQuestionHe || "").trim();
          fullText = answerCore;
        } else {
          answerCore = (res.answerBlocks || []).map((b) => b.textHe).join("\n\n");
          fullText = answerCore;
          if (res.suggestedFollowUp?.textHe) {
            fullText += `\n\n- ${res.suggestedFollowUp.textHe}`;
          }
        }

        const processingId = processingLine.id;
        const isClarification = res.resolutionStatus === "clarification_required";
        const followUpHe =
          !isClarification && res.suggestedFollowUp?.textHe ? String(res.suggestedFollowUp.textHe) : "";
        const assistantLine = {
          id: lineId(),
          role: "assistant",
          kind: "message",
          text: fullText,
          answerCore,
          followUpText: followUpHe,
          revealFollowUp: isClarification || !followUpHe,
          response: isClarification ? null : res,
        };

        setLines((prev) => {
          const withoutProc = prev.filter((l) => l.id !== processingId);
          return [...withoutProc, assistantLine];
        });

        requestAnimationFrame(() => {
          setLines((prev) =>
            prev.map((l) => (l.id === assistantLine.id ? { ...l, revealFollowUp: true } : l)),
          );
        });
      } catch (e) {
        const processingId = processingLine.id;
        const errText =
          e instanceof Error && String(e.message || "").trim()
            ? String(e.message).trim()
            : "לא ניתן לענות על השאלה כרגע. נסו שוב בעוד רגע.";
        setLines((prev) => {
          const withoutProc = prev.filter((l) => l.id !== processingId);
          return [
            ...withoutProc,
            {
              id: lineId(),
              role: "assistant",
              kind: "message",
              text: errText,
              answerCore: errText,
              followUpText: "",
              revealFollowUp: true,
              response: null,
            },
          ];
        });
      } finally {
        setBusy(false);
        setUtterance("");
      }
    },
    [busy, payload, selectedContextRef, sessionId, asyncTurnRunner],
  );

  const lastResponse = useMemo(() => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].role === "assistant" && lines[i].response) return lines[i].response;
    }
    return null;
  }, [lines]);

  const quickItems = useMemo(() => {
    const qa = lastResponse?.quickActions;
    if (!Array.isArray(qa) || !qa.length) return [];
    return qa.map((a) => ({
      id: a.id,
      labelHe: a.labelHe,
      enabled: !!a.enabled,
      disabledReasonCode: a.disabledReasonCode,
      onPress: () => {
        const preset =
          a.id === "qa_action_today"
            ? "מה לעשות היום בבית?"
            : a.id === "qa_action_week"
              ? "מה לעשות השבוע?"
              : a.id === "qa_avoid_now"
                ? "מה לא לעשות עכשיו?"
                : a.id === "qa_advance_or_hold"
                  ? "להתקדם או להמתין?"
                  : a.id === "qa_explain_to_child"
                    ? "איך להסביר לילד?"
                    : "שאלה למורה";
        const familyMap = {
          qa_action_today: "action_today",
          qa_action_week: "action_week",
          qa_avoid_now: "avoid_now",
          qa_advance_or_hold: "advance_or_hold",
          qa_explain_to_child: "explain_to_child",
          qa_ask_teacher: "ask_teacher",
        };
        submit(preset, { clickedFollowupFamily: familyMap[a.id] || null });
      },
    }));
  }, [lastResponse, submit]);

  const completedAssistantTurns = useMemo(() => countCompletedAssistantTurns(lines), [lines]);
  const shouldCompactHistory = completedAssistantTurns >= 4;

  let lastUserIndex = -1;
  let lastAssistantIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lastUserIndex < 0 && lines[i].role === "user") lastUserIndex = i;
    if (lastAssistantIndex < 0 && lines[i].role === "assistant" && lines[i].kind !== "processing") {
      lastAssistantIndex = i;
    }
    if (lastUserIndex >= 0 && lastAssistantIndex >= 0) break;
  }

  const activeExchangeBusy = busy;

  return (
    <div
      className="w-full flex flex-col rounded-xl border border-white/12 bg-black/25 p-3 text-right text-white/90"
      style={{ height: "420px", minHeight: "420px" }}
    >
      <div className="flex items-center justify-between gap-2 shrink-0 mb-1">
        <div className="text-xs font-extrabold tracking-wide text-white/70">שאלו על הדוח</div>
        <Link
          href="/ai-disclosure"
          className="text-[10px] text-sky-300/80 hover:text-sky-200 underline whitespace-nowrap shrink-0"
        >
          מידע על שימוש בבינה מלאכותית
        </Link>
      </div>
      <p className="text-[11px] leading-snug text-white/45 shrink-0 mb-1 pr-0.5" role="note">
        המידע מבוסס על נתוני התרגול באתר ואינו אבחון או ייעוץ מקצועי.
      </p>
      <p className="text-[11px] leading-snug text-white/45 shrink-0 mb-2 pr-0.5">
        אפשר לשאול כאן בחופשיות על הדוח, למשל: מה הכי חשוב כרגע, במה להתמקד השבוע, מה הולך טוב, או איך להסביר את זה לילד.
      </p>

      <div
        ref={scrollRef}
        onScroll={updatePinnedFromScroll}
        className="flex-1 min-h-0 overflow-y-auto space-y-2 text-sm leading-relaxed pr-0.5"
      >
        {lines.map((ln, i) => {
          if (ln.kind === "processing") {
            return (
              <div key={ln.id} className="text-white/50 whitespace-pre-wrap animate-pulse text-xs">
                {ln.text}
              </div>
            );
          }

          const isUser = ln.role === "user";
          const isLastUser = isUser && i === lastUserIndex;
          const isLastAssistant = ln.role === "assistant" && i === lastAssistantIndex;
          const inActiveBusyTail = activeExchangeBusy && lastUserIndex >= 0 && i >= lastUserIndex;

          let displayText = ln.text;
          if (ln.role === "assistant" && ln.kind === "message" && ln.answerCore != null) {
            const core = String(ln.answerCore || "");
            const fu = ln.followUpText && ln.revealFollowUp ? `\n\n- ${ln.followUpText}` : "";
            displayText = core + fu;
          }

          let compact = false;
          if (shouldCompactHistory && !inActiveBusyTail) {
            if (isUser && !isLastUser) compact = true;
            if (ln.role === "assistant" && ln.kind === "message" && !isLastAssistant) compact = true;
          }

          const body = compact ? previewText(displayText, 140) : displayText;

          return (
            <div
              key={ln.id}
              className={
                isUser
                  ? "text-emerald-100/95 whitespace-pre-wrap"
                  : "text-white/85 whitespace-pre-wrap"
              }
            >
              {isUser ? <span className="font-bold text-white/50">אתם: </span> : null}
              {body}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 mt-2 pt-2 border-t border-white/10 space-y-2">
        <ParentCopilotQuickActions items={quickItems} compact />
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            submit(utterance);
          }}
        >
          <label htmlFor={formId} className="sr-only">
            שאלה
          </label>
          <input
            id={formId}
            className="flex-1 min-w-0 rounded-lg border border-white/15 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/35"
            placeholder="שאלה על הדוח…"
            value={utterance}
            disabled={busy}
            onChange={(e) => setUtterance(e.target.value)}
          />
          <button
            type="submit"
            disabled={busy || !utterance.trim()}
            className="shrink-0 rounded-lg border border-sky-400/40 bg-sky-900/35 px-4 py-2 text-sm font-bold text-sky-50 disabled:opacity-40"
          >
            שלח
          </button>
        </form>
      </div>
    </div>
  );
}
