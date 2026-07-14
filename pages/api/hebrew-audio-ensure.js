/**
 * יוצר/מבטיח קובץ MP3 להקראת טקסט עברי (Edge neural TTS בשרת בלבד — לא בדפדפן המשתמש).
 * מפתח קובץ: sha256(normalize(text)) → דיסק לפי getHebrewGenMp3Paths (public מקומית / tmp ב Vercel).
 * כתובת נגינה: GET /api/hebrew-audio-stream?h=<hash16> (לא קובץ סטטי ב Git).
 */
import fs from "node:fs";

import { getHebrewGenMp3Paths } from "../../utils/hebrew-audio-gen-store.js";
import { hebrewGenStreamUrl } from "../../utils/hebrew-audio-gen-url.js";
import { narrationContentHash16 } from "../../utils/hebrew-audio-narration-binding.js";
import { rejectIfHebrewAudioEnsureRateLimited } from "../../lib/security/public-api-rate-limit.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "256kb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfHebrewAudioEnsureRateLimited(req, res)) return;

  const text = String(req.body?.text ?? req.body?.narration_plaintext ?? "").trim();
  if (!text || text.length > 2200) {
    return res.status(400).json({ ok: false, error: "invalid_text" });
  }

  const hash16 = narrationContentHash16(text);

  const { dir, filePath } = getHebrewGenMp3Paths(hash16);
  const url = hebrewGenStreamUrl(hash16);

  try {
    if (fs.existsSync(filePath)) {
      const st = fs.statSync(filePath);
      if (st.size > 500) {
        return res.status(200).json({ ok: true, hash16, url, cached: true });
      }
    }

    fs.mkdirSync(dir, { recursive: true });

    const { EdgeTTS } = await import("node-edge-tts");
    const tts = new EdgeTTS({
      voice: "he-IL-HilaNeural",
      lang: "he-IL",
      timeout: 120000,
    });
    await tts.ttsPromise(text, filePath);

    const st = fs.statSync(filePath);
    if (!st.size || st.size < 500) {
      try {
        fs.unlinkSync(filePath);
      } catch {
        /* ignore */
      }
      return res.status(500).json({ ok: false, error: "empty_audio" });
    }

    return res.status(200).json({ ok: true, hash16, url, cached: false });
  } catch (e) {
    console.error("hebrew-audio-ensure", e);
    return res.status(500).json({ ok: false, error: "tts_failed" });
  }
}
