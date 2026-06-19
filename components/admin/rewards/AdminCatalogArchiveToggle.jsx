/** Shared toggle — show legacy/inactive rows in admin rewards tabs. */
export default function AdminCatalogArchiveToggle({ checked, onChange, className = "" }) {
  return (
    <label
      className={`inline-flex items-center gap-2 text-xs text-white/70 cursor-pointer select-none ${className}`}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      הצג גם לא פעילים / ארכיון
    </label>
  );
}
