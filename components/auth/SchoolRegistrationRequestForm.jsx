import { useState } from "react";
import {
  REG_SCHOOL_APPROX_STUDENTS_LABEL,
  REG_SCHOOL_APPROX_TEACHERS_LABEL,
  REG_SCHOOL_CITY_LABEL,
  REG_SCHOOL_CONTACT_EMAIL_LABEL,
  REG_SCHOOL_CONTACT_NAME_LABEL,
  REG_SCHOOL_MESSAGE_LABEL,
  REG_SCHOOL_NAME_LABEL,
  REG_SCHOOL_SUBMIT,
  REG_SCHOOL_SUCCESS,
  REG_TEACHER_ALREADY_PENDING,
} from "../../lib/auth/auth-registration.he.js";

const INPUT_CLASS =
  "mt-0.5 w-full rounded bg-black/40 border border-white/20 px-3 py-1.5 text-sm";

export default function SchoolRegistrationRequestForm() {
  const [schoolName, setSchoolName] = useState("");
  const [city, setCity] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [approxTeachers, setApproxTeachers] = useState("");
  const [approxStudents, setApproxStudents] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/school-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          schoolName: schoolName.trim(),
          city: city.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          approxTeachers: approxTeachers === "" ? null : Number(approxTeachers),
          approxStudents: approxStudents === "" ? null : Number(approxStudents),
          message: message.trim() || null,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409 && body?.error?.code === "request_already_pending") {
        setError(REG_TEACHER_ALREADY_PENDING);
        return;
      }
      if (res.status === 201 || res.status === 200) {
        setSuccess(REG_SCHOOL_SUCCESS);
        return;
      }
      setError("לא ניתן לשלוח את הבקשה כעת. נסו שנית מאוחר יותר.");
    } catch {
      setError("שגיאת רשת. נסו שנית.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="school-registration-request-form" dir="rtl" lang="he">
      {success ? (
        <p className="text-emerald-300 text-sm" role="status">
          {success}
        </p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-2 md:space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 md:gap-y-3">
            <label className="block text-sm">
              <span className="text-white/80">{REG_SCHOOL_NAME_LABEL}</span>
              <input
                type="text"
                value={schoolName}
                onChange={(ev) => setSchoolName(ev.target.value)}
                required
                maxLength={120}
                className={INPUT_CLASS}
                data-testid="school-reg-name"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/80">{REG_SCHOOL_CITY_LABEL}</span>
              <input
                type="text"
                value={city}
                onChange={(ev) => setCity(ev.target.value)}
                required
                maxLength={100}
                className={INPUT_CLASS}
                data-testid="school-reg-city"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/80">{REG_SCHOOL_CONTACT_NAME_LABEL}</span>
              <input
                type="text"
                value={contactName}
                onChange={(ev) => setContactName(ev.target.value)}
                required
                maxLength={120}
                className={INPUT_CLASS}
                data-testid="school-reg-contact-name"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/80">{REG_SCHOOL_CONTACT_EMAIL_LABEL}</span>
              <input
                type="email"
                value={contactEmail}
                onChange={(ev) => setContactEmail(ev.target.value)}
                required
                className={INPUT_CLASS}
                data-testid="school-reg-contact-email"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-2 gap-x-3 md:gap-x-4 gap-y-2 md:gap-y-3">
            <label className="block text-sm">
              <span className="text-white/80">{REG_SCHOOL_APPROX_TEACHERS_LABEL}</span>
              <input
                type="number"
                min={1}
                value={approxTeachers}
                onChange={(ev) => setApproxTeachers(ev.target.value)}
                className={INPUT_CLASS}
                data-testid="school-reg-approx-teachers"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/80">{REG_SCHOOL_APPROX_STUDENTS_LABEL}</span>
              <input
                type="number"
                min={1}
                value={approxStudents}
                onChange={(ev) => setApproxStudents(ev.target.value)}
                className={INPUT_CLASS}
                data-testid="school-reg-approx-students"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-white/80">{REG_SCHOOL_MESSAGE_LABEL}</span>
            <textarea
              value={message}
              onChange={(ev) => setMessage(ev.target.value)}
              maxLength={1000}
              rows={2}
              className={`${INPUT_CLASS} mt-1 resize-y min-h-[3rem] md:min-h-[3.5rem] max-h-28`}
              data-testid="school-reg-message"
            />
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full md:w-auto rounded bg-amber-500 text-black font-semibold px-6 py-1.5 md:py-2 disabled:opacity-60"
            data-testid="school-reg-submit"
          >
            {busy ? "שולח…" : REG_SCHOOL_SUBMIT}
          </button>
        </form>
      )}
      {error ? (
        <p className="mt-1.5 md:mt-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
