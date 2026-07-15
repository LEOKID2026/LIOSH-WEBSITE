import { useCallback, useEffect, useMemo, useState } from "react";
import {
  SchoolPrimaryButton,
  SCHOOL_PORTAL_BTN_CURSOR,
  SCHOOL_PORTAL_MODAL_SCROLL_CLASS,
} from "./SchoolPortalUi";
import { apiErrorMessageHe, schoolAuthFetch } from "../../lib/school-portal/school-ui.he";
import { hasSchoolPortalSession } from "../../lib/school-portal/operator-grants.js";
import { teacherAuthFetch } from "../../lib/teacher-portal/teacher-ui.he.js";
import { schoolGradeLabelHe } from "../../lib/school-portal/school-drilldown.js";
import {
  adminProfileFormToPayload,
  adminProfileToForm,
  computeChildAgeYears,
  EMPTY_ADMIN_PROFILE_FORM,
} from "../../lib/school-portal/school-student-profile-fields.js";
import {
  SC_BTN_ADD_DETAILS,
  SC_BTN_CANCEL_DETAILS,
  SC_BTN_EDIT_DETAILS,
  SC_BTN_SAVE_DETAILS,
  SC_DETAILS_EMPTY_STATE,
  SC_DETAILS_FIELD_ADDRESS,
  SC_DETAILS_FIELD_CHILD_AGE,
  SC_DETAILS_FIELD_CLASS,
  SC_DETAILS_FIELD_DATE_OF_BIRTH,
  SC_DETAILS_FIELD_EMERGENCY_NAME,
  SC_DETAILS_FIELD_EMERGENCY_PHONE,
  SC_DETAILS_FIELD_GRADE,
  SC_DETAILS_FIELD_INTERNAL_NOTES,
  SC_DETAILS_FIELD_MEDICAL_NOTES,
  SC_DETAILS_FIELD_PARENT1_NAME,
  SC_DETAILS_FIELD_PARENT1_NATIONAL_ID,
  SC_DETAILS_FIELD_PARENT1_PHONE,
  SC_DETAILS_FIELD_PARENT2_NAME,
  SC_DETAILS_FIELD_PARENT2_NATIONAL_ID,
  SC_DETAILS_FIELD_PARENT2_PHONE,
  SC_DETAILS_FIELD_PARENT_EMAIL,
  SC_DETAILS_FIELD_STUDENT_NAME,
  SC_DETAILS_FIELD_TRANSPORT_NOTES,
  SC_DETAILS_NAME_UPDATE_ERROR,
  SC_DETAILS_NAME_UPDATE_SUCCESS,
  SC_DETAILS_READONLY_BADGE,
  SC_DETAILS_SAVE_ERROR,
  SC_DETAILS_SAVE_SUCCESS,
  SC_DETAILS_SECTION_ADDRESS,
  SC_DETAILS_SECTION_EMERGENCY,
  SC_DETAILS_SECTION_INTERNAL,
  SC_DETAILS_SECTION_MEDICAL,
  SC_DETAILS_SECTION_PARENTS,
  SC_DETAILS_SECTION_STUDENT,
  SC_DETAILS_SECTION_TRANSPORT,
  SC_LOADING,
} from "../../lib/school-portal/school-communication.he";

const EMPTY_FORM = EMPTY_ADMIN_PROFILE_FORM;

function profileToForm(profile) {
  return adminProfileToForm(profile);
}

function formToPayload(form) {
  return adminProfileFormToPayload(form);
}

function FieldRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[minmax(8rem,11rem)_1fr] gap-1 sm:gap-3 py-2 border-b border-white/5 last:border-b-0">
      <dt className="text-xs text-white/50">{label}</dt>
      <dd className="text-sm text-white/90 break-words whitespace-pre-wrap">{value || "-"}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2">
      <h3 className="text-sm font-semibold text-amber-200/90">{title}</h3>
      {children}
    </section>
  );
}

function inputClass() {
  return "w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-sm";
}

