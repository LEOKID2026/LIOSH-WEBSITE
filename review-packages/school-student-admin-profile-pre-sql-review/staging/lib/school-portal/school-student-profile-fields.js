export const EMPTY_ADMIN_PROFILE_FORM = {
  parent1Name: "",
  parent1Phone: "",
  parent1NationalId: "",
  parent2Name: "",
  parent2Phone: "",
  parent2NationalId: "",
  parentEmail: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  transportationNotes: "",
  internalNotes: "",
  dateOfBirth: "",
  childAgeYears: "",
  medicalAllergyNotes: "",
};

/**
 * @param {Record<string, unknown>|null|undefined} profile
 */
export function adminProfileToForm(profile) {
  if (!profile) return { ...EMPTY_ADMIN_PROFILE_FORM };
  return {
    parent1Name: profile.parent1Name || "",
    parent1Phone: profile.parent1Phone || "",
    parent1NationalId: profile.parent1NationalId || "",
    parent2Name: profile.parent2Name || "",
    parent2Phone: profile.parent2Phone || "",
    parent2NationalId: profile.parent2NationalId || "",
    parentEmail: profile.parentEmail || "",
    address: profile.address || "",
    emergencyContactName: profile.emergencyContactName || "",
    emergencyContactPhone: profile.emergencyContactPhone || "",
    transportationNotes: profile.transportationNotes || "",
    internalNotes: profile.internalNotes || "",
    dateOfBirth: profile.dateOfBirth || "",
    childAgeYears: profile.childAgeYears != null ? String(profile.childAgeYears) : "",
    medicalAllergyNotes: profile.medicalAllergyNotes || "",
  };
}

/**
 * @param {typeof EMPTY_ADMIN_PROFILE_FORM} form
 */
export function adminProfileFormToPayload(form) {
  return {
    parent1Name: form.parent1Name.trim() || null,
    parent1Phone: form.parent1Phone.trim() || null,
    parent1NationalId: form.parent1NationalId.trim() || null,
    parent2Name: form.parent2Name.trim() || null,
    parent2Phone: form.parent2Phone.trim() || null,
    parent2NationalId: form.parent2NationalId.trim() || null,
    parentEmail: form.parentEmail.trim() || null,
    address: form.address.trim() || null,
    emergencyContactName: form.emergencyContactName.trim() || null,
    emergencyContactPhone: form.emergencyContactPhone.trim() || null,
    transportationNotes: form.transportationNotes.trim() || null,
    internalNotes: form.internalNotes.trim() || null,
    dateOfBirth: form.dateOfBirth.trim() || null,
    childAgeYears: form.dateOfBirth.trim()
      ? null
      : form.childAgeYears.trim()
        ? Number(form.childAgeYears)
        : null,
    medicalAllergyNotes: form.medicalAllergyNotes.trim() || null,
  };
}

/**
 * @param {string|null|undefined} dateOfBirth
 * @param {Date} [now]
 */
export function computeChildAgeYears(dateOfBirth, now = new Date()) {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(dob.getTime())) return null;
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}
