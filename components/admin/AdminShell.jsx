import Link from "next/link";

export default function AdminShell({ title, children }) {
  return (
    <div className="min-h-[60vh] text-white" dir="ltr">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/15 pb-4">
        <div>
          <p className="text-xs text-white/50 uppercase tracking-wide">Platform admin</p>
          <h1 className="text-xl font-bold">{title}</h1>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/admin/teachers" className="text-amber-300 hover:underline">
            Teachers
          </Link>
          <Link href="/teacher/dashboard" className="text-white/60 hover:underline">
            Teacher portal
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
