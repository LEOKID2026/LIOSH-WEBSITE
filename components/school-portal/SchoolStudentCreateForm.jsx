import { useMemo, useState } from "react";
import PortalDarkSelect from "../platform-ui/PortalDarkSelect.jsx";
import SchoolCredentialShownOnceBox from "./SchoolCredentialShownOnceBox";
import { SchoolPrimaryButton, SCHOOL_CARD, SCHOOL_CARD_INNER } from "./SchoolPortalUi";
import { SCHOOL_GRADE_OPTIONS } from "../../lib/school-portal/school-drilldown";
import {
  adminProfileFormToPayload,
  EMPTY_ADMIN_PROFILE_FORM,
} from "../../lib/school-portal/school-student-profile-fields.js";
import { hasSchoolPortalSession } from "../../lib/school-portal/operator-grants.js";
import {
  SC_BTN_ADD_DETAILS,
  SC_BTN_HIDE_DETAILS,
  SC_DETAILS_FIELD_ADDRESS,
  SC_DETAILS_FIELD_CHILD_AGE,
  SC_DETAILS_FIELD_DATE_OF_BIRTH,
  SC_DETAILS_FIELD_EMERGENCY_NAME,
  SC_DETAILS_FIELD_EMERGENCY_PHONE,
  SC_DETAILS_FIELD_INTERNAL_NOTES,
  SC_DETAILS_FIELD_MEDICAL_NOTES,
  SC_DETAILS_FIELD_PARENT1_NAME,
  SC_DETAILS_FIELD_PARENT1_NATIONAL_ID,
  SC_DETAILS_FIELD_PARENT1_PHONE,
  SC_DETAILS_FIELD_PARENT2_NAME,
  SC_DETAILS_FIELD_PARENT2_NATIONAL_ID,
  SC_DETAILS_FIELD_PARENT2_PHONE,
  SC_DETAILS_FIELD_PARENT_EMAIL,
  SC_DETAILS_FIELD_TRANSPORT_NOTES,
  SC_DETAILS_SAVE_ERROR,
} from "../../lib/school-portal/school-communication.he";
import {
  apiErrorMessageHe,
  schoolAuthFetch,
  SCHOOL_CREATE_STUDENT_CLASS,
  SCHOOL_CREATE_STUDENT_CLASS_HINT,
  SCHOOL_CREATE_STUDENT_FULL_NAME,
  SCHOOL_CREATE_STUDENT_GRADE,
  SCHOOL_CREATE_STUDENT_LOGIN,
  SCHOOL_CREATE_STUDENT_NOTES,
  SCHOOL_CREATE_STUDENT_SECTION,
  SCHOOL_CREATE_STUDENT_SUBMIT,
  SCHOOL_CREATE_STUDENT_SUCCESS,
} from "../../lib/school-portal/school-ui.he";

function hasAdminProfileInput(form) {
  const payload = adminProfileFormToPayload(form);
  return Object.values(payload).some((value) => value != null && value !== "");
}

/**
 * @param {{
 *   accessToken?: string|null,
 *   authMethod?: string|null,
 *   browseSummary?: { physicalClassesByGrade?: Record<string, Array<{ name: string }>> }|null,
 *   onSuccess?: () => void,
 * }} props
 */
