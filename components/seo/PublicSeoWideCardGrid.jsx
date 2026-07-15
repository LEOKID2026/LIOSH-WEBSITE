import Link from "next/link";
import { getPublicSeoWideClasses } from "./public-seo-wide-theme";

/**
 * @param {{
 *   cards: { href: string, title: string, blurb?: string, emoji?: string }[],
 *   isBright: boolean,
 *   heading?: string,
 *   testId?: string,
 * }} props
 */
export default function PublicSeoWideCardGrid({
  cards,
  isBright,
  heading = "תחומי תרגול",
  testId,
}) {
  if (!cards?.length) return null;

  const cls = getPublicSeoWideClasses(isBright);

  return (
    <section className={`space-y-4 ${cls.section}`} data-testid={testId}>
      <h2 className={cls.sectionTitle}>{heading}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className={cls.hubCard}>
            {c.emoji ? (
              <span className="mb-2 block text-2xl" aria-hidden>
                {c.emoji}
              </span>
            ) : null}
            <span className={`block ${cls.hubCardTitle}`}>{c.title}</span>
            {c.blurb ? <span className={`block ${cls.hubCardBlurb}`}>{c.blurb}</span> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
