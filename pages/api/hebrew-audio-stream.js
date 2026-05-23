import fs from "node:fs";

import { getHebrewGenMp3Paths } from "../../utils/hebrew-audio-gen-store.js";
import { rejectIfHebrewAudioStreamRateLimited } from "../../lib/security/public-api-rate-limit.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfHebrewAudioStreamRateLimited(req, res)) return;

  const raw = String(req.query.h ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{16}$/.test(raw)) {
    return res.status(400).json({ ok: false, error: "invalid_h" });
  }

  let filePath;
  try {
    ({ filePath } = getHebrewGenMp3Paths(raw));
  } catch {
    return res.status(400).json({ ok: false, error: "invalid_h" });
  }

  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        ok: false,
        error: "not_found",
        detail: "call POST /api/hebrew-audio-ensure with narration_plaintext first",
      });
    }
    const st = fs.statSync(filePath);
    if (!st.size || st.size < 500) {
      return res.status(404).json({ ok: false, error: "empty_audio" });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=120");
    const stream = fs.createReadStream(filePath);
    stream.on("error", (err) => {
      console.error("hebrew-audio-stream read", err);
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy(err);
      }
    });
    return stream.pipe(res);
  } catch (e) {
    console.error("hebrew-audio-stream", e);
    return res.status(500).json({ ok: false, error: "read_failed" });
  }
}
