import { useCallback, useEffect, useRef, useState } from "react";
import { patchStudentLearningProfile } from "../../lib/learning-client/studentLearningProfileClient";
import {
  compressImageFileToJpegDataUrl,
  patchLearningProfileAvatarCustomImage,
  patchLearningProfileClearAvatarCustom,
  patchLearningProfileAvatarBackground,
} from "../../lib/learning-client/student-avatar-profile-sync";
import StudentLearningAvatar from "../arcade/club/StudentLearningAvatar.jsx";
import ProfileBackgroundPickerGrid from "./ProfileBackgroundPickerGrid.jsx";
import {
  readProfileBackgroundFromLocalStorage,
  resolveProfileBackgroundKey,
  writeProfileBackgroundToLocalStorage,
} from "../../lib/student-ui/profile-background.client.js";

/** Same palette as learning master pages (math / hebrew / …). */
export const STUDENT_AVATAR_EMOJI_OPTIONS = [
  "👤",
  "🧑",
  "👦",
  "👧",
  "🦁",
  "🐱",
  "🐶",
  "🐰",
  "🐻",
  "🐼",
  "🦊",
  "🐸",
  "🦄",
  "🌟",
  "🎮",
  "🏆",
  "⭐",
  "💫",
];

/**
 * Avatar picker overlay aligned with game pages: emoji grid + optional custom image (synced to learning profile).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.playerName]
 * @param {string | null | undefined} props.serverAvatarEmoji from learning profile (e.g. home-profile `profile.avatarEmoji`)
 * @param {string | null | undefined} [props.serverAvatarBackgroundKey] from learning profile
 * @param {(emoji: string | null) => void} [props.onAvatarEmojiPersisted] parent may merge into dashboard payload
 * @param {(url: string | null) => void} [props.onAvatarCustomDataUrlPersisted] parent merges `profile.avatarCustomDataUrl`
 * @param {(key: string) => void} [props.onAvatarBackgroundPersisted]
 * @param {() => void} [props.onAvatarChanged] called after any local avatar change (e.g. refresh hero from localStorage)
 */
