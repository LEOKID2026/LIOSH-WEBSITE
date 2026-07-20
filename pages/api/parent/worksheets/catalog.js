import { requireParentApiContext } from "../../../../lib/auth/persona-guard.server.js";
import { buildUnifiedWorksheetCatalogItems } from "../../../../lib/worksheets/worksheet-public-catalog.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const ctx = await requireParentApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return undefined;

  const items = buildUnifiedWorksheetCatalogItems();

  return res.status(200).json({ ok: true, items, total: items.length });
}
