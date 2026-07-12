import { createContext, useContext } from "react";

/**
 * Layout variant for `/student/activity/[activityId]`.
 * `textualAssigned` applies only to hebrew/english/science/history/moledet_geography.
 */
const StudentActivityLayoutVariantContext = createContext({
  textualAssigned: false,
});

/**
 * @param {{ textualAssigned?: boolean, children: React.ReactNode }} props
 */
export function StudentActivityLayoutVariantProvider({
  textualAssigned = false,
  children,
}) {
  return (
    <StudentActivityLayoutVariantContext.Provider
      value={{ textualAssigned: Boolean(textualAssigned) }}
    >
      {children}
    </StudentActivityLayoutVariantContext.Provider>
  );
}

export function useStudentActivityLayoutVariant() {
  return useContext(StudentActivityLayoutVariantContext);
}
