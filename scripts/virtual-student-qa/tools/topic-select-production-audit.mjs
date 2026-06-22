/**
 * Read-only production audit: dump science/geometry topic <select> options
 * after student login. Does NOT start a game or create sessions.
 */
import { SCIENCE_GRADES } from "../../../data/science-curriculum.js";
import {
  GRADES as GEOMETRY_GRADES,
  TOPICS as GEOMETRY_TOPICS,
} from "../../../utils/geometry-constants.js";
import { launchBrowser, newStudentContext } from "../lib/browser.mjs";
import {
  loadAccounts,
  resolveBaseUrl,
  resolveStudentAuthMode,
  selectAccount,
} from "../lib/config.mjs";
import { authenticateStudent } from "../lib/student-auth.mjs";

const SCIENCE_TOPIC_LABELS = {
  body: "🫀 גוף האדם",
  animals: "🐾 בעלי חיים",
  plants: "🌿 צמחים",
  materials: "🧪 חומרים",
  earth_space: "🌍 כדור הארץ והחלל",
  environment: "🌱 סביבה ואקולוגיה",
  experiments: "🔬 ניסויים ותהליכים",
  mixed: "🎲 ערבוב נושאים",
};

const BASE_URL = resolveBaseUrl(process.env.PLAYWRIGHT_BASE_URL);
const TARGETS = [
  { label: "AAA1", grade: 1, science: true, geometry: false },
  { label: "AAA3", grade: 2, science: true, geometry: false },
  { label: "AAA10", grade: 5, science: true, geometry: false },
  { label: "AAA11", grade: 6, science: true, geometry: false },
  { label: "AAA5", grade: 3, science: false, geometry: true },
  { label: "AAA7", grade: 4, science: false, geometry: true },
];

function registryTopics(subject, grade) {
  const gk = `g${grade}`;
  if (subject === "science") {
    return (SCIENCE_GRADES[gk]?.topics || []).map((value) => ({
      value,
      label: SCIENCE_TOPIC_LABELS[value] || value,
    }));
  }
  return (GEOMETRY_GRADES[gk]?.topics || []).map((value) => ({
    value,
    label: `${GEOMETRY_TOPICS[value]?.icon || ""} ${GEOMETRY_TOPICS[value]?.name || value}`.trim(),
  }));
}

async function loginStudent(page, context, account, log) {
  await authenticateStudent({
    context,
    page,
    account,
    baseUrl: BASE_URL,
    mode: resolveStudentAuthMode(),
    log,
  });
}

async function dumpSelect(page, testid) {
  const select = page.getByTestId(testid);
  const count = await select.count();
  if (!count) {
    return { visible: false, enabled: false, optionCount: 0, options: [] };
  }
  const visible = await select.first().isVisible().catch(() => false);
  const enabled = await select.first().isEnabled().catch(() => false);
  const options = await select.first().evaluate((el) =>
    Array.from(el.options).map((o) => ({
      value: o.value,
      label: (o.textContent || "").trim(),
      disabled: o.disabled,
    }))
  );
  return { visible, enabled, optionCount: options.length, options };
}

async function auditSubject(page, path, testid) {
  await page.goto(new URL(path, BASE_URL).toString(), { waitUntil: "domcontentloaded" });
  await page.getByTestId(path.includes("science") ? "science-player-name" : "geometry-player-name")
    .waitFor({ state: "visible", timeout: 30_000 })
    .catch(() => {});
  await page.waitForTimeout(2000);
  return dumpSelect(page, testid);
}

const accounts = loadAccounts();
if (!accounts.length) throw new Error("No virtual-student accounts configured");
const authMode = resolveStudentAuthMode();
const log = (line) => console.error(line);

const browser = await launchBrowser({ headless: true });
const results = [];

for (const target of TARGETS) {
  const account = selectAccount(accounts, target.label);
  const context = await newStudentContext(browser);
  const page = await context.newPage();
  await loginStudent(page, context, account, log);

  if (target.science) {
    const dom = await auditSubject(page, "/learning/science-master", "science-topic-select");
    const registry = registryTopics("science", target.grade);
    results.push({
      student: target.label,
      grade: target.grade,
      subject: "science",
      simRequests: "observation",
      registry,
      dom,
      observationExists: dom.options.some((o) => o.value === "observation"),
      experimentsExists: dom.options.some((o) => o.value === "experiments"),
    });
  }

  if (target.geometry) {
    const dom = await auditSubject(page, "/learning/geometry-master", "geometry-topic-select");
    const registry = registryTopics("geometry", target.grade);
    results.push({
      student: target.label,
      grade: target.grade,
      subject: "geometry",
      simRequests: "shapes",
      registry,
      dom,
      shapesExists: dom.options.some((o) => o.value === "shapes"),
      shapesBasicExists: dom.options.some((o) => o.value === "shapes_basic"),
    });
  }

  await page.close();
  await context.close();
}

await browser.close();
console.log(JSON.stringify(results, null, 2));
