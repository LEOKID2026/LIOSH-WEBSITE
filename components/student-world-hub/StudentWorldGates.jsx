import Link from "next/link";
import { STUDENT_WORLD_GATES } from "./studentWorldHubConfig.js";

const gateById = Object.fromEntries(STUDENT_WORLD_GATES.map((g) => [g.id, g]));

function WorldGate({ gate, className = "" }) {
  if (!gate) return null;
  return (
    <Link
      href={gate.href}
      data-testid={`student-world-gate-${gate.id}`}
      className={`flex min-h-[3.5rem] w-full flex-col items-center justify-center rounded-xl border-2 bg-gradient-to-b px-2.5 py-2 text-center text-white shadow-lg transition hover:opacity-95 active:scale-[0.98] md:min-h-[5.25rem] md:px-4 md:py-3 ${gate.bgClass} ${className}`}
    >
      <span className="text-xl leading-none md:text-3xl" aria-hidden>
        {gate.emoji}
      </span>
      <span className="mt-0.5 text-[11px] font-bold leading-tight md:mt-1 md:text-sm">{gate.labelHe}</span>
    </Link>
  );
}

export default function StudentWorldGates() {
  const learning = gateById.learning;
  const games = gateById.games;
  const club = gateById.club;

  return (
    <div className="w-full" data-testid="student-world-gates">
      {/* Desktop: שלושה שערים בשורה אחת במרכז */}
      <div className="mx-auto hidden w-full max-w-2xl grid-cols-3 gap-4 md:grid lg:max-w-3xl lg:gap-5">
        <WorldGate gate={games} />
        <WorldGate gate={club} />
        <WorldGate gate={learning} />
      </div>

      {/* Mobile: 2 עמודות + מועדון full width.
          -translate-y-28 מזיז חזותית בלבד ומשאיר חלל layout מתחת לשערים;
          ב-viewport נמוך מצמצמים את החלל ב-margin-bottom שלילי (משפיע על הזרימה). */}
      <div
        className="mx-auto w-full max-w-[16rem] -translate-y-28 space-y-2 sm:max-w-[17rem] md:hidden -mb-[clamp(0px,calc((800px-100dvh)*1.25),6rem)]"
        data-testid="student-world-gates-mobile"
      >
        <div className="grid grid-cols-2 gap-2">
          <WorldGate gate={games} />
          <WorldGate gate={learning} />
        </div>
        <WorldGate gate={club} />
      </div>
    </div>
  );
}
