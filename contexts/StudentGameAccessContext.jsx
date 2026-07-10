import { createContext, useContext } from "react";

const StudentGameAccessContext = createContext(null);

/** @param {{ value: object, children: import("react").ReactNode }} props */
export function StudentGameAccessProvider({ value, children }) {
  return (
    <StudentGameAccessContext.Provider value={value}>{children}</StudentGameAccessContext.Provider>
  );
}

export { StudentGameAccessContext };
