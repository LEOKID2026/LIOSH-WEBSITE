import LockedSubjectCard from "./LockedSubjectCard.jsx";
import { useStudentSubjectAccess } from "../../hooks/useStudentSubjectAccess.js";

/**
 * Blocks master page content when parent locked the subject.
 */
export default function MasterSubjectAccessScreen({ permissionKey, titleHe, children }) {
  const { isSubjectLocked, enforced } = useStudentSubjectAccess(permissionKey);
  if (enforced && isSubjectLocked) {
    return <LockedSubjectCard titleHe={titleHe || permissionKey} />;
  }
  return children;
}
