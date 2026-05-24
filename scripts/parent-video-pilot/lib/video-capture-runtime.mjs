/**
 * Shared overlay + frame helpers for parent-video-pilot capture scripts.
 */
import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { moveCursor } from "../../help-center/lib/cursor-overlay.mjs";

export function createFrameCapture(framesDir, fps) {
  let frameIndex = 0;
  return {
    get count() {
      return frameIndex;
    },
    reset() {
      frameIndex = 0;
    },
    async snap(page) {
      const name = `frame_${String(frameIndex).padStart(5, "0")}.png`;
      frameIndex++;
      await page.screenshot({ path: join(framesDir, name), type: "png", animations: "disabled" });
    },
    fps,
  };
}

export async function installOverlays(page, css) {
  await page.evaluate((styleText) => {
    if (!document.getElementById("parent-pilot-style")) {
      const s = document.createElement("style");
      s.id = "parent-pilot-style";
      s.textContent = styleText;
      document.head.appendChild(s);
    }
    if (document.getElementById("parent-pilot-capture-root")) return;
    const el = document.createElement("div");
    el.id = "parent-pilot-capture-root";
    el.innerHTML =
      '<div id="parent-pilot-dim"></div><div id="parent-pilot-highlight"></div><motion-root></motion-root><div id="parent-pilot-caption"></div>'.replace(
        /<\/?motion-root>/g,
        ""
      );
    document.body.appendChild(el);
  }, css);
}

export async function setOverlay(page, { caption, highlightKey, pickHighlight }) {
  await page.evaluate(
    ({ caption, highlightKey, pickSource }) => {
      const cap = document.getElementById("parent-pilot-caption");
      const hl = document.getElementById("parent-pilot-highlight");
      const dim = document.getElementById("parent-pilot-dim");
      if (cap) cap.textContent = caption || "";
      const hide = () => {
        hl?.classList.remove("visible");
        dim?.classList.remove("active");
      };
      if (!highlightKey) {
        hide();
        return;
      }
      const pick = new Function("return (" + pickSource + ")")();
      const el = pick(highlightKey);
      if (!el || !hl) {
        hide();
        return;
      }
      const r = el.getBoundingClientRect();
      const pad = 6;
      hl.style.left = `${Math.max(0, r.left - pad)}px`;
      hl.style.top = `${Math.max(0, r.top - pad)}px`;
      hl.style.width = `${r.width + pad * 2}px`;
      hl.style.height = `${r.height + pad * 2}px`;
      hl.classList.add("visible");
      dim?.classList.add("active");
    },
    { caption, highlightKey, pickSource: pickHighlight.toString() }
  );
}

export async function holdScene(page, scene, frames, { cursor = null, pickHighlight }) {
  await setOverlay(page, { caption: scene.caption, highlightKey: scene.highlight, pickHighlight });
  if (cursor) await moveCursor(page, cursor.x, cursor.y);
  const frameTarget = Math.max(1, Math.round((scene.holdMs / 1000) * frames.fps));
  for (let tick = 0; tick < frameTarget; tick++) {
    if (cursor && tick % 4 === 0) {
      await moveCursor(
        page,
        cursor.x + Math.sin(tick * 0.2) * 4,
        cursor.y + Math.cos(tick * 0.15) * 3
      );
    }
    await frames.snap(page);
    if (tick < frameTarget - 1) await page.waitForTimeout(40);
  }
}

export function analyzeFramesLocal(framesDir, frameCount) {
  const hashes = [];
  let whiteish = 0;
  for (let i = 0; i < frameCount; i++) {
    const p = join(framesDir, `frame_${String(i).padStart(5, "0")}.png`);
    if (!existsSync(p)) continue;
    const buf = readFileSync(p);
    hashes.push(createHash("sha256").update(buf).digest("hex"));
    if (buf.length < 12_000) whiteish++;
  }
  const unique = new Set(hashes).size;
  const early = hashes.slice(0, Math.max(3, Math.floor(frameCount * 0.08)));
  const mid = hashes.slice(Math.floor(frameCount * 0.35), Math.floor(frameCount * 0.55));
  const late = hashes.slice(Math.floor(frameCount * 0.75));
  return {
    unique,
    whiteish,
    earlyChanged: new Set(early).size > 1,
    midChanged: new Set(mid).size > 1,
    lateChanged: new Set(late).size > 1,
  };
}

export async function acceptSignupPolicy(page) {
  await page.evaluate(() => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
  });
  await page.waitForTimeout(600);
  const checkbox = page.locator('[data-policy-acceptance-root] input[type="checkbox"]').first();
  await checkbox.waitFor({ state: "visible", timeout: 20_000 });
  await checkbox.check({ force: true });
  await page.getByRole("button", { name: "אני מסכים/ה וממשיך/ה" }).click();
  await page.waitForSelector('input[type="email"]', { timeout: 30_000 });
}
