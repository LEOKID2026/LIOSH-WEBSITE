#!/usr/bin/env node
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { RECAPTURE_JOB_KEYS } from "./recapture-visual-fix-jobs.mjs";

const vps = ["mobile", "tablet", "desktop"];
let deleted = 0;

for (const key of RECAPTURE_JOB_KEYS) {
  const [section, slug, region] = key.split("/");
  for (const vp of vps) {
    for (const root of ["qa-evidence-audit/help-center", "public/help-center/screenshots"]) {
      const p = join(root, section, slug, vp, `${region}.png`);
      if (existsSync(p)) {
        unlinkSync(p);
        deleted++;
      }
    }
  }
}

const statePath = "data/help-center/_capture-state.json";
if (existsSync(statePath)) {
  const st = JSON.parse(readFileSync(statePath, "utf8"));
  for (const k of Object.keys(st.jobs || {})) {
    for (const key of RECAPTURE_JOB_KEYS) {
      if (k.startsWith(`${key}/`)) delete st.jobs[k];
    }
  }
  writeFileSync(statePath, `${JSON.stringify(st, null, 2)}\n`, "utf8");
}

console.log(`Deleted ${deleted} PNG file(s) for ${RECAPTURE_JOB_KEYS.length} job keys.`);
