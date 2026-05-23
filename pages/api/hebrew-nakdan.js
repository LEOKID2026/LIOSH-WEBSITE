import { vocalizeHebrewWithDicta } from "../../utils/hebrew-dicta-nakdan";
import { rejectIfHebrewNakdanRateLimited } from "../../lib/security/public-api-rate-limit.js";
import { MAX_HEBREW_NAKDAN_ENTRY_ID_LEN } from "../../lib/security/api-input.server.js";

const MAX_ENTRIES = 24;
const MAX_TEXT_LEN = 3500;

/**
 * POST { entries: [{ id: string, text: string }] }
 * → { entries: [{ id, text }] } (טקסטים מנוקדים כשאפשר; אחרת המקור).
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (rejectIfHebrewNakdanRateLimited(req, res)) return;

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  const entries = body?.entries;
  if (!Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ error: "`entries` must be a non-empty array" });
  }
  if (entries.length > MAX_ENTRIES) {
    return res.status(400).json({ error: "Too many entries" });
  }

  const normalized = [];
  const seenIds = new Set();
  for (const e of entries) {
    const id = e?.id != null ? String(e.id).trim() : "";
    const text = e?.text != null ? String(e.text) : "";
    if (id.length > MAX_HEBREW_NAKDAN_ENTRY_ID_LEN) {
      return res.status(400).json({ error: "Entry id too long" });
    }
    if (!id || seenIds.has(id)) {
      return res.status(400).json({ error: "Each entry needs a unique `id`" });
    }
    seenIds.add(id);
    if (text.length > MAX_TEXT_LEN) {
      return res.status(400).json({ error: "Text too long" });
    }
    normalized.push({ id, text });
  }

  /** טקסט ייחודי → מנוקד (בקשה אחת לכל טקסט) */
  const byText = new Map();
  for (const { id, text } of normalized) {
    if (!byText.has(text)) byText.set(text, []);
    byText.get(text).push(id);
  }

  let vocalizedByText;
  try {
    vocalizedByText = new Map(
      await Promise.all(
        [...byText.keys()].map(async (text) => {
          const v = await vocalizeHebrewWithDicta(text);
          return [text, v];
        })
      )
    );
  } catch {
    return res.status(502).json({ error: "Nakdan service failed" });
  }

  const out = normalized.map(({ id, text }) => ({
    id,
    text: vocalizedByText.has(text) ? vocalizedByText.get(text) : text,
  }));

  return res.status(200).json({ entries: out });
}
