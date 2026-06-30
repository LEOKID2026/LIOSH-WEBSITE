/**
 * Exit 0 when core Next dev manifests exist; exit 1 when .next is incomplete.
 * Used by run.bat before starting dev server.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

const ROUTES_MANIFEST = path.join(ROOT, ".next", "routes-manifest.json");
const MIDDLEWARE_MANIFEST = path.join(ROOT, ".next", "server", "middleware-manifest.json");

const healthy =
  fs.existsSync(ROUTES_MANIFEST) && fs.existsSync(MIDDLEWARE_MANIFEST);

process.exit(healthy ? 0 : 1);
