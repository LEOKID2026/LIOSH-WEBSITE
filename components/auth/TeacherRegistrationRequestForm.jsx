import { useState } from "react";
import { LEARNING_SUBJECT_ALLOWLIST } from "../../lib/learning-supabase/learning-activity.js";
import {
  REG_REQUEST_INTENT_OPTIONS,
  REG_TEACHER_ALREADY_PENDING,
  REG_TEACHER_EMAIL_LABEL,
  REG_TEACHER_EXPLANATION_HINT,
  REG_TEACHER_EXPLANATION_LABEL,
  REG_TEACHER_INTENT_LABEL,
  REG_TEACHER_NAME_LABEL,
  REG_TEACHER_PHONE_LABEL,
  REG_TEACHER_SUBJECTS_LABEL,
  REG_TEACHER_SUBMIT,
  REG_TEACHER_SUCCESS,
  REG_TEACHER_TITLE,
  SUBJECT_LABELS_HE,
} from "../../lib/auth/auth-registration.he.js";

const INPUT_CLASS =
  "mt-0.5 w-full rounded bg-black/40 border border-white/20 px-3 py-1.5 text-sm";

export default function TeacherRegistrationRequestForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requestIntent, setRequestIntent] = useState(REG_REQUEST_INTENT_OPTIONS[0].id);
  const [description, setDescription] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const toggleSubject = (key) => {
    setSubjects((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    );
  };

  const explanationReady = description.trim().length >= 10;

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/teacher-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          requestIntent,
          description: description.trim(),
          requestedSubjects: subjects,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409 && body?.error?.code === "request_already_pending") {
        setError(REG_TEACHER_ALREADY_PENDING);
        return;
      }
      if (res.status === 201 || res.status === 200) {
        setMessage(REG_TEACHER_SUCCESS);
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
    <div data-testid="teacher-registration-request-form" dir="rtl" lang="he">
      <h2 className="text-base md:text-xl font-bold mb-1">{REG_TEACHER_TITLE}</h2>
      {message ? (
        <p className="text-emerald-300 text-sm mb-1" role="status">
          {message}
        </p>
      ) : (
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-1.5 md:space-y-3">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 md:flex md:flex-row md:gap-x-4 md:gap-y-0">
            <label className="block text-sm min-w-0 col-span-1 order-1 md:flex-1">
              <span className="text-white/80">{REG_TEACHER_NAME_LABEL}</span>
              <input
                type="text"
                value={fullName}
                onChange={(ev) => setFullName(ev.target.value)}
                required
                maxLength={120}
                className={INPUT_CLASS}
                data-testid="teacher-reg-full-name"
              />
            </label>
            <label className="block text-sm min-w-0 col-span-1 order-2 md:flex-1">
              <span className="text-white/80">{REG_TEACHER_INTENT_LABEL}</span>
              <select
                value={requestIntent}
                onChange={(ev) => setRequestIntent(ev.target.value)}
                required
                className={INPUT_CLASS}
                data-testid="teacher-reg-intent"
              >
                {REG_REQUEST_INTENT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm col-span-2 order-3 md:order-3 md:flex-none md:w-full md:max-w-md md:shrink-0">
              <span className="text-white/80">{REG_TEACHER_EMAIL_LABEL}</span>
              <input
                type="email"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                required
                className={INPUT_CLASS}
                data-testid="teacher-reg-email"
              />
            </label>
            <label className="block text-sm col-span-2 order-4 md:order-4 md:flex-none md:w-full md:max-w-md md:shrink-0">
              <span className="text-white/80">{REG_TEACHER_PHONE_LABEL}</span>
              <input
                type="tel"
                value={phone}
                onChange={(ev) => setPhone(ev.target.value)}
                required
                inputMode="tel"
                autoComplete="tel"
                maxLength={30}
                className={INPUT_CLASS}
                data-testid="teacher-reg-phone"
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="text-white/80">{REG_TEACHER_EXPLANATION_LABEL}</span>
            <span className="block text-xs text-white/50 leading-snug">
              {REG_TEACHER_EXPLANATION_HINT}
            </span>
            <textarea
              value={description}
              onChange={(ev) => setDescription(ev.target.value)}
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              className={`${INPUT_CLASS} mt-0.5 resize-y min-h-[3.75rem] md:min-h-[4.5rem] max-h-28`}
              data-testid="teacher-reg-description"
            />
          </label>

          <fieldset className="text-sm pt-0">
            <legend className="text-white/80 mb-1">{REG_TEACHER_SUBJECTS_LABEL}</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 md:gap-1.5">
              {[...LEARNING_SUBJECT_ALLOWLIST].map((key) => (
                <label
                  key={key}
                  className="inline-flex items-center gap-1 rounded border border-white/20 px-1.5 py-0.5 md:px-2 md:py-1 cursor-pointer text-[11px] md:text-xs leading-tight"
                >
                  <input
                    type="checkbox"
                    checked={subjects.includes(key)}
                    onChange={() => toggleSubject(key)}
                    data-testid={`teacher-reg-subject-${key}`}
                    className="shrink-0"
                  />
                  <span>{SUBJECT_LABELS_HE[key] || key}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={busy || !explanationReady}
            className="w-full md:w-auto rounded bg-amber-500 text-black font-semibold px-6 py-1.5 md:py-2 disabled:opacity-60"
            data-testid="teacher-reg-submit"
          >
            {busy ? "שולח…" : REG_TEACHER_SUBMIT}
          </button>
        </form>
      )}
      {error ? (
        <p className="mt-1.5 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
