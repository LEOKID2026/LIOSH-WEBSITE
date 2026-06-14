/**
 * העלאה עמידת פיתוח + תור סקירה — מטא דאטה בשרת; בינארי אופציונלי קטן.
 * Retention: ראו docs/HEBREW_AUDIO_FREEZE.md
 */

import fs from "node:fs/promises";
import path from "node:path";

import { normalizeReviewQueueRow } from "../../utils/hebrew-audio-review-queue.js";
import { rejectIfHebrewAudioArtifactRateLimited } from "../../lib/security/public-api-rate-limit.js";

const STORE = path.join(process.cwd(), "data", "_audio_store");
const QUEUE_FILE = path.join(process.cwd(), "data", "hebrew-audio-review-queue.json");

async function ensureDirs() {
  await fs.mkdir(STORE, { recursive: true });
  await fs.mkdir(path.dirname(QUEUE_FILE), { recursive: true });
}

async function readQueue() {
  try {
    const raw = await fs.readFile(QUEUE_FILE, "utf8");
    const j = JSON.parse(raw);
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}

async function writeQueue(rows) {
  await fs.writeFile(QUEUE_FILE, JSON.stringify(rows.slice(-500), null, 2), "utf8");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfHebrewAudioArtifactRateLimited(req, res)) return;

  try {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const artifact_id = String(body.artifact_id || "").trim();
    if (!artifact_id || artifact_id.length > 120) {
      return res.status(400).json({ ok: false, error: "invalid_artifact_id" });
    }

    await ensureDirs();

    const b64 = body.audio_data_base64 != null ? String(body.audio_data_base64) : "";
    const storeAudioOnDisk = b64.length > 0 && b64.length <= 600_000;

    const meta = {
      artifact_id,
      audio_asset_id: String(body.audio_asset_id || ""),
      task_mode: String(body.task_mode || ""),
      locale: String(body.locale || "he-IL"),
      review_route: String(body.review_route || ""),
      scoring_policy: String(body.scoring_policy || ""),
      mime_type: String(body.mime_type || ""),
      duration_ms: body.duration_ms ?? null,
      transcript_snapshot: String(body.transcript_snapshot || "").slice(0, 2000),
      grade_key: String(body.grade_key || ""),
      topic: String(body.topic || ""),
      auto_score: Boolean(body.auto_score),
      manual_review: Boolean(body.manual_review),
      stored_at_server: new Date().toISOString(),
      audio_stored: storeAudioOnDisk,
      retention_policy: "dev_local_default_30d_advisory",
    };

    const artifactPath = path.join(STORE, `${artifact_id.replace(/[^\w.-]/g, "_")}.json`);
    const payload = storeAudioOnDisk ? { ...meta, audio_data_base64: b64 } : meta;
    await fs.writeFile(artifactPath, JSON.stringify(payload, null, 2), "utf8");

    const qRow = normalizeReviewQueueRow({
      artifact_id,
      audio_asset_id: meta.audio_asset_id,
      task_mode: meta.task_mode,
      state: "pending_manual_review",
      moderation_flag: body.moderation_flag === "suspicious" ? "suspicious" : "none",
      grade_key: meta.grade_key,
      topic: meta.topic,
    });

    const q = await readQueue();
    q.push(qRow);
    await writeQueue(q);

    return res.status(200).json({ ok: true, artifact_id, review_state: qRow.state });
  } catch (e) {
    console.error("hebrew-audio-artifact", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "2mb",
    },
  },
};
