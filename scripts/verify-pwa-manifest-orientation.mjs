/**
 * Ensures public/manifest.json does not lock the installed PWA to portrait-only,
 * Verify manifest orientation allows any on game/solo routes while learning stays usable in portrait.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = join(__dirname, "..", "public", "manifest.json");

const portraitLocks = new Set(["portrait-primary", "portrait-secondary", "portrait"]);
const landscapeLocks = new Set(["landscape-primary", "landscape-secondary", "landscape"]);

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (e) {
  console.error("verify-pwa-manifest-orientation: failed to read or parse manifest:", e.message);
  process.exit(1);
}

const o = manifest.orientation;

if (portraitLocks.has(o)) {
  console.error(`verify-pwa-manifest-orientation: forbidden portrait lock orientation=${JSON.stringify(o)}`);
  process.exit(1);
}

if (landscapeLocks.has(o)) {
  console.error(`verify-pwa-manifest-orientation: forbidden global landscape lock orientation=${JSON.stringify(o)}`);
  process.exit(1);
}

if (o !== "any") {
  console.error(
    `verify-pwa-manifest-orientation: expected orientation "any" for installed-app rotation; got ${JSON.stringify(o)}`
  );
  process.exit(1);
}

console.log(
  `verify-pwa-manifest-orientation: OK (${manifestPath}) orientation=${JSON.stringify(o)} display=${JSON.stringify(manifest.display)} start_url=${JSON.stringify(manifest.start_url)} scope=${JSON.stringify(manifest.scope)}`
);
