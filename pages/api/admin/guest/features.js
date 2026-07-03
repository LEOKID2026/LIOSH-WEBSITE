import {
  requireAdminApiContext,
  sendAdminApiError,
} from "../../../../lib/admin-server/admin-request.server.js";
import {
  GUEST_FEATURE_DEFAULTS,
  GUEST_FEATURE_LABELS_HE,
  loadGuestFeaturePermissionsMap,
  upsertGuestFeaturePermissions,
} from "../../../../lib/guest/guest-feature-permissions.server.js";

export default async function handler(req, res) {
  const ctx = await requireAdminApiContext(res, req.headers.authorization || "");
  if (ctx.stopped) return;

  if (req.method === "GET") {
    try {
      const map = await loadGuestFeaturePermissionsMap(ctx.serviceRole);
      const features = Object.keys(GUEST_FEATURE_DEFAULTS).map((featureKey) => ({
        featureKey,
        labelHe: GUEST_FEATURE_LABELS_HE[featureKey] || featureKey,
        enabledForGuest: map[featureKey] === true,
        defaultEnabled: GUEST_FEATURE_DEFAULTS[featureKey] === true,
      }));
      return res.status(200).json({ ok: true, features });
    } catch (_e) {
      return sendAdminApiError(res, 500, "db_error", "db_error");
    }
  }

  if (req.method === "PUT") {
    try {
      const features = Array.isArray(req.body?.features) ? req.body.features : [];
      const map = await upsertGuestFeaturePermissions(ctx.serviceRole, features);
      const out = Object.keys(GUEST_FEATURE_DEFAULTS).map((featureKey) => ({
        featureKey,
        labelHe: GUEST_FEATURE_LABELS_HE[featureKey] || featureKey,
        enabledForGuest: map[featureKey] === true,
        defaultEnabled: GUEST_FEATURE_DEFAULTS[featureKey] === true,
      }));
      return res.status(200).json({ ok: true, features: out });
    } catch (_e) {
      return sendAdminApiError(res, 500, "db_error", "db_error");
    }
  }

  res.setHeader("Allow", "GET, PUT");
  return sendAdminApiError(res, 405, "method_not_allowed", "Method not allowed");
}