export default function StudentAvatarPickerModal({
  open,
  onClose,
  playerName = "",
  serverAvatarEmoji = null,
  serverAvatarBackgroundKey = null,
  onAvatarEmojiPersisted,
  onAvatarCustomDataUrlPersisted,
  onAvatarBackgroundPersisted,
  onAvatarChanged,
}) {
  const fileInputRef = useRef(null);
  const [playerAvatar, setPlayerAvatar] = useState("👤");
  const [playerAvatarImage, setPlayerAvatarImage] = useState(null);
  const [playerAvatarBackground, setPlayerAvatarBackground] = useState("sky");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const syncFromBrowser = useCallback(() => {
    if (typeof window === "undefined") return;
    const savedImage = localStorage.getItem("mleo_player_avatar_image");
    const savedEmoji = localStorage.getItem("mleo_player_avatar");
    const server =
      serverAvatarEmoji != null && String(serverAvatarEmoji).trim() !== ""
        ? String(serverAvatarEmoji).trim().slice(0, 8)
        : "";

    if (savedImage) {
      setPlayerAvatarImage(savedImage);
      setPlayerAvatar("👤");
      return;
    }
    setPlayerAvatarImage(null);
    if (savedEmoji && String(savedEmoji).trim()) {
      setPlayerAvatar(String(savedEmoji).trim().slice(0, 8));
      return;
    }
    setPlayerAvatar(server || "👤");

    const serverBg =
      serverAvatarBackgroundKey != null && String(serverAvatarBackgroundKey).trim() !== ""
        ? resolveProfileBackgroundKey(serverAvatarBackgroundKey)
        : null;
    setPlayerAvatarBackground(serverBg || readProfileBackgroundFromLocalStorage());
  }, [serverAvatarEmoji, serverAvatarBackgroundKey]);

  useEffect(() => {
    if (!open) return;
    setSaveError("");
    syncFromBrowser();
  }, [open, syncFromBrowser]);

  const persistEmojiToServer = useCallback(
    async (emoji) => {
      setSaving(true);
      setSaveError("");
      try {
        const em = emoji && String(emoji).trim() ? String(emoji).trim().slice(0, 8) : "👤";
        await patchStudentLearningProfile({
          profile: {
            avatarEmoji: em,
            avatarCustomDataUrl: null,
          },
        });
        onAvatarEmojiPersisted?.(em);
        onAvatarCustomDataUrlPersisted?.(null);
      } catch (e) {
        setSaveError(e && typeof e === "object" && "message" in e ? String(e.message) : "שמירה נכשלה");
      } finally {
        setSaving(false);
      }
    },
    [onAvatarEmojiPersisted, onAvatarCustomDataUrlPersisted],
  );

  const handleAvatarImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      window.alert("התמונה גדולה מדי. נא לבחור תמונה עד 5MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      window.alert("נא לבחור קובץ תמונה בלבד");
      return;
    }
    void (async () => {
      setSaving(true);
      setSaveError("");
      try {
        const dataUrl = await compressImageFileToJpegDataUrl(file);
        setPlayerAvatarImage(dataUrl);
        setPlayerAvatar("👤");
        if (typeof window !== "undefined") {
          localStorage.setItem("mleo_player_avatar_image", dataUrl);
          localStorage.removeItem("mleo_player_avatar");
        }
        onAvatarChanged?.();
        await patchLearningProfileAvatarCustomImage(dataUrl);
        onAvatarCustomDataUrlPersisted?.(dataUrl);
      } catch (err) {
        setSaveError(err && typeof err === "object" && "message" in err ? String(err.message) : "שמירת התמונה נכשלה");
      } finally {
        setSaving(false);
      }
    })();
    e.target.value = "";
  };

  const handleRemoveAvatarImage = () => {
    void (async () => {
      setSaving(true);
      setSaveError("");
      try {
        const defaultAvatar = "👤";
        setPlayerAvatarImage(null);
        setPlayerAvatar(defaultAvatar);
        if (typeof window !== "undefined") {
          localStorage.removeItem("mleo_player_avatar_image");
          localStorage.setItem("mleo_player_avatar", defaultAvatar);
        }
        onAvatarChanged?.();
        await patchLearningProfileClearAvatarCustom(defaultAvatar);
        onAvatarCustomDataUrlPersisted?.(null);
        onAvatarEmojiPersisted?.(defaultAvatar);
      } catch (e) {
        setSaveError(e && typeof e === "object" && "message" in e ? String(e.message) : "שמירה נכשלה");
      } finally {
        setSaving(false);
      }
    })();
  };

  const selectEmoji = (avatar) => {
    setPlayerAvatar(avatar);
    setPlayerAvatarImage(null);
    if (typeof window !== "undefined") {
      localStorage.setItem("mleo_player_avatar", avatar);
      localStorage.removeItem("mleo_player_avatar_image");
    }
    onAvatarChanged?.();
    void persistEmojiToServer(avatar);
  };

  const selectBackground = (backgroundKey) => {
    const key = resolveProfileBackgroundKey(backgroundKey);
    setPlayerAvatarBackground(key);
    writeProfileBackgroundToLocalStorage(key);
    onAvatarChanged?.();
    void (async () => {
      setSaving(true);
      setSaveError("");
      try {
        await patchLearningProfileAvatarBackground(key);
        onAvatarBackgroundPersisted?.(key);
      } catch (e) {
        setSaveError(e && typeof e === "object" && "message" in e ? String(e.message) : "שמירה נכשלה");
      } finally {
        setSaving(false);
      }
    })();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => onClose()}
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-avatar-modal-title"
    >
      <div
        className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-sky-200 bg-white p-6 shadow-xl shadow-slate-300/40"
        onClick={(ev) => ev.stopPropagation()}
        style={{ scrollbarGutter: "stable", scrollbarWidth: "thin" }}
      >
        <button
          type="button"
          onClick={() => onClose()}
          className="absolute left-4 top-4 z-10 text-2xl font-bold text-slate-500 hover:text-slate-800"
          style={{ direction: "ltr" }}
          aria-label="סגור"
        >
          ✖
        </button>

        <h2 id="student-avatar-modal-title" className="mb-4 text-center text-2xl font-extrabold text-slate-800">
          👤 פרופיל שחקן
        </h2>

        <div className="rounded-xl border border-slate-200 bg-sky-50/50 p-3">
          <div className="mb-3 flex items-center gap-3">
            <StudentLearningAvatar
              avatarEmoji={playerAvatar}
              avatarCustomDataUrl={playerAvatarImage || ""}
              avatarBackgroundKey={playerAvatarBackground}
              sizeClass="h-16 w-16 text-5xl"
            />
            <div className="min-w-0 flex-1 text-right">
              <div className="mb-1 text-xs text-slate-500">שם שחקן</div>
              <div className="truncate text-lg font-bold text-slate-800">{playerName || "שחקן"}</div>
            </div>
          </div>

          <div className="text-xs text-slate-500 mb-2">בחר אווטר:</div>

          <div className="mb-3">
            <label className="block w-full cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarImageUpload}
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-sky-600 min-h-10"
                >
                  📷 בחר תמונה
                </button>
                {playerAvatarImage ? (
                  <button
                    type="button"
                    onClick={() => void handleRemoveAvatarImage()}
                    disabled={saving}
                    className="rounded-lg bg-rose-500 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-rose-600 disabled:opacity-50 min-h-10"
                  >
                    🗑️ מחק תמונה
                  </button>
                ) : null}
              </div>
            </label>
            {playerAvatarImage ? (
              <div className="mt-2 text-center text-xs text-slate-500">תמונה נבחרה ✓</div>
            ) : null}
          </div>

          <div className="grid grid-cols-6 gap-2">
            {STUDENT_AVATAR_EMOJI_OPTIONS.map((avatar) => (
              <button
                key={avatar}
                type="button"
                disabled={saving}
                onClick={() => selectEmoji(avatar)}
                className={`rounded-lg p-1.5 text-2xl transition-all min-h-10 ${
                  !playerAvatarImage && playerAvatar === avatar
                    ? "scale-110 border-2 border-amber-400 bg-amber-50"
                    : "border border-slate-200 bg-white hover:bg-sky-50"
                } disabled:opacity-50`}
              >
                {avatar}
              </button>
            ))}
          </div>

          <div className="mt-3">
            <ProfileBackgroundPickerGrid
              selectedKey={playerAvatarBackground}
              disabled={saving}
              onSelect={selectBackground}
            />
          </div>

          {saveError ? <p className="mt-3 text-center text-sm text-rose-600">{saveError}</p> : null}
        </div>

        <button
          type="button"
          onClick={() => onClose()}
          className="mt-4 w-full rounded-xl bg-sky-500 py-2.5 text-sm font-bold text-white transition hover:bg-sky-600 min-h-12"
        >
          סגור
        </button>
      </div>
    </div>
  );
}
