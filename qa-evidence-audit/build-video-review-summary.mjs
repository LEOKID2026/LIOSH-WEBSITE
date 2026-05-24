import fs from "fs";
import path from "path";

const roots = [
  {
    group: "parent",
    base: "qa-evidence-audit/parent-video-pilot",
    workflows: [
      { id: "1", slug: "parent-report-ai", title: "מדריך להורה — כניסה לדוח ושימוש ב-AI", status: "approved" },
      { id: "2", slug: "create-parent-account", title: "רישום הורה וכניסה ראשונה", status: "deferred", deferred: true },
      { id: "3", slug: "add-students", title: "הוספת ילד וקבלת קוד תלמיד", status: "approved" },
      { id: "4", slug: "student-login", title: "כניסת תלמיד עם קוד ו-PIN", status: "approved" },
      { id: "5", slug: "how-to-read-report", title: "קריאת דוח הורים — דוח קצר מול דוח מקיף", status: "approved" },
      { id: "6", slug: "parent-copilot", title: "שימוש ב-Copilot לשאלות המשך", status: "approved" },
    ],
  },
  {
    group: "student",
    base: "qa-evidence-audit/student-video-pilot",
    workflows: [
      { id: "SL1", slug: "student-home-tour", title: "כניסת תלמיד ועמוד הבית", status: "technical pass" },
      { id: "SL2", slug: "start-practice", title: "איך מתחילים תרגול במקצוע", status: "technical pass" },
      { id: "SL3", slug: "math-step-explanation", title: "תרגול בחשבון — שאלה, תשובה והסבר צעד־צעד", status: "technical pass" },
      { id: "SL4", slug: "geometry-step-explanation", title: "תרגול בגאומטריה — שאלה חזותית והסבר צעד־צעד", status: "technical pass" },
      { id: "SL5", slug: "wrong-answer-help", title: "מה קורה כשטועים בשאלה", status: "technical pass" },
      { id: "SL6", slug: "streak-and-progress", title: "רצף, ניקוד והתקדמות", status: "technical pass" },
      { id: "SL7", slug: "daily-missions-journey", title: "משימות יומיות / מסע התקדמות חודשי", status: "technical pass" },
      { id: "SL8", slug: "games-arcade", title: "משחקים ותרגול חווייתי", status: "technical pass" },
      { id: "SL9", slug: "subjects-overview", title: "סקירת מקצועות באתר", status: "technical pass" },
    ],
  },
];

function readMeta(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  purpose: "Machine-readable summary for owner visual review of raw tutorial WebMs (audit only; not published).",
  checks: {},
  webms: [],
  workflows: [],
};

const seenPaths = new Set();
const missing = [];
const zeroByte = [];
const duplicates = [];

for (const g of roots) {
  for (const w of g.workflows) {
    const entry = {
      group: g.group,
      workflowId: w.id,
      slug: w.slug,
      title: w.title,
      status: w.status,
      deferred: !!w.deferred,
      desktop: null,
      mobile: null,
    };

    for (const vp of ["desktop", "mobile"]) {
      const webm = path.join(g.base, w.slug, vp, "main.webm").replace(/\\/g, "/");
      const metaPath = path.join(g.base, w.slug, vp, "capture-meta.json");

      if (w.deferred) {
        entry[vp] = { webmPath: webm, exists: false, note: "deferred — no WebM" };
        continue;
      }

      const exists = fs.existsSync(webm);
      let sizeBytes = 0;
      if (exists) {
        sizeBytes = fs.statSync(webm).size;
        if (sizeBytes === 0) zeroByte.push(webm);
      } else {
        missing.push(webm);
      }

      if (seenPaths.has(webm)) duplicates.push(webm);
      else seenPaths.add(webm);

      const meta = readMeta(metaPath);
      const frameCount = meta?.frameCount ?? meta?.frames?.length ?? null;
      const durationSec =
        meta?.decodedDurationSec ?? meta?.durationSec ?? meta?.duration ?? null;

      const fileRec = {
        group: g.group,
        workflowId: w.id,
        slug: w.slug,
        viewport: vp,
        webmPath: webm,
        exists,
        sizeBytes,
        frameCount,
        durationSec,
        fps: meta?.fps ?? 8,
        technicalStatus: w.status,
        verificationOk: meta?.verification?.ok ?? null,
      };
      out.webms.push(fileRec);

      entry[vp] = {
        webmPath: webm,
        exists,
        sizeBytes,
        frameCount,
        durationSec,
        fps: fileRec.fps,
        verificationOk: fileRec.verificationOk,
      };
    }

    out.workflows.push(entry);
  }
}

const parentWebms = out.webms.filter((x) => x.group === "parent" && x.exists);
const studentWebms = out.webms.filter((x) => x.group === "student" && x.exists);

out.summary = {
  totalWebm: out.webms.filter((x) => x.exists).length,
  parentWebm: parentWebms.length,
  studentWebm: studentWebms.length,
  expectedWebm: 28,
  deferredWorkflows: out.workflows.filter((x) => x.deferred).map((x) => ({ id: x.workflowId, slug: x.slug, title: x.title })),
  missing,
  missingCount: missing.length,
  zeroByte,
  zeroByteCount: zeroByte.length,
  duplicatePaths: duplicates,
  duplicateCount: duplicates.length,
};

out.checks.publicHelpCenterVideosDirExists = fs.existsSync("public/help-center/videos");
let manifestCaptured = 0;
try {
  const manifest = fs.readFileSync("data/help-center/videos-manifest.json", "utf8");
  manifestCaptured = (manifest.match(/"assetKind"\s*:\s*"captured"/g) || []).length;
} catch {
  manifestCaptured = -1;
}
out.checks.manifestAssetKindCapturedCount = manifestCaptured;
out.checks.allWebmsExist = missing.length === 0;
out.checks.noZeroByte = zeroByte.length === 0;
out.checks.noDuplicates = duplicates.length === 0;

const outPath = "qa-evidence-audit/video-tutorials-review-summary.json";
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log("Wrote", outPath);
console.log(JSON.stringify(out.summary, null, 2));
