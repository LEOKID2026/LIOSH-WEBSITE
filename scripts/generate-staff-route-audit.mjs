import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith(".js")) out.push(p);
  }
  return out;
}

const JWT_ONLY_PATTERNS = [
  /requireAdminApiContext/,
  /auth\.authMethod === ["']staff_cookie["']/,
  /jwt_required/,
];

const AUTH_HELPERS = [
  "requireSchoolManagerApiContext",
  "requireSchoolPortalMeContext",
  "requireSchoolCredentialAdminApiContext",
  "requireSchoolClassAdminApiContext",
  "requireSchoolDataViewerContext",
  "requireSchoolCredentialAdminContext",
  "requireSchoolOperatorApiContext",
  "requireTeacherApiContext",
  "resolveAuthenticatedTeacherUserId",
  "requireAdminApiContext",
];

function analyzeFile(absPath) {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, "/");
  const content = fs.readFileSync(absPath, "utf8");

  let helper = "—";
  for (const h of AUTH_HELPERS) {
    if (content.includes(h)) {
      helper = h;
      break;
    }
  }

  const passesReq =
    /require(?:School|Teacher)[A-Za-z]*ApiContext\(res,\s*req(?:[,)]|\s*,)/.test(content) ||
    /requireSchool(?:PortalMe|DataViewer|CredentialAdmin)Context\(\s*res,\s*req/.test(content) ||
    /resolveAuthenticatedTeacherUserId\([^)]*,\s*req\s*\)/.test(content) ||
    /requireSchoolOperatorApiContext\([^)]*req:\s*req/.test(content) ||
    /requireSchoolOperatorApiContext\([^)]*,\s*\{[^}]*req:\s*req/.test(content);

  const usesAuthHeaderOnly =
    /require(?:School|Teacher)[A-Za-z]*ApiContext\(res,\s*req\.headers\.authorization/.test(content) ||
    /requireAdminApiContext\(res,\s*req\.headers\.authorization/.test(content);

  const passesReqEffective = passesReq && !usesAuthHeaderOnly;

  let jwtOnly = false;
  let staffCookie = false;
  let notes = "";

  if (rel.startsWith("pages/api/admin/")) {
    jwtOnly = true;
    staffCookie = false;
    notes = "Admin portal; Bearer JWT + app_metadata.role=admin (intentionally no staff cookie)";
    return {
      rel,
      helper,
      passesReq: "n/a",
      staffCookie: "no",
      jwtOnly: "yes",
      notes,
    };
  }
  if (rel === "pages/api/teacher/onboard.js") {
    jwtOnly = true;
    staffCookie = false;
    notes = "Explicit staff_cookie rejection (jwt_required)";
    return {
      rel,
      helper,
      passesReq: "yes",
      staffCookie: "no",
      jwtOnly: "yes",
      notes,
    };
  } else if (rel.startsWith("pages/api/school/staff/login.js")) {
    jwtOnly = false;
    staffCookie = false;
    notes = "Public login; sets liosh_staff_session cookie";
  } else if (rel.startsWith("pages/api/school/staff/logout.js")) {
    jwtOnly = false;
    staffCookie = true;
    notes = "Staff session cookie required";
  } else if (
    helper === "resolveAuthenticatedTeacherUserId" ||
    helper.startsWith("requireSchool") ||
    helper.startsWith("requireTeacher")
  ) {
    jwtOnly = false;
    staffCookie = passesReqEffective || content.includes("resolveAuthenticatedTeacherUserId");
    if (!passesReqEffective && helper !== "—") {
      notes = "NEEDS UPDATE: still passes authHeader only";
    } else if (staffCookie) {
      notes = "JWT or liosh_staff_session via resolveAuthenticatedTeacherUserId";
    }
  }

  if (usesAuthHeaderOnly && !rel.startsWith("pages/api/admin/")) {
    notes = notes ? `${notes}; authHeader-only call` : "authHeader-only call — staff cookie blocked";
  }

  return {
    rel,
    helper,
    passesReq: passesReqEffective ? "yes" : usesAuthHeaderOnly ? "no" : helper === "—" ? "n/a" : "partial",
    staffCookie: staffCookie ? "yes" : jwtOnly ? "no" : helper === "—" ? "n/a" : "no",
    jwtOnly: jwtOnly ? "yes" : "no",
    notes,
  };
}

const dirs = [
  "pages/api/school",
  "pages/api/teacher",
  "pages/api/admin",
];

const rows = [];
for (const d of dirs) {
  const abs = path.join(ROOT, d);
  if (!fs.existsSync(abs)) continue;
  for (const f of walk(abs)) {
    rows.push(analyzeFile(f));
  }
}

rows.sort((a, b) => a.rel.localeCompare(b.rel));

const needsUpdate = rows.filter((r) => r.notes.includes("NEEDS UPDATE") || r.passesReq === "no");

let md = `# School Staff Route Audit (B1)

**Prepared by:** Cursor (implementation)  
**Date:** 2026-05-30  
**Scope:** \`pages/api/school/**\`, \`pages/api/teacher/**\`, \`pages/api/admin/**\`  
**Cursor did NOT execute migration 048 or any SQL.**

## Summary

| Metric | Count |
|--------|------:|
| Routes audited | ${rows.length} |
| Staff-cookie capable (school/teacher) | ${rows.filter((r) => r.staffCookie === "yes" && r.jwtOnly === "no").length} |
| JWT-only (admin + onboard) | ${rows.filter((r) => r.jwtOnly === "yes").length} |
| Flagged needs update | ${needsUpdate.length} |

## JWT-only routes (must NOT accept staff cookie)

| Route file | Auth helper | Notes |
|------------|-------------|-------|
`;

for (const r of rows.filter((x) => x.jwtOnly === "yes")) {
  md += `| \`${r.rel}\` | ${r.helper} | ${r.notes || "—"} |\n`;
}

md += `
## Full audit table

| Route file | Auth helper | Passes req | Staff cookie | JWT-only | Notes |
|------------|-------------|:----------:|:------------:|:--------:|-------|
`;

for (const r of rows) {
  md += `| \`${r.rel}\` | ${r.helper} | ${r.passesReq} | ${r.staffCookie} | ${r.jwtOnly} | ${r.notes || "—"} |\n`;
}

if (needsUpdate.length) {
  md += `\n## Flagged for follow-up\n\n`;
  for (const r of needsUpdate) {
    md += `- \`${r.rel}\`: ${r.notes}\n`;
  }
}

const outPath = path.join(ROOT, "docs/auth/SCHOOL_STAFF_ROUTE_AUDIT.md");
fs.writeFileSync(outPath, md);
console.log(`Wrote ${outPath} (${rows.length} routes, ${needsUpdate.length} flagged)`);
