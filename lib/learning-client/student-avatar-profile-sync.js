import { patchStudentLearningProfile } from "./studentLearningProfileClient.js";
import {
  readProfileBackgroundFromLocalStorage,
  resolveProfileBackgroundKey,
  writeProfileBackgroundToLocalStorage,
} from "../student-ui/profile-background.client.js";

const DEFAULT_MAX_SIDE = 360;
const DEFAULT_QUALITY = 0.82;
/** Keep under server / PATCH limits after base64 inflation */
const DEFAULT_MAX_DATA_URL_CHARS = 200_000;

/**
 * Resize + JPEG compress in the browser. Used before persisting avatar to learning profile.
 * @param {File} file
 * @param {{ maxSide?: number, quality?: number, maxDataUrlChars?: number }} [opts]
 * @returns {Promise<string>}
 */
export function compressImageFileToJpegDataUrl(file, opts = {}) {
  const maxSide = opts.maxSide ?? DEFAULT_MAX_SIDE;
  const quality = opts.quality ?? DEFAULT_QUALITY;
  const maxChars = opts.maxDataUrlChars ?? DEFAULT_MAX_DATA_URL_CHARS;

  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof Image === "undefined") {
      reject(new Error("compressImageFileToJpegDataUrl requires a browser"));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      try {
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;
        if (!w || !h) {
          reject(new Error("Invalid image dimensions"));
          return;
        }
        const scale = Math.min(1, maxSide / Math.max(w, h));
        w = Math.max(1, Math.round(w * scale));
        h = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unsupported"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        let q = quality;
        let dataUrl = canvas.toDataURL("image/jpeg", q);
        while (dataUrl.length > maxChars && q > 0.38) {
          q -= 0.06;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        if (dataUrl.length > maxChars) {
          reject(new Error("Image too large after compression; try a smaller photo"));
          return;
        }
        resolve(dataUrl);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to read image"));
    };
    img.src = url;
  });
}

/**
 * Persist a data URL avatar to the server learning profile (cross-device).
 * @param {string} dataUrl
 * @returns {Promise<void>}
 */
export async function patchLearningProfileAvatarCustomImage(dataUrl) {
  await patchStudentLearningProfile({
    profile: {
      avatarCustomDataUrl: dataUrl,
      avatarEmoji: undefined,
    },
  });
}

/**
 * Remove custom image from server profile; optional emoji to set.
 * @param {string} [nextEmoji]
 * @returns {Promise<void>}
 */
export async function patchLearningProfileClearAvatarCustom(nextEmoji = "👤") {
  await patchStudentLearningProfile({
    profile: {
      avatarCustomDataUrl: null,
      avatarEmoji: nextEmoji ? String(nextEmoji).trim().slice(0, 8) : undefined,
    },
  });
}

/**
 * Persist profile circle background key to server learning profile.
 * @param {string} backgroundKey
 * @returns {Promise<void>}
 */
export async function patchLearningProfileAvatarBackground(backgroundKey) {
  await patchStudentLearningProfile({
    profile: {
      avatarBackgroundKey: resolveProfileBackgroundKey(backgroundKey),
    },
  });
}

/**
 * @param {string} backgroundKey
 * @param {(key: string) => void} setPlayerAvatarBackground
 */
export async function selectProfileBackgroundKey(backgroundKey, setPlayerAvatarBackground) {
  const key = resolveProfileBackgroundKey(backgroundKey);
  setPlayerAvatarBackground(key);
  writeProfileBackgroundToLocalStorage(key);
  await patchLearningProfileAvatarBackground(key);
}

/**
 * Sync React state + legacy localStorage keys from `row.profile` after GET learning-profile / cache hydrate.
 * Server custom image wins over local emoji; server emoji wins when no custom.
 *
 * @param {unknown} rowProfile
 * @param {(emoji: string) => void} setPlayerAvatar
 * @param {(url: string | null) => void} setPlayerAvatarImage
 * @param {(key: string) => void} [setPlayerAvatarBackground]
 */
export function applyLearningProfileAvatarRowToPlayerState(
  rowProfile,
  setPlayerAvatar,
  setPlayerAvatarImage,
  setPlayerAvatarBackground,
) {
  const prof =
    rowProfile && typeof rowProfile === "object" && !Array.isArray(rowProfile) ? /** @type {Record<string, unknown>} */ (rowProfile) : {};

  if (setPlayerAvatarBackground) {
    const serverBg =
      prof.avatarBackgroundKey != null && String(prof.avatarBackgroundKey).trim() !== ""
        ? resolveProfileBackgroundKey(prof.avatarBackgroundKey)
        : null;
    const bg = serverBg || readProfileBackgroundFromLocalStorage();
    setPlayerAvatarBackground(bg);
    writeProfileBackgroundToLocalStorage(bg);
  }

  const custom = prof.avatarCustomDataUrl;
  if (typeof custom === "string" && custom.trim().startsWith("data:image/")) {
    const url = custom.trim();
    if (url.length > 260_000) return;
    setPlayerAvatarImage(url);
    setPlayerAvatar("👤");
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("mleo_player_avatar_image", url);
        localStorage.removeItem("mleo_player_avatar");
      } catch {
        /* quota */
      }
    }
    return;
  }

  const emoji = prof.avatarEmoji;
  if (typeof emoji === "string" && emoji.trim()) {
    setPlayerAvatarImage(null);
    setPlayerAvatar(emoji.trim().slice(0, 8));
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("mleo_player_avatar_image");
        localStorage.setItem("mleo_player_avatar", emoji.trim().slice(0, 8));
      } catch {
        /* ignore */
      }
    }
  }
}
