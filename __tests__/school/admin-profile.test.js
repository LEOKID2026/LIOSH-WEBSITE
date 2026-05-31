import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  adminProfileFormToPayload,
  computeChildAgeYears,
} from "../../lib/school-portal/school-student-profile-fields.js";
import {
  mapSchoolStudentAdminProfileRow,
  mergeAdminProfileFields,
  parseSchoolStudentAdminProfileInput,
  parseSchoolStudentNameInput,
  stripTeacherAdminProfileFields,
} from "../../lib/school-server/school-student-profile.server.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

describe("school student admin profile validation", () => {
  it("accepts empty optional profile body", () => {
    const parsed = parseSchoolStudentAdminProfileInput({});
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.presentKeys, []);
    assert.deepEqual(parsed.fields, {});
  });

  it("tracks only fields present in the request body", () => {
    const parsed = parseSchoolStudentAdminProfileInput({ parent1Name: "Updated" });
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.presentKeys, ["parent1Name"]);
    assert.equal(parsed.fields.parent1Name, "Updated");
    assert.equal("parent1Phone" in parsed.fields, false);
  });

  it("treats explicit null as a present clear value", () => {
    const parsed = parseSchoolStudentAdminProfileInput({ parent1Phone: null });
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.presentKeys, ["parent1Phone"]);
    assert.equal(parsed.fields.parent1Phone, null);
  });

  it("normalizes empty string to null when field is sent", () => {
    const parsed = parseSchoolStudentAdminProfileInput({ parent1Phone: "" });
    assert.equal(parsed.ok, true);
    assert.deepEqual(parsed.presentKeys, ["parent1Phone"]);
    assert.equal(parsed.fields.parent1Phone, null);
  });

  it("rejects invalid email", () => {
    const parsed = parseSchoolStudentAdminProfileInput({ parentEmail: "not-an-email" });
    assert.equal(parsed.ok, false);
  });

  it("rejects invalid date_of_birth", () => {
    const parsed = parseSchoolStudentAdminProfileInput({ dateOfBirth: "31-05-2026" });
    assert.equal(parsed.ok, false);
  });

  it("rejects child age out of range", () => {
    assert.equal(parseSchoolStudentAdminProfileInput({ childAgeYears: -1 }).ok, false);
    assert.equal(parseSchoolStudentAdminProfileInput({ childAgeYears: 31 }).ok, false);
    assert.equal(parseSchoolStudentAdminProfileInput({ childAgeYears: 10 }).ok, true);
  });

  it("requires non-empty student name for PATCH parser", () => {
    assert.equal(parseSchoolStudentNameInput("").ok, false);
    assert.equal(parseSchoolStudentNameInput("  ").ok, false);
    const ok = parseSchoolStudentNameInput("  תלמיד  ");
    assert.equal(ok.ok, true);
    assert.equal(ok.fullName, "תלמיד");
  });
});

describe("partial profile merge", () => {
  const existingRow = {
    parent1_name: "אב",
    parent1_phone: "0501111111",
    parent1_national_id: "111",
    parent2_name: "אם",
    parent2_phone: "0502222222",
    parent2_national_id: "222",
    parent_email: "parent@example.com",
    address: "כתובת קיימת",
    emergency_contact_name: "דוד",
    emergency_contact_phone: "051",
    transportation_notes: "הסעה",
    internal_notes: "פנימי",
    date_of_birth: "2015-01-01",
    child_age_years: 11,
    medical_allergy_notes: "אלרגיה",
  };

  it("preserves existing values for fields not included in partial body", () => {
    const parsed = parseSchoolStudentAdminProfileInput({ parent1Name: "Updated" });
    assert.equal(parsed.ok, true);
    const merged = mergeAdminProfileFields(existingRow, parsed.fields, parsed.presentKeys);
    assert.equal(merged.parent1Name, "Updated");
    assert.equal(merged.parent1Phone, "0501111111");
    assert.equal(merged.parent2Name, "אם");
    assert.equal(merged.address, "כתובת קיימת");
    assert.equal(merged.medicalAllergyNotes, "אלרגיה");
  });

  it("clears a field when explicit null is sent", () => {
    const parsed = parseSchoolStudentAdminProfileInput({ parent1Phone: null });
    assert.equal(parsed.ok, true);
    const merged = mergeAdminProfileFields(existingRow, parsed.fields, parsed.presentKeys);
    assert.equal(merged.parent1Phone, null);
    assert.equal(merged.parent1Name, "אב");
    assert.equal(merged.parent2Phone, "0502222222");
  });

  it("supports full-form replace when all fields are sent", () => {
    const fullBody = {
      parent1Name: "New Parent",
      parent1Phone: "050",
      parent1NationalId: "1",
      parent2Name: null,
      parent2Phone: null,
      parent2NationalId: null,
      parentEmail: null,
      address: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      transportationNotes: null,
      internalNotes: null,
      dateOfBirth: null,
      childAgeYears: null,
      medicalAllergyNotes: null,
    };
    const parsed = parseSchoolStudentAdminProfileInput(fullBody);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.presentKeys.length, 15);
    const merged = mergeAdminProfileFields(existingRow, parsed.fields, parsed.presentKeys);
    assert.equal(merged.parent1Name, "New Parent");
    assert.equal(merged.parent1Phone, "050");
    assert.equal(merged.parent2Name, null);
    assert.equal(merged.address, null);
  });
});

