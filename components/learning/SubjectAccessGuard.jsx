import LockedSubjectCard from "./LockedSubjectCard.jsx";

/**
 * @param {{
 *   permissionKey: string,
 *   titleHe?: string,
 *   isLocked: boolean,
 *   enforced?: boolean,
 *   children: React.ReactNode,
 * }} props
 */
export default function SubjectAccessGuard({
  permissionKey,
  titleHe,
  isLocked,
  enforced = true,
  children,
}) {
  if (enforced && isLocked) {
    return <LockedSubjectCard titleHe={titleHe || permissionKey} />;
  }
  return children;
}
