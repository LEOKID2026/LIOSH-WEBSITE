#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const approvedPath = join(root, "data", "help-center", "screenshots-manifest-approved.json");
const manifestPath = join(root, "data", "help-center", "screenshots-manifest.json");
const auditRoot = join(root, "qa-evidence-audit", "help-center");
const publicRoot = join(root, "public");

function ensureDir(p) {
  mkdirSync(p, { recursive: true });
}

function main() {
  if (!existsSync(approvedPath)) {
    console.error("Missing approved manifest — run: npm run help:data-safety-review");
    process.exit(1);
  }

  const approvedDoc = JSON.parse(readFileSync(approvedPath, "utf8"));
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const required = manifest.publicPaths || [];
  const approved = approvedDoc.publicPaths || [];

  if (!approvedDoc.publishAllowed) {
    console.error(
      `Publish blocked: publishAllowed=false (${approvedDoc.approvedCount}/${required.length} approved)`
    );
    process.exit(1);
  }

  if (approved.length !== required.length) {
    console.error(
      `Publish blocked: approved count ${approved.length} !== manifest requirement ${required.length}`
    );
    process.exit(1);
  }

  let copied = 0;
  for (const rel of required) {
    if (!approved.includes(rel)) {
      console.error(`Publish blocked: ${rel} not in approved list`);
      process.exit(1);
    }
    const pubPath = join(publicRoot, rel);
    ensureDir(dirname(pubPath));

    const parts = rel.replace(/^help-center\/screenshots\//, "").split("/");
    const auditPath = join(auditRoot, ...parts);

    if (!existsSync(auditPath)) {
      console.error(`Publish blocked: missing raw file for ${rel}`);
      process.exit(1);
    }
    copyFileSync(auditPath, pubPath);
    copied++;
  }

  console.log(`Published ${copied}/${required.length} approved screenshot(s) to public/`);
}

main();
