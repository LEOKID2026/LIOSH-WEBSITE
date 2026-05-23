/**
 * Load E5.1 parent-report-snapshot JSON artifacts from a nightly folder.
 */

import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const SNAPSHOT_DIR = "parent-report-snapshots";

/**
 * @returns {Promise<Map<string, { baseline: object|null, after: object|null }>>}
 */
export async function loadParentReportSnapshots(baseDirAbs) {
  const byLabel = new Map();
  const dir = path.join(baseDirAbs, SNAPSHOT_DIR);
  if (!existsSync(dir)) return byLabel;

  for (const ent of await readdir(dir)) {
    const m = /^(.+)-(baseline|after)\.json$/i.exec(ent);
    if (!m) continue;
    const [, label, phase] = m;
    try {
      const raw = await readFile(path.join(dir, ent), "utf8");
      const parsed = JSON.parse(raw);
      if (!byLabel.has(label)) byLabel.set(label, { baseline: null, after: null });
      byLabel.get(label)[phase] = parsed;
    } catch {
      // skip invalid snapshot
    }
  }
  return byLabel;
}

export function snapshotHasText(evidence) {
  return Boolean(
    evidence &&
      (String(evidence.visibleText || "").trim() ||
        String(evidence.normalizedVisibleText || "").trim())
  );
}
