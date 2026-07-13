import Link from "next/link";
import { useSharedShellUi } from "../../hooks/useSharedShellUi.js";

export default function HelpBreadcrumb({ items }) {
  const { SP } = useSharedShellUi();
  if (!items?.length) return null;
  return (
    <nav aria-label="ניווט מסלול" className={SP.breadcrumbNav}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={item.href || item.label} className="flex items-center gap-1">
            {i > 0 ? <span aria-hidden className={SP.breadcrumbSep}>/</span> : null}
            {item.href ? (
              <Link href={item.href} className={SP.breadcrumbLink}>
                {item.label}
              </Link>
            ) : (
              <span className={SP.breadcrumbCurrent} aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