export default function SchoolStudentCreateForm({
  accessToken,
  authMethod,
  browseSummary,
  onSuccess,
}) {
  const [fullName, setFullName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [physicalClassName, setPhysicalClassName] = useState("");
  const [notes, setNotes] = useState("");
  const [createLoginAccess, setCreateLoginAccess] = useState(true);
  const [showOptionalDetails, setShowOptionalDetails] = useState(false);
  const [profileForm, setProfileForm] = useState({ ...EMPTY_ADMIN_PROFILE_FORM });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [profileWarning, setProfileWarning] = useState("");
  const [credentials, setCredentials] = useState(null);

  const classOptions = useMemo(() => {
    if (!gradeLevel || !browseSummary?.physicalClassesByGrade) return [];
    return (browseSummary.physicalClassesByGrade[gradeLevel] || []).map((g) => ({
      value: g.name,
      label: g.name,
    }));
  }, [gradeLevel, browseSummary]);

  const submit = async (e) => {
    e.preventDefault();
    if (!hasSchoolPortalSession(accessToken, authMethod) || !fullName.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    setProfileWarning("");
    setCredentials(null);
    try {
      const res = await schoolAuthFetch(accessToken, "/api/school/students", {
        method: "POST",
        body: JSON.stringify({
          fullName: fullName.trim(),
          gradeLevel: gradeLevel || null,
          physicalClassName: physicalClassName || null,
          notes: notes.trim() || null,
          createLoginAccess,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(apiErrorMessageHe(json?.error, "יצירת ילד/ה נכשלה"));
        return;
      }

      const newStudentId =
        json?.data?.student?.studentId ||
        json?.data?.student?.id ||
        json?.data?.studentId ||
        null;

      if (newStudentId && hasAdminProfileInput(profileForm)) {
        const profileRes = await schoolAuthFetch(
          accessToken,
          `/api/school/students/${encodeURIComponent(newStudentId)}/admin-profile`,
          {
            method: "PUT",
            body: JSON.stringify(adminProfileFormToPayload(profileForm)),
          }
        );
        if (!profileRes.ok) {
          const profileJson = await profileRes.json().catch(() => ({}));
          setProfileWarning(
            apiErrorMessageHe(profileJson?.error, SC_DETAILS_SAVE_ERROR)
          );
        }
      }

      setMessage(SCHOOL_CREATE_STUDENT_SUCCESS);
      if (json?.data?.student?.access?.loginUsername) {
        setCredentials({
          loginUsername: json.data.student.access.loginUsername,
          loginPinOnce: json.data.student.access.loginPinOnce,
        });
      }
      setFullName("");
      setNotes("");
      setProfileForm({ ...EMPTY_ADMIN_PROFILE_FORM });
      setShowOptionalDetails(false);
      onSuccess?.();
    } catch {
      setError("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const inputClass = "w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm";

  return (
    <section className={`${SCHOOL_CARD} mb-6`} data-testid="school-student-create-form">
      <div className={SCHOOL_CARD_INNER}>
        <h2 className="text-base font-semibold mb-2 text-right">{SCHOOL_CREATE_STUDENT_SECTION}</h2>
        <form onSubmit={(e) => void submit(e)} className="space-y-3 max-w-xl text-right">
          <label className="block text-sm">
            <span className="text-white/60 block mb-1">{SCHOOL_CREATE_STUDENT_FULL_NAME}</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className={inputClass}
            />
          </label>

          <label className="block text-sm">
            <span className="text-white/60 block mb-1">{SCHOOL_CREATE_STUDENT_GRADE}</span>
            <PortalDarkSelect
              data-testid="school-create-student-grade"
              value={gradeLevel}
              onChange={(v) => {
                setGradeLevel(v);
                setPhysicalClassName("");
              }}
              options={[{ value: "", label: "- בחרו שכבה -" }, ...SCHOOL_GRADE_OPTIONS.map((g) => ({ value: g.level, label: g.label }))]}
            />
          </label>

          {gradeLevel ? (
            <label className="block text-sm">
              <span className="text-white/60 block mb-1">{SCHOOL_CREATE_STUDENT_CLASS}</span>
              {classOptions.length ? (
                <PortalDarkSelect
                  data-testid="school-create-student-class"
                  value={physicalClassName}
                  onChange={setPhysicalClassName}
                  options={[{ value: "", label: "- בחרו כיתה -" }, ...classOptions]}
                />
              ) : (
                <input
                  value={physicalClassName}
                  onChange={(e) => setPhysicalClassName(e.target.value)}
                  placeholder="למשל: 1"
                  className={inputClass}
                />
              )}
              <p className="text-xs text-white/45 mt-1">{SCHOOL_CREATE_STUDENT_CLASS_HINT}</p>
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="text-white/60 block mb-1">{SCHOOL_CREATE_STUDENT_NOTES}</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span>{SCHOOL_CREATE_STUDENT_LOGIN}</span>
            <input
              type="checkbox"
              checked={createLoginAccess}
              onChange={(e) => setCreateLoginAccess(e.target.checked)}
              className="h-4 w-4"
            />
          </label>

          <div className="pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setShowOptionalDetails((v) => !v)}
              className="text-sm text-amber-300 hover:underline"
              data-testid="school-create-student-optional-details-toggle"
            >
              {showOptionalDetails ? SC_BTN_HIDE_DETAILS : SC_BTN_ADD_DETAILS}
            </button>
            {showOptionalDetails ? (
              <div className="mt-3 space-y-3">
                <label className="block text-sm">
                  <span className="text-white/60 block mb-1">{SC_DETAILS_FIELD_DATE_OF_BIRTH}</span>
                  <input
                    type="date"
                    value={profileForm.dateOfBirth}
                    onChange={(e) =>
                      setProfileForm((f) => ({ ...f, dateOfBirth: e.target.value }))
                    }
                    className={inputClass}
                  />
                </label>
                {!profileForm.dateOfBirth ? (
                  <label className="block text-sm">
                    <span className="text-white/60 block mb-1">{SC_DETAILS_FIELD_CHILD_AGE}</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={profileForm.childAgeYears}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, childAgeYears: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                ) : null}
                {[
                  [SC_DETAILS_FIELD_PARENT1_NAME, "parent1Name"],
                  [SC_DETAILS_FIELD_PARENT1_PHONE, "parent1Phone"],
                  [SC_DETAILS_FIELD_PARENT1_NATIONAL_ID, "parent1NationalId"],
                  [SC_DETAILS_FIELD_PARENT2_NAME, "parent2Name"],
                  [SC_DETAILS_FIELD_PARENT2_PHONE, "parent2Phone"],
                  [SC_DETAILS_FIELD_PARENT2_NATIONAL_ID, "parent2NationalId"],
                  [SC_DETAILS_FIELD_PARENT_EMAIL, "parentEmail"],
                ].map(([label, key]) => (
                  <label key={key} className="block text-sm">
                    <span className="text-white/60 block mb-1">{label}</span>
                    <input
                      value={profileForm[key]}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                ))}
                <label className="block text-sm">
                  <span className="text-white/60 block mb-1">{SC_DETAILS_FIELD_ADDRESS}</span>
                  <textarea
                    value={profileForm.address}
                    onChange={(e) => setProfileForm((f) => ({ ...f, address: e.target.value }))}
                    rows={2}
                    className={inputClass}
                  />
                </label>
                {[
                  [SC_DETAILS_FIELD_EMERGENCY_NAME, "emergencyContactName"],
                  [SC_DETAILS_FIELD_EMERGENCY_PHONE, "emergencyContactPhone"],
                ].map(([label, key]) => (
                  <label key={key} className="block text-sm">
                    <span className="text-white/60 block mb-1">{label}</span>
                    <input
                      value={profileForm[key]}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </label>
                ))}
                {[
                  [SC_DETAILS_FIELD_MEDICAL_NOTES, "medicalAllergyNotes"],
                  [SC_DETAILS_FIELD_TRANSPORT_NOTES, "transportationNotes"],
                  [SC_DETAILS_FIELD_INTERNAL_NOTES, "internalNotes"],
                ].map(([label, key]) => (
                  <label key={key} className="block text-sm">
                    <span className="text-white/60 block mb-1">{label}</span>
                    <textarea
                      value={profileForm[key]}
                      onChange={(e) =>
                        setProfileForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      rows={2}
                      className={inputClass}
                    />
                  </label>
                ))}
              </div>
            ) : null}
          </div>

          {error ? <p className="text-red-300 text-sm">{error}</p> : null}
          {profileWarning ? <p className="text-amber-200 text-sm">{profileWarning}</p> : null}
          {message ? <p className="text-emerald-300 text-sm">{message}</p> : null}
          {credentials ? (
            <SchoolCredentialShownOnceBox
              credentials={credentials}
              onDismiss={() => setCredentials(null)}
            />
          ) : null}

          <SchoolPrimaryButton type="submit" disabled={busy || !fullName.trim()}>
            {busy ? "יוצר…" : SCHOOL_CREATE_STUDENT_SUBMIT}
          </SchoolPrimaryButton>
        </form>
      </div>
    </section>
  );
}
