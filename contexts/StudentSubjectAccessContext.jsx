import { createContext, useContext, useMemo } from "react";

const StudentSubjectAccessContext = createContext(null);

/**
 * @param {{
 *   children: React.ReactNode,
 *   allowStudentGradePicker?: boolean,
 *   subjectPermissions?: Record<string, {
 *     isEnabled?: boolean,
 *     isLockedByParent?: boolean,
 *     isGradeSuitable?: boolean,
 *     effectiveGrade?: string,
 *   }>,
 *   enforced?: boolean,
 * }} props
 */
export function StudentSubjectAccessProvider({
  children,
  allowStudentGradePicker = false,
  subjectPermissions = {},
  enforced = false,
}) {
  const value = useMemo(
    () => ({
      enforced,
      allowStudentGradePicker: allowStudentGradePicker === true,
      subjectPermissions,
    }),
    [enforced, allowStudentGradePicker, subjectPermissions]
  );

  return (
    <StudentSubjectAccessContext.Provider value={value}>
      {children}
    </StudentSubjectAccessContext.Provider>
  );
}

export function useStudentSubjectAccessContext() {
  return useContext(StudentSubjectAccessContext);
}

export default StudentSubjectAccessContext;
