export default function LockedSubjectCard({ titleHe = "המקצוע נעול" }) {
  return (
    <div
      className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-6 text-center"
      dir="rtl"
    >
      <p className="text-lg font-bold text-amber-100">{titleHe}</p>
      <p className="mt-2 text-sm text-white/80">נעול על ידי ההורים</p>
    </div>
  );
}
