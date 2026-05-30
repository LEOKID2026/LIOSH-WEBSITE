/**
 * Temporarily raise demo-school quotas via admin API so integration tests can
 * provision staff without leaving the school at operator/teacher limits.
 * Restores saved values in finally blocks.
 */

export const DEMO_SCHOOL_ID = "bb4e5984-d95f-438f-a465-e1a8208ea7de";

const QUOTA_HEADROOM = 12;

/**
 * @param {string} baseUrl
 * @param {string} adminToken
 * @param {import('@supabase/supabase-js').SupabaseClient} db
 * @param {{ teachers?: boolean, operators?: boolean }} [opts]
 */
export async function ensureDemoSchoolQuotaHeadroom(baseUrl, adminToken, db, opts = {}) {
  const needTeachers = opts.teachers !== false;
  const needOperators = opts.operators !== false;

  const schoolRes = await fetch(`${baseUrl}/api/admin/schools/${DEMO_SCHOOL_ID}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const schoolJson = await schoolRes.json().catch(() => ({}));
  const school = schoolJson?.data?.school;
  if (!school) {
    throw new Error("ensureDemoSchoolQuotaHeadroom: could not load demo school quotas");
  }

  const saved = {
    maxSchoolTeachers: school.maxSchoolTeachers,
    maxSchoolManagers: school.maxSchoolManagers,
    maxSchoolStudents: school.maxSchoolStudents,
    maxSchoolOperators: school.maxSchoolOperators,
  };

  const [{ count: teacherCount }, { count: operatorCount }] = await Promise.all([
    needTeachers
      ? db
          .from("school_teacher_memberships")
          .select("id", { count: "exact", head: true })
          .eq("school_id", DEMO_SCHOOL_ID)
          .eq("role", "teacher")
      : Promise.resolve({ count: 0 }),
    needOperators
      ? db
          .from("school_teacher_memberships")
          .select("id", { count: "exact", head: true })
          .eq("school_id", DEMO_SCHOOL_ID)
          .eq("role", "school_operator")
      : Promise.resolve({ count: 0 }),
  ]);

  const patch = {};
  if (needTeachers) {
    patch.maxSchoolTeachers = Math.max(
      (teacherCount ?? 0) + QUOTA_HEADROOM,
      saved.maxSchoolTeachers ?? 20,
      20
    );
  }
  if (needOperators) {
    patch.maxSchoolOperators = Math.max(
      (operatorCount ?? 0) + QUOTA_HEADROOM,
      saved.maxSchoolOperators ?? 5,
      5
    );
  }

  if (Object.keys(patch).length) {
    const patchRes = await fetch(`${baseUrl}/api/admin/schools/${DEMO_SCHOOL_ID}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });
    if (!patchRes.ok) {
      const errJson = await patchRes.json().catch(() => ({}));
      throw new Error(
        `ensureDemoSchoolQuotaHeadroom PATCH failed: ${patchRes.status} ${errJson?.error?.code || ""}`
      );
    }
  }

  return {
    saved,
    async restore() {
      await fetch(`${baseUrl}/api/admin/schools/${DEMO_SCHOOL_ID}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(saved),
      });
    },
  };
}
