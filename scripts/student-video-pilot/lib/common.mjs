/**
 * Shared constants and paths for student-video-pilot captures.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expectedDemoStudentName } from "../../parent-video-pilot/lib/student-demo-account.mjs";

export const FPS = 8;
export const PILOT_PORT_DEFAULT = 3001;
export const DEMO_STUDENT_NAME = expectedDemoStudentName();

export const DESKTOP_VIEWPORT = { width: 1366, height: 900 };
export const MOBILE_VIEWPORT = { width: 390, height: 844 };

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const OVERLAY_CSS = `
#student-pilot-capture-root {
  position: fixed; inset: 0; pointer-events: none; z-index: 2147483640;
  font-family: "Segoe UI", system-ui, Arial, sans-serif;
}
#student-pilot-dim { position: fixed; inset: 0; background: rgba(0,0,0,0); transition: background 0.35s ease; pointer-events: none; }
#student-pilot-dim.active { background: rgba(0,0,0,0.28); }
#student-pilot-caption {
  position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%);
  max-width: min(720px, 88vw); padding: 10px 20px; border-radius: 10px;
  background: rgba(12, 14, 22, 0.88); color: #f8fafc;
  font-size: 17px; font-weight: 600; line-height: 1.4; text-align: center;
  box-shadow: 0 4px 20px rgba(0,0,0,0.35); direction: rtl;
}
#student-pilot-highlight {
  position: fixed; border: 2px solid rgba(255, 255, 255, 0.92); border-radius: 12px;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.4), 0 0 14px rgba(251, 191, 36, 0.18);
  background: transparent; opacity: 0;
  transition: opacity 0.25s ease, left 0.3s ease, top 0.3s ease, width 0.3s ease, height 0.3s ease;
}
#student-pilot-highlight.visible { opacity: 1; }
@media (max-width: 480px) {
  #student-pilot-caption {
    bottom: 18px; max-width: min(360px, 92vw); padding: 8px 14px; font-size: 15px;
  }
}
`;

export function resolveBaseUrl(argv = process.argv.slice(2)) {
  const arg = argv.find((a) => a.startsWith("--base-url="));
  if (arg) return arg.slice("--base-url=".length).replace(/\/$/, "");
  return `http://127.0.0.1:${PILOT_PORT_DEFAULT}`;
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  const slugArg = argv.find((a) => a.startsWith("--slug="));
  const viewportArg = argv.find((a) => a.startsWith("--viewport="));
  const slug = slugArg ? slugArg.slice("--slug=".length).trim() : "";
  const viewport = viewportArg ? viewportArg.slice("--viewport=".length).trim() : "";
  if (!slug || !viewport) {
    throw new Error("Usage: --slug=<workflow-slug> --viewport=desktop|mobile [--base-url=]");
  }
  if (viewport !== "desktop" && viewport !== "mobile") {
    throw new Error(`Invalid viewport: ${viewport} (expected desktop|mobile)`);
  }
  return { slug, viewport, baseUrl: resolveBaseUrl(argv) };
}

export function assertAllowedBaseUrl(baseUrl) {
  const u = new URL(baseUrl);
  const host = u.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".vercel.app")) {
    throw new Error(`Refusing capture base URL: ${baseUrl}`);
  }
}

export function workflowPaths(slug, viewport) {
  const outDir = join(root, "qa-evidence-audit", "student-video-pilot", slug, viewport);
  return {
    outDir,
    outWebm: join(outDir, "main.webm"),
    framesDir: join(outDir, "_frames"),
    metaPath: join(outDir, "capture-meta.json"),
    preflightPath: join(outDir, "preflight-report.json"),
  };
}

export function viewportFor(viewportName) {
  return viewportName === "mobile" ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT;
}

export function isMobileViewport(viewportName) {
  return viewportName === "mobile";
}