describe("school student admin profile mapping", () => {
  const row = {
    parent1_name: "אב",
    parent1_phone: "050",
    parent1_national_id: "123",
    parent2_name: null,
    parent2_phone: null,
    parent2_national_id: null,
    parent_email: "a@b.com",
    address: "כתובת",
    emergency_contact_name: "דוד",
    emergency_contact_phone: "051",
    transportation_notes: "הסעה",
    internal_notes: "פנימי",
    date_of_birth: "2015-01-01",
    child_age_years: 11,
    medical_allergy_notes: "אלרגיה",
    updated_at: "2026-05-31T00:00:00.000Z",
    updated_by: "00000000-0000-4000-8000-000000000001",
  };

  it("maps school-portal profile with national IDs and audit", () => {
    const profile = mapSchoolStudentAdminProfileRow(row, { updatedByName: "מנהל" });
    assert.equal(profile.parent1NationalId, "123");
    assert.equal(profile.updatedByName, "מנהל");
    assert.equal(profile.dateOfBirth, "2015-01-01");
  });

  it("strips teacher-withheld fields", () => {
    const profile = mapSchoolStudentAdminProfileRow(row, {
      includeNationalIds: false,
      includeAudit: false,
    });
    const stripped = stripTeacherAdminProfileFields(profile);
    assert.equal("parent1NationalId" in stripped, false);
    assert.equal("parent2NationalId" in stripped, false);
    assert.equal("updatedBy" in stripped, false);
    assert.equal("updatedByName" in stripped, false);
    assert.equal(stripped.medicalAllergyNotes, "אלרגיה");
  });
});

describe("child age helpers", () => {
  it("computes age from date of birth", () => {
    const age = computeChildAgeYears("2015-01-01", new Date("2026-05-31T12:00:00.000Z"));
    assert.equal(age, 11);
  });

  it("clears manual age when DOB is set in create payload", () => {
    const payload = adminProfileFormToPayload({
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
      dateOfBirth: "2015-01-01",
      childAgeYears: "9",
      medicalAllergyNotes: "",
    });
    assert.equal(payload.childAgeYears, null);
  });
});

describe("operator grant matrix for admin profile", () => {
  /** Mirrors requireSchoolStudentBrowseContext operator branch. */
  function operatorCanGetAdminProfile(grants) {
    return grants.student_access_admin === true || grants.student_data_viewer === true;
  }

  /** Mirrors requireSchoolCredentialAdminContext operator branch (PUT). */
  function operatorCanPutAdminProfile(grants) {
    return grants.student_access_admin === true;
  }

  /** Mirrors canManageStudentAccess for school_operator (manager always true). */
  function operatorCanCreateStudent(grants) {
    return grants.student_access_admin === true;
  }

  it("student_data_viewer only → GET allowed, PUT denied", () => {
    const grants = { student_access_admin: false, student_data_viewer: true };
    assert.equal(operatorCanGetAdminProfile(grants), true);
    assert.equal(operatorCanPutAdminProfile(grants), false);
    assert.equal(operatorCanCreateStudent(grants), false);
  });

  it("student_access_admin only → GET allowed, PUT allowed", () => {
    const grants = { student_access_admin: true, student_data_viewer: false };
    assert.equal(operatorCanGetAdminProfile(grants), true);
    assert.equal(operatorCanPutAdminProfile(grants), true);
    assert.equal(operatorCanCreateStudent(grants), true);
  });

  it("both grants → GET allowed, PUT allowed", () => {
    const grants = { student_access_admin: true, student_data_viewer: true };
    assert.equal(operatorCanGetAdminProfile(grants), true);
    assert.equal(operatorCanPutAdminProfile(grants), true);
    assert.equal(operatorCanCreateStudent(grants), true);
  });

  it("no grants → GET denied, PUT denied", () => {
    const grants = { student_access_admin: false, student_data_viewer: false };
    assert.equal(operatorCanGetAdminProfile(grants), false);
    assert.equal(operatorCanPutAdminProfile(grants), false);
    assert.equal(operatorCanCreateStudent(grants), false);
  });
});

