#!/usr/bin/env node
/**
 * Owner Hebrew Copy Pack — groups copy template inventory by unique templateId.
 * Read-only: no copy/engine/metrics changes.
 * Run: node scripts/parent-report-owner-hebrew-copy-pack.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INV_PATH = join(ROOT, "docs", "audits", "parent-report-copy-template-inventory.json");
const OUT_JSON = join(ROOT, "docs", "audits", "parent-report-owner-hebrew-copy-pack.json");
const OUT_MD = join(ROOT, "docs", "audits", "parent-report-owner-hebrew-copy-pack.md");

const SLOT_KEYS = [
  "subjectName",
  "topicName",
  "questions",
  "correct",
  "wrong",
  "accuracy",
  "detectedPattern",
  "affectedSubskill",
  "misconceptionLabel",
  "recommendedAction",
  "priorityTopics",
  "evidenceStrength",
];

const SUBJECT_LEVEL_PREFIXES = ["SUBJECT_", "remediate_priority_topics_"];
const SUBJECT_SURFACES = new Set(["subjectRollup", "parentLetter", "homeAction"]);

/** @param {string} templateId */
function templateLevel(templateId, surfaces) {
  if (SUBJECT_LEVEL_PREFIXES.some((p) => templateId.startsWith(p))) return "subject";
  if ([...surfaces].every((s) => SUBJECT_SURFACES.has(s))) return "subject";
  if (templateId.startsWith("SUBJECT_")) return "subject";
  return "topic";
}

/** @param {string} templateId */
function baseLpdTemplateId(templateId) {
  const idx = templateId.indexOf(":");
  return idx >= 0 ? templateId.slice(0, idx) : templateId;
}

/** @param {string} templateId */
function technicalNotes(templateId, surfaces, sources, decisionCodes) {
  /** @type {string[]} */
  const notes = [];

  if (templateId === "SUBJECT_OPENING_PRIORITY_TOPIC_0") {
    notes.push(
      "Interim render uses priorityTopics[0].parentSafeFinding until owner copy is wired; subjectDecision drives slot selection.",
    );
  }
  if (templateId.startsWith("SUBJECT_DIAGNOSIS_PRIORITY_TOPIC_")) {
    notes.push(
      "Diagnosis line selects priorityTopics[1] when multiple gaps (TOPIC_1) else priorityTopics[0] (TOPIC_0).",
    );
  }
  if (templateId === "SUBJECT_CLOSING_ENGINE_CONTRACT") {
    notes.push("Closing slot may include topic-specific home guidance derived from priority topic metadata.");
  }
  if (templateId === "remediate_priority_topics_same_level") {
    notes.push(
      "homeAction surface may render recommendedSubjectAction code; owner copy should replace action label while preserving decision code.",
    );
  }
  if (templateId.includes(":TOPIC_EXPLAIN_PATTERN")) {
    notes.push("Section renders only when detectedPattern is present on engineDecisionContract.");
  }
  if (templateId.startsWith("NARRATIVE_WE")) {
    notes.push("Narrative tier (WE0/WE1/WE2) follows topic engineDecision + evidence weighting, not standalone copy.");
  }
  if (templateId.includes("RECOMMENDATION_")) {
    notes.push("Recommendation card field; gated by parentTopicTierShowsRecommendationCard on detailed report path.");
  }
  if (baseLpdTemplateId(templateId) === "practice_focus" || baseLpdTemplateId(templateId) === "initial_topic_data") {
    notes.push("Insufficient-data template; slots for pattern/misconception typically empty.");
  }
  if (sources.size === 1 && sources.has("subjectEngineDecisionContract")) {
    notes.push("Subject contract aggregation only; do not change engineDecision codes when replacing copy.");
  }
  if (decisionCodes.has("insufficient_data")) {
    notes.push("insufficient_data decision: copy must remain cautious / non-diagnostic.");
  }

  return notes;
}

/** @param {Record<string, unknown>|undefined} slots */
function pickExampleSlots(slots) {
  /** @type {Record<string, unknown>} */
  const out = {};
  if (!slots || typeof slots !== "object") return out;
  for (const key of SLOT_KEYS) {
    if (slots[key] !== undefined && slots[key] !== null && slots[key] !== "") {
      out[key] = slots[key];
    }
  }
  return out;
}

/** @param {Record<string, unknown>|undefined} slots */
function slotsSchemaForTemplate(slotsList) {
  /** @type {Record<string, { available: boolean, populatedInInventory: boolean }>} */
  const schema = {};
  for (const key of SLOT_KEYS) {
    const populated = slotsList.some((s) => {
      const v = s?.[key];
      return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
    });
    schema[key] = { available: true, populatedInInventory: populated };
  }
  return schema;
}

