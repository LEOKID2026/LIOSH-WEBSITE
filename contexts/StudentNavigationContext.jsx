import { createContext, useContext, useMemo, useRef } from "react";
import StudentNavigationFeedback from "../components/student-ui/StudentNavigationFeedback.jsx";

/** @type {{ clearNavigation: Function }} */
const defaultValue = {
  clearNavigation: () => {},
};

const StudentNavigationContext = createContext(defaultValue);

/** @param {{ children: import("react").ReactNode }} props */
export function StudentNavigationProvider({ children }) {
  const cancelNavigationRef = useRef(null);

  const value = useMemo(
    () => ({
      clearNavigation: () => {
        cancelNavigationRef.current?.();
      },
    }),
    [],
  );

  return (
    <StudentNavigationContext.Provider value={value}>
      {children}
      <StudentNavigationFeedback cancelRef={cancelNavigationRef} />
    </StudentNavigationContext.Provider>
  );
}

export function useStudentNavigation() {
  return useContext(StudentNavigationContext);
}
