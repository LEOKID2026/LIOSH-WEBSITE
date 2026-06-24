/**
 * Capture screenshot/HTML/DOM probe on harness timeout (infra triage).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

export function attachPageDiagnostics(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    pageErrors.push(String(err?.message || err));
  });
  return { consoleErrors, pageErrors };
}

export async function captureTimeoutArtifacts(
  page,
  outAbsDir,
  label,
  { repoRoot = process.cwd(), playerTestId = null, consoleErrors = [], pageErrors = [] } = {}
) {
  await mkdir(outAbsDir, { recursive: true });
  const safeLabel = String(label).replace(/[^\w.-]+/g, "_");
  const artifacts = {
    label: safeLabel,
    capturedAt: new Date().toISOString(),
    route: null,
    screenshot: null,
    html: null,
    domProbe: null,
    consoleErrors: [...consoleErrors],
    pageErrors: [...pageErrors],
  };

  try {
    artifacts.route = page.url();
  } catch {
    artifacts.route = null;
  }

  const shotPath = join(outAbsDir, `${safeLabel}-timeout.png`);
  try {
    await page.screenshot({ path: shotPath, fullPage: true });
    artifacts.screenshot = relative(repoRoot, shotPath);
  } catch (error) {
    artifacts.screenshotError = error?.message || String(error);
  }

  const htmlPath = join(outAbsDir, `${safeLabel}-timeout.html`);
  try {
    const html = await page.content();
    await writeFile(htmlPath, html, "utf8");
    artifacts.html = relative(repoRoot, htmlPath);
  } catch (error) {
    artifacts.htmlError = error?.message || String(error);
  }

  try {
    artifacts.domProbe = await page.evaluate((testId) => {
      const visible = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      };
      const playerSel = testId ? `[data-testid="${testId}"]` : null;
      return {
        url: location.href,
        pathname: location.pathname,
        title: document.title,
        playerTestId: testId,
        playerInDom: playerSel ? !!document.querySelector(playerSel) : null,
        playerVisible: playerSel ? visible(playerSel) : null,
        loginUsernameInDom: !!document.querySelector('[data-testid="student-login-username"]'),
        loginUsernameVisible: visible('[data-testid="student-login-username"]'),
        stopGameVisible: visible('[data-testid="learning-stop-game"]'),
        bodySnippet: (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 800),
      };
    }, playerTestId);
  } catch (error) {
    artifacts.domProbeError = error?.message || String(error);
  }

  const jsonPath = join(outAbsDir, `${safeLabel}-timeout.json`);
  await writeFile(jsonPath, `${JSON.stringify(artifacts, null, 2)}\n`, "utf8");
  artifacts.manifest = relative(repoRoot, jsonPath);

  return artifacts;
}
