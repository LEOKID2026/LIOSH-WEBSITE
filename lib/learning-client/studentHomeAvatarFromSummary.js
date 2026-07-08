import { resolveProfileBackgroundKey } from "../student-ui/profile-background.client.js";

/**
 * Read avatar fields from GET /api/student/home-profile/summary payload.
 * @param {{ profile?: { avatarEmoji?: string, avatarCustomDataUrl?: string, avatarBackgroundKey?: string } } | null | undefined} homeJson
 */
export function studentAvatarFromHomeSummary(homeJson) {
  const profile = homeJson?.profile;
  if (!profile || typeof profile !== "object") {
    return { avatarEmoji: "👤", avatarCustomDataUrl: "", avatarBackgroundKey: "sky" };
  }

  const avatarEmoji =
    profile.avatarEmoji != null && String(profile.avatarEmoji).trim() !== ""
      ? String(profile.avatarEmoji).trim().slice(0, 8)
      : "👤";

  const rawCustom = profile.avatarCustomDataUrl;
  const avatarCustomDataUrl =
    rawCustom != null && String(rawCustom).trim().startsWith("data:image/")
      ? String(rawCustom).trim()
      : "";

  const avatarBackgroundKey = resolveProfileBackgroundKey(profile.avatarBackgroundKey);

  return { avatarEmoji, avatarCustomDataUrl, avatarBackgroundKey };
}
