import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const contentDir = join(root, "data", "help-center", "content");

const SECTION_BY_FILE = {
  "parents.js": "parents",
  "students.js": "students",
  "parent-report.js": "parent-report",
  "subjects.js": "subjects",
};

const MASTER_SLUG = {
  math: "/learning/math-master",
  geometry: "/learning/geometry-master",
  english: "/learning/english-master",
  science: "/learning/science-master",
  hebrew: "/learning/hebrew-master",
  "moledet-geography": "/learning/moledet-geography-master",
};

/** @returns {{ section: string, slug: string, region: string }[]} */
export function loadScreenshotJobs() {
  const jobs = [];
  const blockRe = /screenshotBlock\(\s*S,\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"/g;

  for (const file of readdirSync(contentDir)) {
    if (!file.endsWith(".js")) continue;
    const section = SECTION_BY_FILE[file];
    if (!section) continue;
    const text = readFileSync(join(contentDir, file), "utf8");
    let m;
    while ((m = blockRe.exec(text))) {
      jobs.push({ section, slug: m[1], region: m[2] });
    }
    if (section === "subjects") {
      const slugRe = /subjectArticle\(\s*"([^"]+)"/g;
      const regions = [];
      const rre = /screenshotBlock\(\s*S,\s*slug,\s*"([^"]+)",/g;
      let rm;
      while ((rm = rre.exec(text))) regions.push(rm[1]);
      let sm;
      while ((sm = slugRe.exec(text))) {
        for (const region of regions) {
          jobs.push({ section, slug: sm[1], region });
        }
      }
    }
  }
  return jobs;
}

/**
 * Map a screenshot job to a URL path (no origin) and auth requirement.
 */
export function routeForJob(job) {
  const { section, slug, region } = job;

  if (section === "subjects") {
    return { path: MASTER_SLUG[slug] || `/learning/${slug}`, auth: "student" };
  }

  if (section === "students") {
    const map = {
      "student-login": { path: "/student/login", auth: "none" },
      "student-home-tour": { path: "/student/home", auth: "student" },
      "choose-subject-and-grade": { path: "/learning", auth: "student" },
      "answering-questions": { path: "/learning/hebrew-master", auth: "student" },
      "daily-missions": { path: "/student/home", auth: "student" },
      "monthly-persistence": { path: "/student/home", auth: "student" },
      "coins-and-arcade": { path: "/student/arcade", auth: "student" },
      "avatar-and-profile": { path: "/student/home", auth: "student" },
      "offline-games": { path: "/offline", auth: "student" },
    };
    return map[slug] || { path: "/student/home", auth: "student" };
  }

  if (section === "parents") {
    const map = {
      "welcome-and-overview": { path: "/", auth: "none" },
      "create-parent-account": { path: "/parent/login", auth: "none" },
      "parent-dashboard-tour": { path: "/parent/dashboard", auth: "parent" },
      "add-students": { path: "/parent/dashboard", auth: "parent" },
      "student-pin-and-credentials": { path: "/parent/dashboard", auth: "parent" },
      "edit-or-delete-student": { path: "/parent/dashboard", auth: "parent" },
      "how-to-read-report": { path: "/parent/dashboard", auth: "parent" },
      "parent-copilot": { path: "__PARENT_REPORT__", auth: "parent" },
      "monthly-rewards": { path: "/parent/rewards", auth: "parent" },
      "install-as-app": { path: "/", auth: "none" },
      "mobile-and-offline": { path: "/offline", auth: "none" },
    };
    return map[slug] || { path: "/parent/dashboard", auth: "parent" };
  }

  if (section === "parent-report") {
    const detailedPage = slug === "detailed-report";
    return {
      path: detailedPage ? "__PARENT_REPORT_DETAILED__" : "__PARENT_REPORT__",
      auth: "parent",
    };
  }

  return { path: "/", auth: "none" };
}

/** @param {"A"|"B"|"C"|"D"|string} batch */
export function filterJobsForBatch(jobs, batch) {
  const b = String(batch || "")
    .trim()
    .toUpperCase();
  if (!["A", "B", "C", "D"].includes(b)) {
    throw new Error(`Unknown batch "${batch}" — use A, B, C, or D`);
  }
  return jobs.filter((job) => {
    const route = routeForJob(job);
    if (b === "A") return route.auth === "none";
    if (b === "B") return route.auth === "parent";
    if (b === "C") return route.auth === "student" && job.section === "students";
    if (b === "D") return route.auth === "student" && job.section === "subjects";
    return false;
  });
}

/** Parse progress-report job id: section/slug/viewport/region */
export function parseJobId(id) {
  const parts = String(id).split("/");
  if (parts.length !== 4) return null;
  return {
    section: parts[0],
    slug: parts[1],
    viewport: parts[2],
    region: parts[3],
  };
}

export function jobMatchesParsed(job, parsed) {
  return (
    job.section === parsed.section &&
    job.slug === parsed.slug &&
    job.region === parsed.region
  );
}