function mdEscape(s) {
  return String(s || "").replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function buildPack(inventory) {
  /** @type {Map<string, object>} */
  const byTemplate = new Map();

  for (const block of inventory.students || []) {
    const student = String(block.student || "");
    for (const entry of block.entries || []) {
      const templateId = String(entry.templateId || "").trim();
      if (!templateId) continue;

      if (!byTemplate.has(templateId)) {
        byTemplate.set(templateId, {
          templateId,
          inventoryEntryCount: 0,
          students: new Set(),
          decisionCodes: new Set(),
          subjectDecisions: new Set(),
          topicDecisions: new Set(),
          surfaces: new Map(),
          sources: new Set(),
          sections: new Set(),
          renderFunctions: new Set(),
          slotsList: [],
          examples: [],
        });
      }
      const g = byTemplate.get(templateId);
      g.inventoryEntryCount++;
      g.students.add(student);

      const dc = entry.decisionCode != null ? String(entry.decisionCode) : null;
      if (dc) {
        g.decisionCodes.add(dc);
        if (
          [
            "multiple_topic_gaps",
            "focused_strengthening_needed",
            "mixed_subject_profile",
            "subject_strength_stable",
            "insufficient_subject_data",
          ].includes(dc)
        ) {
          g.subjectDecisions.add(dc);
        } else {
          g.topicDecisions.add(dc);
        }
      }

      const surface = String(entry.surface || "");
      const section = String(entry.section || "");
      if (surface) {
        if (!g.surfaces.has(surface)) g.surfaces.set(surface, new Set());
        g.surfaces.get(surface).add(section || surface);
      }
      if (section) g.sections.add(section);
      if (entry.source) g.sources.add(String(entry.source));
      if (entry.renderFunction) g.renderFunctions.add(String(entry.renderFunction));
      g.slotsList.push(entry.slotsAvailable);
      g.examples.push({
        student,
        studentLabel: block.label,
        range: block.range,
        surface,
        section,
        topicKey: entry.topicKey || null,
        decisionCode: dc,
        slotsAvailable: entry.slotsAvailable,
        currentRenderedText: entry.currentRenderedText,
        renderFunction: entry.renderFunction,
      });
    }
  }

  /** @type {object[]} */
  const templates = [];

  for (const g of byTemplate.values()) {
    const surfaceList = [...g.surfaces.keys()].sort();
    const surfacesDetail = surfaceList.map((s) => ({
      surface: s,
      sections: [...(g.surfaces.get(s) || [])].sort(),
    }));

    const examplesSorted = [...g.examples].sort((a, b) => {
      const order = { omer: 0, aaa7: 1 };
      return (order[a.student] ?? 9) - (order[b.student] ?? 9);
    });
    const primaryExample = examplesSorted[0] || null;

    const level = templateLevel(g.templateId, g.surfaces);
    const appearsOnMultipleSurfaces = surfaceList.length > 1;

    const pack = {
      templateId: g.templateId,
      baseLpdTemplateId: baseLpdTemplateId(g.templateId),
      level,
      appearsOnMultipleSurfaces,
      inventoryEntryCount: g.inventoryEntryCount,
      studentsWithLiveExample: [...g.students].sort(),
      decisionCodes: [...g.decisionCodes].sort(),
      subjectDecisions: [...g.subjectDecisions].sort(),
      topicDecisions: [...g.topicDecisions].sort(),
      surfaces: surfacesDetail,
      sources: [...g.sources].sort(),
      slotsAvailable: slotsSchemaForTemplate(g.slotsList),
      exampleLive: primaryExample
        ? {
            student: primaryExample.student,
            studentLabel: primaryExample.studentLabel,
            range: primaryExample.range,
            surface: primaryExample.surface,
            section: primaryExample.section,
            topicKey: primaryExample.topicKey,
            decisionCode: primaryExample.decisionCode,
            slots: pickExampleSlots(primaryExample.slotsAvailable),
            currentRenderedText: primaryExample.currentRenderedText,
          }
        : null,
      renderFunctions: [...g.renderFunctions].sort(),
      technicalConstraints: technicalNotes(
        g.templateId,
        g.surfaces,
        g.sources,
        g.decisionCodes,
      ),
      ownerCopyPlaceholder: null,
    };
    templates.push(pack);
  }

  templates.sort((a, b) => {
    const la = a.level === "subject" ? 0 : 1;
    const lb = b.level === "subject" ? 0 : 1;
    if (la !== lb) return la - lb;
    return String(a.templateId).localeCompare(String(b.templateId));
  });

  return {
    generatedAt: new Date().toISOString(),
    purpose: "owner_hebrew_copy_pack",
    sourceInventory: "docs/audits/parent-report-copy-template-inventory.json",
    sourceInventoryGeneratedAt: inventory.generatedAt,
    constraints: [
      "no_hebrew_copy_changes_by_agent",
      "no_engine_decision_changes",
      "no_metrics_changes",
      "no_template_behavior_changes",
      "grouped_by_unique_templateId",
    ],
    slotKeys: SLOT_KEYS,
    totals: {
      inventoryEntries: inventory.totals?.totalEntries ?? 0,
      uniqueTemplates: templates.length,
      subjectLevelTemplates: templates.filter((t) => t.level === "subject").length,
      topicLevelTemplates: templates.filter((t) => t.level === "topic").length,
      multiSurfaceTemplates: templates.filter((t) => t.appearsOnMultipleSurfaces).length,
    },
    templates,
  };
}

function buildMarkdown(pack) {
  const lines = [
    "# Parent Report — Owner Hebrew Copy Pack",
    "",
    `Generated: ${pack.generatedAt}`,
    "",
    "Grouped from copy template inventory. **No Hebrew was modified.** Owner-authored copy replaces `ownerCopyPlaceholder` per template when ready.",
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "| --- | --- |",
    `| Inventory entries (source) | ${pack.totals.inventoryEntries} |`,
    `| Unique templates | ${pack.totals.uniqueTemplates} |`,
    `| Subject-level templates | ${pack.totals.subjectLevelTemplates} |`,
    `| Topic-level templates | ${pack.totals.topicLevelTemplates} |`,
    `| Multi-surface templates | ${pack.totals.multiSurfaceTemplates} |`,
    "",
    "## Template index",
    "",
    "| templateId | level | surfaces | decisionCodes | live example | entries |",
    "| --- | --- | --- | --- | --- | --- |",
  ];

  for (const t of pack.templates) {
    const surfaces = t.surfaces.map((s) => s.surface).join(", ");
    const decisions = t.decisionCodes.join(", ");
    const ex = t.exampleLive ? `${t.exampleLive.student} (${t.exampleLive.surface})` : "—";
    lines.push(
      `| \`${mdEscape(t.templateId)}\` | ${t.level} | ${mdEscape(surfaces)} | ${mdEscape(decisions)} | ${ex} | ${t.inventoryEntryCount} |`,
    );
  }

  lines.push("", "---", "");

  for (const t of pack.templates) {
    lines.push(`## \`${t.templateId}\``, "");
    lines.push(`- **Level:** ${t.level}${t.appearsOnMultipleSurfaces ? " · **multi-surface**" : ""}`);
    lines.push(`- **Source:** ${t.sources.join(", ")}`);
    lines.push(`- **Inventory entries:** ${t.inventoryEntryCount}`);
    if (t.subjectDecisions.length) {
      lines.push(`- **Subject decisions:** ${t.subjectDecisions.join(", ")}`);
    }
    if (t.topicDecisions.length) {
      lines.push(`- **Topic decisions:** ${t.topicDecisions.join(", ")}`);
    }
    lines.push("- **Surfaces:**");
    for (const s of t.surfaces) {
      lines.push(`  - \`${s.surface}\` → ${s.sections.join(", ")}`);
    }
    lines.push("- **Slots available:**");
    for (const key of SLOT_KEYS) {
      const slot = t.slotsAvailable[key];
      lines.push(`  - \`${key}\`${slot?.populatedInInventory ? " ✓" : ""}`);
    }
    if (t.exampleLive) {
      lines.push(
        `- **Live example:** ${t.exampleLive.studentLabel} · \`${t.exampleLive.surface}/${t.exampleLive.section}\`${t.exampleLive.topicKey ? ` · topic \`${t.exampleLive.topicKey}\`` : ""}`,
      );
      lines.push("- **Example slots:**");
      lines.push("```json");
      lines.push(JSON.stringify(t.exampleLive.slots, null, 2));
      lines.push("```");
      lines.push("- **Current rendered text (unchanged):**");
      lines.push("```");
      lines.push(String(t.exampleLive.currentRenderedText || ""));
      lines.push("```");
    }
    lines.push("- **Render functions:**");
    for (const fn of t.renderFunctions) {
      lines.push(`  - \`${fn}\``);
    }
    if (t.technicalConstraints.length) {
      lines.push("- **Technical constraints:**");
      for (const n of t.technicalConstraints) {
        lines.push(`  - ${n}`);
      }
    }
    lines.push("- **Owner copy placeholder:** _(awaiting owner Hebrew)_");
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  const inventory = JSON.parse(readFileSync(INV_PATH, "utf8"));
  const pack = buildPack(inventory);
  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_JSON, JSON.stringify(pack, null, 2) + "\n", "utf8");
  writeFileSync(OUT_MD, buildMarkdown(pack) + "\n", "utf8");
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_MD}`);
  console.log(
    JSON.stringify(
      {
        uniqueTemplates: pack.totals.uniqueTemplates,
        inventoryEntries: pack.totals.inventoryEntries,
        subjectLevel: pack.totals.subjectLevelTemplates,
        topicLevel: pack.totals.topicLevelTemplates,
        multiSurface: pack.totals.multiSurfaceTemplates,
        allHaveLiveExample: pack.templates.every((t) => t.exampleLive != null),
      },
      null,
      2,
    ),
  );
}

main();
