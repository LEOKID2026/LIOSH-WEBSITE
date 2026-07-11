import { useEffect, useRef, useState } from "react";
import ParentDashboardModal from "./ParentDashboardModal";
import ParentCurriculumContent, {
  PARENT_CURRICULUM_SUBJECTS,
} from "./ParentCurriculumContent";

/**
 * Parent-facing full curriculum browser.
 * Bright parent-portal chrome; scrolls independently of subject tabs.
 */
export default function ParentCurriculumModal({ open, onClose, bright = false }) {
  const [activeSubject, setActiveSubject] = useState("math");
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => {
        if (!cancelled && bodyRef.current) {
          bodyRef.current.scrollTop = 0;
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(outerId);
      cancelAnimationFrame(innerId);
    };
  }, [open, activeSubject]);

  const toolbar = (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="בחירת מקצוע"
    >
      {PARENT_CURRICULUM_SUBJECTS.map((item) => {
        const active = item.key === activeSubject;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActiveSubject(item.key)}
            className={[
              "rounded-lg px-3 py-2 text-sm font-semibold transition whitespace-nowrap",
              active
                ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-200 ring-offset-1"
                : "bg-sky-50 border border-sky-200 text-slate-700 hover:bg-sky-100 hover:border-sky-300 shadow-sm",
            ].join(" ")}
          >
            {item.title}
          </button>
        );
      })}
    </div>
  );

  return (
    <ParentDashboardModal
      bright={bright}
      open={open}
      title="תוכניות הלימודים"
      onClose={onClose}
      size="4xl"
      toolbar={toolbar}
      bodyRef={bodyRef}
    >
      <div
        className="min-w-0 space-y-3 rounded-xl bg-slate-100/90 p-3 md:p-4 text-slate-800"
        dir="rtl"
      >
        <ParentCurriculumContent
          subject={activeSubject}
          onSelectSubject={setActiveSubject}
        />
      </div>
    </ParentDashboardModal>
  );
}
