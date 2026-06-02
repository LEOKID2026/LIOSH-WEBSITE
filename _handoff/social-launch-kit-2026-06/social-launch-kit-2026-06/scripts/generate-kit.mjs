#!/usr/bin/env node
/**
 * Social launch kit asset generator — isolated handoff script.
 * Captures safe public screenshots from production and renders Hebrew marketing PNGs.
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "assets", "source");
const FINAL = join(ROOT, "assets", "final");
const BASE_URL = process.env.SOCIAL_KIT_BASE_URL || "https://liosh-website.vercel.app";

mkdirSync(SOURCE, { recursive: true });
mkdirSync(FINAL, { recursive: true });

const BRAND = {
  bg0: "#050816",
  bg1: "#0b1020",
  amber: "#fbbf24",
  amberLight: "#fcd34d",
  rose: "#fda4af",
  emerald: "#34d399",
  white: "#ffffff",
  muted: "rgba(255,255,255,0.72)",
};

const FONT_LINK = "";

function baseStyles(w, h) {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${w}px; height: ${h}px; overflow: hidden;
      font-family: 'Segoe UI', 'Arial', 'David', 'Rubik', sans-serif;
      direction: rtl;
    }
    body {
      background: linear-gradient(145deg, ${BRAND.bg0} 0%, ${BRAND.bg1} 45%, #0f172a 100%);
      color: ${BRAND.white};
      position: relative;
    }
    .glow {
      position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.35; pointer-events: none;
    }
    .glow-a { width: ${Math.round(w * 0.55)}px; height: ${Math.round(w * 0.55)}px; background: ${BRAND.amber}; top: -${Math.round(h * 0.12)}px; left: -${Math.round(w * 0.08)}px; }
    .glow-b { width: ${Math.round(w * 0.45)}px; height: ${Math.round(w * 0.45)}px; background: ${BRAND.rose}; bottom: -${Math.round(h * 0.08)}px; right: -${Math.round(w * 0.05)}px; opacity: 0.22; }
    .glow-c { width: ${Math.round(w * 0.35)}px; height: ${Math.round(w * 0.35)}px; background: ${BRAND.emerald}; bottom: ${Math.round(h * 0.15)}px; left: ${Math.round(w * 0.05)}px; opacity: 0.18; }
    .frame {
      position: relative; z-index: 2; width: 100%; height: 100%;
      display: flex; flex-direction: column; justify-content: center;
      padding: ${Math.round(w * 0.08)}px;
    }
    .brand-row {
      display: flex; align-items: center; gap: 14px; margin-bottom: ${Math.round(h * 0.04)}px;
    }
    .brand-row.center { justify-content: center; }
    .logo { width: ${Math.round(w * 0.09)}px; height: ${Math.round(w * 0.09)}px; object-fit: contain; }
    .logo-lg { width: ${Math.round(w * 0.16)}px; height: ${Math.round(w * 0.16)}px; }
    .brand-name { font-size: ${Math.round(w * 0.045)}px; font-weight: 800; letter-spacing: 0.08em; color: ${BRAND.amberLight}; }
    .pill {
      display: inline-block; align-self: flex-start;
      background: rgba(251,191,36,0.15); border: 1px solid rgba(251,191,36,0.35);
      color: ${BRAND.amberLight}; border-radius: 999px;
      padding: 8px 18px; font-size: ${Math.round(w * 0.028)}px; font-weight: 600;
      margin-bottom: ${Math.round(h * 0.025)}px;
    }
    .pill.center { align-self: center; }
    h1 {
      font-size: ${Math.round(w * 0.068)}px; font-weight: 900; line-height: 1.15;
      margin-bottom: ${Math.round(h * 0.02)}px;
    }
    h2 {
      font-size: ${Math.round(w * 0.052)}px; font-weight: 800; line-height: 1.2;
      margin-bottom: ${Math.round(h * 0.018)}px;
    }
    p, li {
      font-size: ${Math.round(w * 0.038)}px; line-height: 1.45; color: ${BRAND.muted}; font-weight: 500;
    }
    .lines { display: flex; flex-direction: column; gap: ${Math.round(h * 0.018)}px; }
    .line-strong { color: ${BRAND.white}; font-weight: 700; font-size: ${Math.round(w * 0.044)}px; line-height: 1.35; }
    .cta {
      margin-top: auto; align-self: flex-start;
      background: linear-gradient(90deg, ${BRAND.amber}, #f59e0b);
      color: #1a1200; font-weight: 800; font-size: ${Math.round(w * 0.032)}px;
      padding: 14px 28px; border-radius: 14px;
    }
    .cta.center { align-self: center; }
    .steps { list-style: none; display: flex; flex-direction: column; gap: ${Math.round(h * 0.022)}px; margin-top: ${Math.round(h * 0.02)}px; }
    .steps li {
      display: flex; align-items: center; gap: 16px; color: ${BRAND.white}; font-weight: 600;
      font-size: ${Math.round(w * 0.042)}px;
    }
    .num {
      width: ${Math.round(w * 0.07)}px; height: ${Math.round(w * 0.07)}px; border-radius: 50%;
      background: rgba(251,191,36,0.2); border: 2px solid ${BRAND.amber};
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; color: ${BRAND.amberLight}; flex-shrink: 0;
      font-size: ${Math.round(w * 0.034)}px;
    }
    .shot-wrap {
      margin-top: ${Math.round(h * 0.03)}px; border-radius: 18px; overflow: hidden;
      border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 20px 50px rgba(0,0,0,0.45);
      max-height: ${Math.round(h * 0.38)}px;
    }
    .shot-wrap img { width: 100%; height: auto; display: block; object-fit: cover; object-position: top; }
    .shot-wrap.question-inset img { height: 340px; object-position: center 8%; }
    .cover-safe {
      position: absolute; inset: 0; z-index: 2; display: flex; flex-direction: column;
      justify-content: center; align-items: flex-end; text-align: right;
      padding: 48px 72px 48px 320px;
    }
    .cover-safe h1 { font-size: 52px; }
    .cover-safe p { font-size: 28px; max-width: 900px; }
    .cover-sub { color: ${BRAND.amberLight}; font-weight: 700; font-size: 30px; margin-top: 12px; }
    .cover-tag { color: ${BRAND.emerald}; font-weight: 700; font-size: 26px; margin-top: 16px; }
    .blank-only .frame { opacity: 0; }
  `;
}

function wrapHtml(w, h, bodyInner, extraClass = "") {
  const fontTag = FONT_LINK ? `<link href="${FONT_LINK}" rel="stylesheet">` : "";
  return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8">${fontTag}<style>${baseStyles(w, h)}</style></head><body class="${extraClass}"><div class="glow glow-a"></div><div class="glow glow-b"></div><div class="glow glow-c"></div>${bodyInner}</body></html>`;
}

function brandBlock(large = false) {
  const cls = large ? "logo logo-lg" : "logo";
  return `<div class="brand-row center"><img class="${cls}" src="../logo-icon-512.png" alt=""/><span class="brand-name">LEO KIDS</span></div>`;
}

const MARKETING_ASSETS = [
  {
    file: "fb-profile-1024.png",
    w: 1024,
    h: 1024,
    html: wrapHtml(
      1024,
      1024,
      `<div class="frame" style="justify-content:center;align-items:center;text-align:center;">
        ${brandBlock(true)}
        <p style="margin-top:24px;font-size:34px;color:rgba(255,255,255,0.8);font-weight:600;">לימוד ותרגול לילדים</p>
      </div>`
    ),
  },
  {
    file: "fb-cover-summer-pilot.png",
    w: 1640,
    h: 624,
    html: wrapHtml(
      1640,
      624,
      `<div class="cover-safe">
        ${brandBlock()}
        <h1 style="margin-top:20px;">שומרים על רצף לימודי בחופש הגדול</h1>
        <p class="cover-sub">אתר לימוד לילדים בכיתות א׳–ו׳</p>
        <p class="cover-tag">חינם לכל הקיץ • בלי כרטיס אשראי</p>
      </div>`
    ),
  },
  {
    file: "fb-post-01-launch.png",
    w: 1080,
    h: 1080,
    html: wrapHtml(
      1080,
      1080,
      `<div class="frame"><span class="pill">פיילוט קיץ 2026</span>
        <div class="lines">
          <div class="line-strong">פיילוט קיץ חינמי</div>
          <div class="line-strong">לילדים בכיתות א׳–ו׳</div>
          <p>כמה דקות ביום לשמירה על רצף לימודי</p>
        </div>
        <div class="cta">מתחילים בחינם</div></div>`
    ),
  },
  {
    file: "fb-post-02-how-it-works.png",
    w: 1080,
    h: 1080,
    html: wrapHtml(
      1080,
      1080,
      `<div class="frame"><h2>איך זה עובד?</h2>
        <ol class="steps">
          <li><span class="num">1</span>נרשמים כהורה</li>
          <li><span class="num">2</span>מוסיפים ילד</li>
          <li><span class="num">3</span>הילד מתרגל ואתם רואים דוח</li>
        </ol></div>`
    ),
  },
  {
    file: "fb-post-03-parent-report.png",
    w: 1080,
    h: 1080,
    html: wrapHtml(
      1080,
      1080,
      `<div class="frame"><h2>מה ההורה מקבל?</h2>
        <div class="lines">
          <div class="line-strong">מעקב ברור</div>
          <div class="line-strong">נושאים לחיזוק</div>
          <p>תמונה פשוטה בלי לנחש</p>
        </div>
        SCREENSHOT_SLOT</div>`
    ),
    screenshot: "parent-report-summary-help.png",
  },
  {
    file: "fb-post-04-child-practice.png",
    w: 1080,
    h: 1080,
    html: wrapHtml(
      1080,
      1080,
      `<div class="frame"><h2>לומדים קצת</h2>
        <div class="lines">
          <div class="line-strong">מתקדמים כל יום</div>
          <p>תרגול קצר ונעים בקצב של הילד</p>
        </div>
        SCREENSHOT_SLOT</div>`
    ),
    screenshot: "learning-subjects-help.png",
    screenshotFallback: "student-question-help.png",
  },
  {
    file: "fb-post-05-free-summer.png",
    w: 1080,
    h: 1080,
    html: wrapHtml(
      1080,
      1080,
      `<div class="frame"><span class="pill">LEO KIDS</span>
        <div class="lines">
          <div class="line-strong">פתוח בחינם לכל החופש הגדול</div>
          <p>פיילוט קיץ להורים וילדים</p>
          <p style="color:#34d399;font-weight:700;">בלי כרטיס אשראי</p>
        </div></div>`
    ),
  },
  {
    file: "fb-post-06-feedback.png",
    w: 1080,
    h: 1080,
    html: wrapHtml(
      1080,
      1080,
      `<div class="frame"><h2>מחפשים הורים לפיילוט</h2>
        <div class="lines">
          <p>נסו עם הילדים</p>
          <div class="line-strong">ותנו לנו פידבק אמיתי</div>
        </div>
        <div class="cta">נסו ותנו פידבק</div></div>`
    ),
  },
  {
    file: "fb-group-share-parent-pilot.png",
    w: 1080,
    h: 1080,
    html: wrapHtml(
      1080,
      1080,
      `<div class="frame"><h2>הורים לילדים בכיתות א׳–ו׳?</h2>
        <div class="lines">
          <div class="line-strong">נסו פיילוט קיץ חינמי</div>
          <p>תרגול לילד • דוח להורה</p>
        </div></div>`
    ),
  },
  {
    file: "story-01-summer-learning.png",
    w: 1080,
    h: 1920,
    html: wrapHtml(
      1080,
      1920,
      `<div class="frame" style="padding-top:120px;padding-bottom:160px;">
        ${brandBlock()}
        <div class="lines" style="margin-top:48px;">
          <div class="line-strong" style="font-size:56px;">החופש הגדול מתחיל</div>
          <div class="line-strong" style="font-size:50px;">שומרים על רצף לימודי</div>
          <p style="font-size:42px;color:#34d399;font-weight:700;">חינם לכל הקיץ</p>
        </div></div>`
    ),
  },
  {
    file: "story-02-10-minutes.png",
    w: 1080,
    h: 1920,
    html: wrapHtml(
      1080,
      1920,
      `<div class="frame" style="padding-top:140px;padding-bottom:180px;">
        <div class="lines">
          <div class="line-strong" style="font-size:58px;">כמה דקות ביום</div>
          <p style="font-size:46px;color:#fff;font-weight:700;">תרגול קצר לילד</p>
          <p style="font-size:46px;color:#fcd34d;font-weight:700;">דוח ברור להורה</p>
        </div></div>`
    ),
  },
  {
    file: "story-03-feedback.png",
    w: 1080,
    h: 1920,
    html: wrapHtml(
      1080,
      1920,
      `<div class="frame" style="justify-content:center;text-align:center;align-items:center;">
        <span class="pill center">פיילוט קיץ</span>
        <div class="lines" style="margin-top:40px;align-items:center;">
          <div class="line-strong" style="font-size:54px;">פיילוט קיץ חינמי</div>
          <p style="font-size:44px;">נסו ותנו פידבק</p>
        </div>
        <div class="cta center" style="margin-top:80px;">להצטרפות לפיילוט</div></div>`
    ),
  },
  {
    file: "blank-square-background.png",
    w: 1080,
    h: 1080,
    html: wrapHtml(1080, 1080, `<div class="frame"></div>`, "blank-only"),
  },
  {
    file: "blank-story-background.png",
    w: 1080,
    h: 1920,
    html: wrapHtml(1080, 1920, `<div class="frame"></div>`, "blank-only"),
  },
  {
    file: "blank-cover-background.png",
    w: 1640,
    h: 624,
    html: wrapHtml(1640, 624, `<div class="frame"></div>`, "blank-only"),
  },
];

const SCREENSHOT_JOBS = [
  { name: "parent-login.png", path: "/parent/login", viewport: { width: 390, height: 844 }, clip: null },
  {
    name: "learning-hub.png",
    path: "/learning",
    viewport: { width: 390, height: 844 },
    clip: null,
    note: "Unauthenticated /learning redirects to student login — not used in final marketing insets",
  },
  { name: "student-login.png", path: "/student/login", viewport: { width: 390, height: 844 }, clip: null },
  { name: "help-center-home.png", path: "/help", viewport: { width: 390, height: 844 }, clip: null },
  { name: "about-page-mobile.png", path: "/about", viewport: { width: 390, height: 844 }, clip: { x: 0, y: 0, width: 390, height: 700 } },
  {
    name: "homepage-parent-student-crop.png",
    path: "/",
    viewport: { width: 390, height: 844 },
    clip: { x: 12, y: 180, width: 366, height: 420 },
    note: "Cropped to parent+student portal cards only; teacher portal excluded",
  },
  {
    name: "parent-report-help.png",
    path: "/help-center/screenshots/parent-report/report-overview/mobile/short-report.png",
    viewport: { width: 800, height: 1200 },
    directImage: true,
    note: "Contains demo child name in header — reference only, not used in finals",
  },
  {
    name: "parent-report-summary-help.png",
    path: "/help-center/screenshots/parent-report/summary-card/mobile/summary.png",
    directImage: true,
  },
  {
    name: "student-question-help.png",
    path: "/help-center/screenshots/students/answering-questions/mobile/question.png",
    directImage: true,
  },
  {
    name: "learning-subjects-help.png",
    path: "/help-center/screenshots/students/choose-subject-and-grade/mobile/subjects.png",
    directImage: true,
  },
  { name: "logo-coin.png", path: "/images/coin.png", directImage: true },
  { name: "logo-icon-512.png", path: "/images/leo-icons/icon-512.png", directImage: true },
];

const captureLog = [];

async function downloadAsset(page, job) {
  const url = job.path.startsWith("http") ? job.path : `${BASE_URL}${job.path}`;
  const out = join(SOURCE, job.name);
  try {
    if (job.directImage) {
      const resp = await page.goto(url, { waitUntil: "load", timeout: 45000 });
      if (!resp || !resp.ok()) {
        captureLog.push({ name: job.name, status: "failed", reason: `HTTP ${resp?.status?.()}` });
        return null;
      }
      const buf = await resp.body();
      writeFileSync(out, buf);
      captureLog.push({ name: job.name, status: "ok", source: url });
      return out;
    }

    await page.setViewportSize(job.viewport);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);

    if (job.clip) {
      await page.screenshot({ path: out, clip: job.clip });
    } else {
      await page.screenshot({ path: out, fullPage: false });
    }
    captureLog.push({ name: job.name, status: "ok", source: url, note: job.note || null });
    return out;
  } catch (e) {
    captureLog.push({ name: job.name, status: "failed", reason: String(e.message || e) });
    return null;
  }
}

function screenshotSlot(relativeFile, extraClass = "") {
  if (!relativeFile) return "";
  const cls = extraClass ? ` shot-wrap ${extraClass}` : "shot-wrap";
  return `<div class="${cls.trim()}"><img src="../${relativeFile}" alt=""/></div>`;
}

const TEMPLATES = join(SOURCE, "templates");
mkdirSync(TEMPLATES, { recursive: true });

function fileUrl(p) {
  return `file:///${p.replace(/\\/g, "/")}`;
}

async function renderAsset(page, asset, captured) {
  let html = asset.html;
  let shotFile = "";
  if (asset.screenshot) {
    const primary = captured[asset.screenshot];
    const fallback = asset.screenshotFallback ? captured[asset.screenshotFallback] : null;
    if (primary) shotFile = asset.screenshot;
    else if (fallback) shotFile = asset.screenshotFallback;
    html = html.replace("SCREENSHOT_SLOT", screenshotSlot(shotFile, asset.screenshotClass || ""));
  } else {
    html = html.replace("SCREENSHOT_SLOT", "");
  }

  const htmlPath = join(TEMPLATES, asset.file.replace(".png", ".html"));
  writeFileSync(htmlPath, html, "utf8");

  await page.setViewportSize({ width: asset.w, height: asset.h });
  await page.goto(fileUrl(htmlPath), { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(600);
  const out = join(FINAL, asset.file);
  await page.screenshot({ path: out, type: "png" });
  return out;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "he-IL" });
  const page = await context.newPage();

  const captured = {};
  for (const job of SCREENSHOT_JOBS) {
    const p = await downloadAsset(page, job);
    if (p) captured[job.name] = p;
  }

  let logoPath = captured["logo-icon-512.png"] || captured["logo-coin.png"];
  if (!logoPath) {
    logoPath = join(SOURCE, "logo-fallback.png");
    const fbHtml = join(TEMPLATES, "logo-fallback.html");
    writeFileSync(
      fbHtml,
      wrapHtml(
        256,
        256,
        `<div class="frame" style="justify-content:center;align-items:center;"><div style="width:140px;height:140px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#f59e0b);display:flex;align-items:center;justify-content:center;font-size:64px;">🪙</div></div>`
      ),
      "utf8"
    );
    await page.setViewportSize({ width: 256, height: 256 });
    await page.goto(fileUrl(fbHtml), { waitUntil: "load" });
    await page.screenshot({ path: logoPath });
    captured["logo-fallback.png"] = logoPath;
    captureLog.push({ name: "logo-fallback.png", status: "generated", reason: "production logo unavailable" });
  }

  // Copy logo beside templates for relative img src
  const logoBesideTemplates = join(SOURCE, "logo-icon-512.png");
  if (logoPath !== logoBesideTemplates) {
    writeFileSync(logoBesideTemplates, readFileSync(logoPath));
  }

  const rendered = [];
  for (const asset of MARKETING_ASSETS) {
    const out = await renderAsset(page, asset, captured);
    rendered.push(out);
  }

  await browser.close();

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    captureLog,
    renderedAssets: rendered.map((p) => p.replace(ROOT + "\\", "").replace(ROOT + "/", "")),
    capturedSources: Object.keys(captured),
  };
  writeFileSync(join(ROOT, "generation-log.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
