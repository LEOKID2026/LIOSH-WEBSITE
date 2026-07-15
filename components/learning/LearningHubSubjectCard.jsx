import Link from "next/link";
import { useStudentSubjectAccess } from "../../hooks/useStudentSubjectAccess.js";

/**
 * @param {{
 *   slug: string,
 *   permissionKey: string,
 *   title: string,
 *   emoji: string,
 *   blurb: string,
 *   subjectCard: { card: string, bar: string, emoji: string },
 *   hubCardTokens: Record<string, string>,
 * }} props
 */
export default function LearningHubSubjectCard({
  slug,
  permissionKey,
  title,
  emoji,
  blurb,
  subjectCard,
  hubCardTokens: T,
}) {
  const { enforced, isSubjectLocked } = useStudentSubjectAccess(permissionKey);
  const locked = enforced && isSubjectLocked;

  const cardClass = `${T.hubCardBase} ${subjectCard.card}`;
  const inner = (
    <>
      <span className={`${T.hubCardBar} ${subjectCard.bar}`} aria-hidden />
      <div className={T.hubCardHeadRow}>
        <span className={`${T.hubCardEmoji} ${subjectCard.emoji}`} aria-hidden>
          {emoji}
        </span>
        <h2 className={T.hubCardTitle}>{title}</h2>
      </div>
      <p className={T.hubCardBlurb}>{blurb}</p>
      {locked ? (
        <p className="mt-2 text-xs font-semibold text-amber-200/90">נעול על ידי ההורים</p>
      ) : null}
    </>
  );

  if (locked) {
    return (
      <div
        className={`${cardClass} opacity-90 cursor-not-allowed`}
        aria-disabled="true"
        aria-label={`${title} - נעול על ידי ההורים`}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link href={`/student/learning/${slug}`} className={cardClass}>
      {inner}
    </Link>
  );
}