/**
 * @param {{
 *   accessToken: string|null,
 *   authMethod?: string,
 *   portal?: "school"|"teacher",
 *   studentId: string,
 *   studentName: string,
 *   gradeLevel?: string|null,
 *   physicalClassName?: string|null,
 *   canEdit?: boolean,
 *   canViewNationalIds?: boolean,
 *   showAuditFooter?: boolean,
 *   onStudentNameChange?: (name: string) => void,
 * }} props
 */
export default function SchoolStudentDetailsPanel({
  accessToken,
  authMethod = "supabase_jwt",
  portal = "school",
  studentId,
  studentName,
  gradeLevel = null,
  physicalClassName = null,
  canEdit = false,
  canViewNationalIds = true,
  showAuditFooter = true,
  onStudentNameChange,
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [profile, setProfile] = useState(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [displayName, setDisplayName] = useState(studentName);
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(studentName);

  const profilePath =
    portal === "teacher"
      ? `/api/teacher/students/${encodeURIComponent(studentId)}/admin-profile`
      : `/api/school/students/${encodeURIComponent(studentId)}/admin-profile`;
  const namePath = `/api/school/students/${encodeURIComponent(studentId)}/name`;

  const authFetch = useCallback(
    (path, options = {}) => {
      if (portal === "teacher") {
        return teacherAuthFetch(accessToken, path, options);
      }
      return schoolAuthFetch(accessToken, path, options);
    },
    [accessToken, portal]
  );

  const canLoad =
    portal === "teacher" ? Boolean(accessToken) : hasSchoolPortalSession(accessToken, authMethod);

  const load = useCallback(async () => {
    if (!canLoad || !studentId) {
      setLoading(false);
      setLoadError("");
      setProfile(null);
      setIsEmpty(true);
      return;
    }
    setLoading(true);
    setLoadError("");
    try {
      const res = await authFetch(profilePath);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProfile(null);
        setIsEmpty(true);
        setLoadError(apiErrorMessageHe(json?.error, SC_DETAILS_SAVE_ERROR));
        return;
      }
      setProfile(json.profile || null);
      setIsEmpty(json.isEmpty !== false && !json.profile);
      setForm(profileToForm(json.profile));
    } catch {
      setLoadError(SC_DETAILS_SAVE_ERROR);
    } finally {
      setLoading(false);
    }
  }, [authFetch, canLoad, profilePath, studentId]);

  useEffect(() => {
    setDisplayName(studentName);
    setNameDraft(studentName);
  }, [studentName]);

  useEffect(() => {
    void load();
  }, [load]);

  const computedAge = useMemo(() => {
    if (profile?.dateOfBirth) return computeChildAgeYears(profile.dateOfBirth);
    if (profile?.childAgeYears != null) return profile.childAgeYears;
    return null;
  }, [profile]);

  const editComputedAge = useMemo(() => {
    if (form.dateOfBirth) return computeChildAgeYears(form.dateOfBirth);
    if (form.childAgeYears.trim()) return Number(form.childAgeYears);
    return null;
  }, [form.dateOfBirth, form.childAgeYears]);

  const startEdit = () => {
    setForm(profileToForm(profile));
    setEditing(true);
    setActionError("");
    setActionMessage("");
  };

  const cancelEdit = () => {
    setForm(profileToForm(profile));
    setEditing(false);
    setActionError("");
  };

  const saveProfile = async () => {
    setBusy(true);
    setActionError("");
    setActionMessage("");
    try {
      const res = await authFetch(profilePath, {
        method: "PUT",
        body: JSON.stringify(formToPayload(form)),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(apiErrorMessageHe(json?.error, SC_DETAILS_SAVE_ERROR));
        return;
      }
      setProfile(json.profile || null);
      setIsEmpty(json.isEmpty !== false && !json.profile);
      setForm(profileToForm(json.profile));
      setEditing(false);
      setActionMessage(SC_DETAILS_SAVE_SUCCESS);
    } catch {
      setActionError(SC_DETAILS_SAVE_ERROR);
    } finally {
      setBusy(false);
    }
  };

  const saveName = async () => {
    if (!canEdit || portal !== "school") return;
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    setBusy(true);
    setActionError("");
    setActionMessage("");
    try {
      const res = await authFetch(namePath, {
        method: "PATCH",
        body: JSON.stringify({ fullName: trimmed }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setActionError(apiErrorMessageHe(json?.error, SC_DETAILS_NAME_UPDATE_ERROR));
        return;
      }
      setDisplayName(json.fullName || trimmed);
      setNameDraft(json.fullName || trimmed);
      setNameEditing(false);
      setActionMessage(SC_DETAILS_NAME_UPDATE_SUCCESS);
      onStudentNameChange?.(json.fullName || trimmed);
    } catch {
      setActionError(SC_DETAILS_NAME_UPDATE_ERROR);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-white/60 text-right">{SC_LOADING}</p>;
  }

  if (loadError) {
    return (
      <p className="text-sm text-red-300 text-right" role="alert">
        {loadError}
      </p>
    );
  }

  return (
    <div className={`space-y-4 text-right ${SCHOOL_PORTAL_MODAL_SCROLL_CLASS}`}>
      {!canEdit ? (
        <p className="text-xs text-white/45">{SC_DETAILS_READONLY_BADGE}</p>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {nameEditing && canEdit && portal === "school" ? (
            <div className="space-y-2">
              <label className="block text-sm">
                <span className="text-white/60 block mb-1">{SC_DETAILS_FIELD_STUDENT_NAME}</span>
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className={inputClass()}
                />
              </label>
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveName()}
                  className={`rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 ${SCHOOL_PORTAL_BTN_CURSOR}`}
                >
                  {SC_BTN_SAVE_DETAILS}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setNameDraft(displayName);
                    setNameEditing(false);
                  }}
                  className={`rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 text-xs font-bold px-3 py-1.5 ${SCHOOL_PORTAL_BTN_CURSOR}`}
                >
                  {SC_BTN_CANCEL_DETAILS}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold text-white break-words">{displayName}</p>
              {canEdit && portal === "school" && !editing ? (
                <button
                  type="button"
                  onClick={() => setNameEditing(true)}
                  className={`text-xs text-amber-300 hover:underline ${SCHOOL_PORTAL_BTN_CURSOR}`}
                >
                  {SC_BTN_EDIT_DETAILS}
                </button>
              ) : null}
            </div>
          )}
        </div>
        {canEdit && !editing && !nameEditing ? (
          <button
            type="button"
            onClick={startEdit}
            className={`shrink-0 rounded-lg border border-amber-400/50 bg-amber-500/15 hover:bg-amber-500/25 text-amber-100 text-xs font-bold px-3 py-1.5 ${SCHOOL_PORTAL_BTN_CURSOR}`}
          >
            {isEmpty ? SC_BTN_ADD_DETAILS : SC_BTN_EDIT_DETAILS}
          </button>
        ) : null}
      </div>

      {actionMessage ? <p className="text-sm text-emerald-300">{actionMessage}</p> : null}
      {actionError ? (
        <p className="text-sm text-red-300" role="alert">
          {actionError}
        </p>
      ) : null}

      {isEmpty && !editing ? (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
          <p>{SC_DETAILS_EMPTY_STATE}</p>
          {canEdit ? (
            <button
              type="button"
              onClick={startEdit}
              className={`mt-3 rounded-lg bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5 ${SCHOOL_PORTAL_BTN_CURSOR}`}
            >
              {SC_BTN_ADD_DETAILS}
            </button>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void saveProfile();
          }}
        >
          <Section title={SC_DETAILS_SECTION_STUDENT}>
            <label className="block text-sm">
              <span className="text-white/60 block mb-1">{SC_DETAILS_FIELD_DATE_OF_BIRTH}</span>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                className={inputClass()}
              />
            </label>
            {form.dateOfBirth ? (
              <p className="text-sm text-white/70">
                {SC_DETAILS_FIELD_CHILD_AGE}: {editComputedAge ?? "-"}
              </p>
            ) : (
              <label className="block text-sm">
                <span className="text-white/60 block mb-1">{SC_DETAILS_FIELD_CHILD_AGE}</span>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={form.childAgeYears}
                  onChange={(e) => setForm((f) => ({ ...f, childAgeYears: e.target.value }))}
                  className={inputClass()}
                />
              </label>
            )}
          </Section>

          <Section title={SC_DETAILS_SECTION_PARENTS}>
            {[
              [SC_DETAILS_FIELD_PARENT1_NAME, "parent1Name"],
              [SC_DETAILS_FIELD_PARENT1_PHONE, "parent1Phone"],
              ...(canViewNationalIds
                ? [[SC_DETAILS_FIELD_PARENT1_NATIONAL_ID, "parent1NationalId"]]
                : []),
              [SC_DETAILS_FIELD_PARENT2_NAME, "parent2Name"],
              [SC_DETAILS_FIELD_PARENT2_PHONE, "parent2Phone"],
              ...(canViewNationalIds
                ? [[SC_DETAILS_FIELD_PARENT2_NATIONAL_ID, "parent2NationalId"]]
                : []),
              [SC_DETAILS_FIELD_PARENT_EMAIL, "parentEmail"],
            ].map(([label, key]) => (
              <label key={key} className="block text-sm">
                <span className="text-white/60 block mb-1">{label}</span>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className={inputClass()}
                />
              </label>
            ))}
          </Section>

          <Section title={SC_DETAILS_SECTION_ADDRESS}>
            <label className="block text-sm">
              <span className="text-white/60 block mb-1">{SC_DETAILS_FIELD_ADDRESS}</span>
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                rows={2}
                className={inputClass()}
              />
            </label>
          </Section>

          <Section title={SC_DETAILS_SECTION_EMERGENCY}>
            {[
              [SC_DETAILS_FIELD_EMERGENCY_NAME, "emergencyContactName"],
              [SC_DETAILS_FIELD_EMERGENCY_PHONE, "emergencyContactPhone"],
            ].map(([label, key]) => (
              <label key={key} className="block text-sm">
                <span className="text-white/60 block mb-1">{label}</span>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className={inputClass()}
                />
              </label>
            ))}
          </Section>

          <Section title={SC_DETAILS_SECTION_MEDICAL}>
            <label className="block text-sm">
              <span className="text-white/60 block mb-1">{SC_DETAILS_FIELD_MEDICAL_NOTES}</span>
              <textarea
                value={form.medicalAllergyNotes}
                onChange={(e) => setForm((f) => ({ ...f, medicalAllergyNotes: e.target.value }))}
                rows={3}
                className={inputClass()}
              />
            </label>
          </Section>

          <Section title={SC_DETAILS_SECTION_TRANSPORT}>
            <label className="block text-sm">
              <span className="text-white/60 block mb-1">{SC_DETAILS_FIELD_TRANSPORT_NOTES}</span>
              <textarea
                value={form.transportationNotes}
                onChange={(e) => setForm((f) => ({ ...f, transportationNotes: e.target.value }))}
                rows={2}
                className={inputClass()}
              />
            </label>
          </Section>

          <Section title={SC_DETAILS_SECTION_INTERNAL}>
            <label className="block text-sm">
              <span className="text-white/60 block mb-1">{SC_DETAILS_FIELD_INTERNAL_NOTES}</span>
              <textarea
                value={form.internalNotes}
                onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))}
                rows={3}
                className={inputClass()}
              />
            </label>
          </Section>

          <div className="flex flex-wrap gap-2 justify-end">
            <SchoolPrimaryButton type="submit" disabled={busy}>
              {busy ? SC_LOADING : SC_BTN_SAVE_DETAILS}
            </SchoolPrimaryButton>
            <button
              type="button"
              disabled={busy}
              onClick={cancelEdit}
              className={`rounded-lg border border-white/25 bg-white/10 hover:bg-white/15 px-3 py-2 text-sm font-semibold ${SCHOOL_PORTAL_BTN_CURSOR}`}
            >
              {SC_BTN_CANCEL_DETAILS}
            </button>
          </div>
        </form>
      ) : !isEmpty ? (
        <div className="space-y-4">
          <Section title={SC_DETAILS_SECTION_STUDENT}>
            <dl>
              <FieldRow label={SC_DETAILS_FIELD_GRADE} value={schoolGradeLabelHe(gradeLevel)} />
              <FieldRow label={SC_DETAILS_FIELD_CLASS} value={physicalClassName} />
              <FieldRow
                label={SC_DETAILS_FIELD_CHILD_AGE}
                value={computedAge != null ? String(computedAge) : null}
              />
              <FieldRow label={SC_DETAILS_FIELD_DATE_OF_BIRTH} value={profile?.dateOfBirth} />
            </dl>
          </Section>

          <Section title={SC_DETAILS_SECTION_PARENTS}>
            <dl>
              <FieldRow label={SC_DETAILS_FIELD_PARENT1_NAME} value={profile?.parent1Name} />
              <FieldRow label={SC_DETAILS_FIELD_PARENT1_PHONE} value={profile?.parent1Phone} />
              {canViewNationalIds ? (
                <FieldRow
                  label={SC_DETAILS_FIELD_PARENT1_NATIONAL_ID}
                  value={profile?.parent1NationalId}
                />
              ) : null}
              <FieldRow label={SC_DETAILS_FIELD_PARENT2_NAME} value={profile?.parent2Name} />
              <FieldRow label={SC_DETAILS_FIELD_PARENT2_PHONE} value={profile?.parent2Phone} />
              {canViewNationalIds ? (
                <FieldRow
                  label={SC_DETAILS_FIELD_PARENT2_NATIONAL_ID}
                  value={profile?.parent2NationalId}
                />
              ) : null}
              <FieldRow label={SC_DETAILS_FIELD_PARENT_EMAIL} value={profile?.parentEmail} />
            </dl>
          </Section>

          <Section title={SC_DETAILS_SECTION_ADDRESS}>
            <dl>
              <FieldRow label={SC_DETAILS_FIELD_ADDRESS} value={profile?.address} />
            </dl>
          </Section>

          <Section title={SC_DETAILS_SECTION_EMERGENCY}>
            <dl>
              <FieldRow label={SC_DETAILS_FIELD_EMERGENCY_NAME} value={profile?.emergencyContactName} />
              <FieldRow label={SC_DETAILS_FIELD_EMERGENCY_PHONE} value={profile?.emergencyContactPhone} />
            </dl>
          </Section>

          <Section title={SC_DETAILS_SECTION_MEDICAL}>
            <dl>
              <FieldRow label={SC_DETAILS_FIELD_MEDICAL_NOTES} value={profile?.medicalAllergyNotes} />
            </dl>
          </Section>

          <Section title={SC_DETAILS_SECTION_TRANSPORT}>
            <dl>
              <FieldRow label={SC_DETAILS_FIELD_TRANSPORT_NOTES} value={profile?.transportationNotes} />
            </dl>
          </Section>

          <Section title={SC_DETAILS_SECTION_INTERNAL}>
            <dl>
              <FieldRow label={SC_DETAILS_FIELD_INTERNAL_NOTES} value={profile?.internalNotes} />
            </dl>
          </Section>
        </div>
      ) : null}

      {showAuditFooter && profile?.updatedAt ? (
        <p className="text-xs text-white/40 pt-2 border-t border-white/10">
          {profile.updatedByName ? `${profile.updatedByName} · ` : ""}
          {new Date(profile.updatedAt).toLocaleString("he-IL")}
        </p>
      ) : null}
    </div>
  );
}