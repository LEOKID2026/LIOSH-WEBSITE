import { useSharedShellUi } from "../../hooks/useSharedShellUi.js";

export default function HelpTOC({ toc }) {
  const { SP } = useSharedShellUi();
  if (!toc?.length) return null;

  const list = (
    <ul className="space-y-2 text-sm">
      {toc.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} className={SP.tocLink}>
            {item.title}
          </a>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <details className={SP.tocMobile}>
        <summary className={SP.tocMobileSummary}>תוכן העניינים</summary>
        <nav aria-label="תוכן העניינים" className="mt-3 text-right">
          {list}
        </nav>
      </details>
      <nav aria-label="תוכן העניינים" className={SP.tocDesktop}>
        <h2 className={SP.tocTitle}>תוכן העניינים</h2>
        {list}
      </nav>
    </>
  );
}
