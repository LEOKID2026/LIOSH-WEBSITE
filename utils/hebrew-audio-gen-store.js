/**
 * מיקום כתיבת קבצי TTS לעברית — API בלבד (Node).
 * ב Vercel/Lambda אין כתיבה קבועה אל public; משתמשים ב /tmp באותה מכונה.
 * אם יש כמה instances, ייתכן cache miss — אז צריך object storage או sticky sessions.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function isEphemeralDeployRuntime() {
  return (
    process.env.VERCEL === "1" ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    process.env.NETLIFY === "true"
  );
}

/**
 * @param {string} hash16
 * @returns {{ dir: string, filePath: string }}
 */
export function getHebrewGenMp3Paths(hash16) {
  const h = String(hash16 || "").trim().toLowerCase();
  if (!/^[a-f0-9]{16}$/.test(h)) {
    throw new Error("invalid_hash16");
  }
  const dir = isEphemeralDeployRuntime()
    ? path.join(os.tmpdir(), "mleo-hebrew-audio-gen", "v1")
    : path.join(process.cwd(), "public", "audio", "hebrew", "gen", "v1");
  return { dir, filePath: path.join(dir, `${h}.mp3`) };
}
