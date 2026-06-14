import { useState } from "react";
import TeacherDiscussionQuestionPicker from "./TeacherDiscussionQuestionPicker";

/**
 * @param {{ accessToken: string, studentId: string, gradeLevel?: string|null }} props
 */
export default function TeacherStudentDiscussionPanel({ accessToken, studentId, gradeLevel }) {
  const [open, setOpen] = useState(false);
  const resolvedGrade = gradeLevel || "g3";

  return (
    <section className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-lg font-semibold text-cyan-100">פעילות דיון (ילד/ה)</h2>
        <button
          type="button"
          className="text-sm px-3 py-1.5 rounded-lg border border-cyan-400/30 hover:bg-cyan-500/10"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "סגור" : "צור דיון"}
        </button>
      </div>
      {open && accessToken ? (
        <TeacherDiscussionQuestionPicker
          accessToken={accessToken}
          gradeLevel={resolvedGrade}
          studentId={studentId}
        />
      ) : null}
    </section>
  );
}
