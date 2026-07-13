import Link from "next/link";
import { useSharedShellUi } from "../../hooks/useSharedShellUi.js";

export default function HelpRelatedLinks({ items }) {
  const { SP } = useSharedShellUi();
  if (!items?.length) return null;
  return (
    <aside className={SP.relatedAside}>
      <h2 className={SP.relatedTitle}>קישורים קשורים</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className={SP.relatedLink}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
