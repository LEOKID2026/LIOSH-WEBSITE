import { createContext, useContext, useMemo } from "react";

/** @typedef {"loading" | "ok" | "blocked"} StudentSessionStatus */

/**
 * @typedef {object} StudentSessionContextValue
 * @property {StudentSessionStatus} status
 * @property {{ id: string, full_name?: string, grade_level?: string|null, coin_balance?: number, is_active?: boolean } | null} student
 */

/** @type {StudentSessionContextValue} */
const defaultValue = {
  status: "loading",
  student: null,
};

const StudentSessionContext = createContext(defaultValue);

/** @param {{ value: StudentSessionContextValue, children: import("react").ReactNode }} props */
export function StudentSessionProvider({ value, children }) {
  const memo = useMemo(
    () => ({
      status: value?.status || "loading",
      student: value?.student && typeof value.student === "object" ? value.student : null,
    }),
    [value?.status, value?.student]
  );
  return (
    <StudentSessionContext.Provider value={memo}>{children}</StudentSessionContext.Provider>
  );
}

/** @returns {StudentSessionContextValue} */
export function useStudentSessionContext() {
  return useContext(StudentSessionContext);
}
