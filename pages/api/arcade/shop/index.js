import { requireArcadeStudent } from "../../../../lib/arcade/server/arcade-auth";
import {
  equipCosmetic,
  listOwnedCosmetics,
  listShopItems,
  purchaseCosmetic,
} from "../../../../lib/arcade/club/shop.server.js";

export default async function handler(req, res) {
  const auth = await requireArcadeStudent(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const view = String(req.query.view || "items");
    if (view === "my") {
      const items = await listOwnedCosmetics(auth.supabase, auth.studentId);
      return res.status(200).json({ ok: true, items });
    }
    const items = await listShopItems(auth.supabase);
    return res.status(200).json({ ok: true, items });
  }

  if (req.method === "POST") {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const action = String(body.action || "purchase").trim();

    if (action === "purchase") {
      const result = await purchaseCosmetic(auth.supabase, auth.studentId, String(body.itemId || ""));
      if (!result.ok) return res.status(result.status || 400).json(result);
      return res.status(200).json(result);
    }

    if (action === "equip") {
      const result = await equipCosmetic(auth.supabase, auth.studentId, String(body.itemId || ""));
      if (!result.ok) return res.status(400).json(result);
      return res.status(200).json(result);
    }

    return res.status(400).json({ ok: false, error: "פעולה לא תקינה", code: "bad_request" });
  }

  return res.status(405).json({ ok: false, error: "Method not allowed" });
}
