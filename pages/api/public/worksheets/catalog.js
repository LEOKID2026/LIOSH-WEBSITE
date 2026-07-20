import { rejectIfPublicWorksheetsCatalogRateLimited } from "../../../../lib/security/public-api-rate-limit.js";
import { buildUnifiedWorksheetCatalogItems } from "../../../../lib/worksheets/worksheet-public-catalog.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (rejectIfPublicWorksheetsCatalogRateLimited(req, res)) return undefined;

  const items = buildUnifiedWorksheetCatalogItems();

  return res.status(200).json({ ok: true, items, total: items.length });
}