describe("route wiring static checks", () => {
  it("school admin-profile GET uses browse context (either grant), PUT uses credential admin", () => {
    const routeSrc = read("pages/api/school/students/[studentId]/admin-profile.js");
    assert.match(routeSrc, /requireSchoolStudentBrowseContext/);
    assert.match(routeSrc, /requireSchoolCredentialAdminApiContext/);
    assert.doesNotMatch(routeSrc, /requireSchoolDataViewerContext/);
    assert.match(routeSrc, /verifyStudentVisibleToSchool/);
    assert.match(routeSrc, /school_student_admin_profile_write/);
  });

  it("requireSchoolStudentBrowseContext allows student_access_admin OR student_data_viewer", () => {
    const helperSrc = read("lib/school-server/school-request.server.js");
    const browseBlock = helperSrc.slice(
      helperSrc.indexOf("export async function requireSchoolStudentBrowseContext"),
      helperSrc.indexOf("export async function requireSchoolStudentBrowseApiContext")
    );
    assert.match(browseBlock, /student_access_admin/);
    assert.match(browseBlock, /student_data_viewer/);
    assert.match(browseBlock, /!grants\.student_access_admin && !grants\.student_data_viewer/);
  });

  it("requireSchoolDataViewerContext requires student_data_viewer only (not used for admin-profile GET)", () => {
    const helperSrc = read("lib/school-server/school-request.server.js");
    const viewerBlock = helperSrc.slice(
      helperSrc.indexOf("export async function requireSchoolDataViewerContext"),
      helperSrc.indexOf("export async function requireSchoolCredentialAdminApiContext")
    );
    assert.match(viewerBlock, /requireGrant:\s*"student_data_viewer"/);
    assert.doesNotMatch(viewerBlock, /student_access_admin/);
  });

  it("school name route uses credential admin and rate limit", () => {
    const src = read("pages/api/school/students/[studentId]/name.js");
    assert.match(src, /requireSchoolCredentialAdminApiContext/);
    assert.match(src, /school_student_name_update/);
    assert.match(src, /updateSchoolStudentName/);
  });

  it("teacher admin-profile strips national IDs server-side", () => {
    const src = read("pages/api/teacher/students/[studentId]/admin-profile.js");
    assert.match(src, /requireTeacherApiContext/);
    assert.match(src, /teacherHasReportAccessToStudent/);
    assert.match(src, /stripTeacherAdminProfileFields/);
    assert.match(src, /parent1NationalId/);
    assert.doesNotMatch(src, /requireSchoolDataViewerContext/);
  });

  it("school admin-profile passes presentKeys into upsert", () => {
    const src = read("pages/api/school/students/[studentId]/admin-profile.js");
    assert.match(src, /presentKeys:\s*parsed\.presentKeys/);
  });

  it("server merge helper preserves partial updates", () => {
    const src = read("lib/school-server/school-student-profile.server.js");
    assert.match(src, /mergeAdminProfileFields/);
    assert.match(src, /presentKeys/);
  });

  it("migration creates school_student_profiles without profile_hidden_fields", () => {
    const sql = read("supabase/migrations/053_school_student_admin_profiles.sql");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.school_student_profiles/);
    assert.match(sql, /parent1_national_id/);
    assert.match(sql, /parent2_national_id/);
    assert.doesNotMatch(sql, /profile_hidden_fields/);
    assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  });

  it("students page shows create form for manager or student_access_admin secretary", () => {
    const src = read("pages/school/students/index.js");
    assert.match(src, /canCreateStudent/);
    assert.match(src, /canManageStudentAccess/);
    assert.doesNotMatch(src, /\{isManager \?\s*\(\s*\n\s*<SchoolStudentCreateForm/);
    assert.match(src, /authMethod=\{authMethod\}/);
  });

  it("create form accepts staff-cookie sessions via hasSchoolPortalSession", () => {
    const src = read("components/school-portal/SchoolStudentCreateForm.jsx");
    assert.match(src, /hasSchoolPortalSession\(accessToken, authMethod\)/);
    assert.match(src, /setProfileWarning/);
    assert.match(src, /setMessage\(SCHOOL_CREATE_STUDENT_SUCCESS\)/);
    assert.match(src, /adminProfileFormToPayload/);
  });

  it("POST /api/school/students uses credential admin (manager or student_access_admin)", () => {
    const src = read("pages/api/school/students/index.js");
    assert.match(src, /requireSchoolCredentialAdminApiContext/);
    assert.doesNotMatch(src, /requireSchoolManagerApiContext/);
    assert.match(src, /ctx\.actorUserId/);
  });
});
