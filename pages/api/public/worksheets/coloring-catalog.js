import { getColoringCatalogForHub } from "../../../../lib/coloring/coloring-catalog.server.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const cards = getColoringCatalogForHub();
  return res.status(200).json({
    ok: true,
    count: cards.length,
    cards,
  });
}
