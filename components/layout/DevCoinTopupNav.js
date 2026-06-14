"use client";

import { useEffect, useRef, useState } from "react";

/**
 * כלי פיתוח — בתפריט שולחני (כפתור + תפריט נפתח) ובמובייל (בתוך המגירה).
 */
export default function DevCoinTopupNav({ variant = "desktop" }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [balanceAfter, setBalanceAfter] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (variant !== "desktop" || !open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [variant, open]);

  const onSubmit = async () => {
    setBusy(true);
    setMsg("");
    setBalanceAfter(null);
    try {
      const res = await fetch("/api/student/dev-add-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setMsg("לא מחובר כילד/ה");
        return;
      }
      if (res.status === 403 && data?.code === "invalid_code") {
        setMsg("קוד שגוי");
        return;
      }
      if (!data?.ok) {
        setMsg(typeof data?.error === "string" ? data.error : "שגיאה");
        return;
      }
      setMsg("נוספו 1000 מטבעות");
      if (data.balance_after != null) {
        setBalanceAfter(Number(data.balance_after));
      }
    } catch {
      setMsg("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const formInner = (
    <>
      <p className="text-[10px] text-white/55">הוספת 1000 מטבעות (פיתוח)</p>
      <div className="mt-2 flex gap-1.5">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="קוד"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="h-8 flex-1 min-w-0 rounded border border-white/25 bg-black/40 px-2 text-xs text-white placeholder:text-white/35"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSubmit()}
          className="h-8 shrink-0 rounded bg-amber-500 px-2.5 text-[11px] font-bold text-zinc-900 disabled:opacity-40"
        >
          הוסף
        </button>
      </div>
      {msg ? (
        <p className="mt-2 text-[10px] text-white/75">
          {msg}
          {balanceAfter !== null ? ` · יתרה: ${balanceAfter}` : ""}
        </p>
      ) : null}
    </>
  );

  if (variant === "mobile") {
    return (
      <div className="border-t border-white/15 pt-3 mt-1">
        <p className="text-[11px] font-semibold text-amber-200/95 mb-2">בדיקת מטבעות</p>
        {formInner}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/90 hover:bg-white/10"
      >
        בדיקת מטבעות
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+6px)] z-[60] w-56 rounded-lg border border-white/20 bg-zinc-950/98 p-3 shadow-xl backdrop-blur-sm">
          {formInner}
        </div>
      ) : null}
    </div>
  );
}
