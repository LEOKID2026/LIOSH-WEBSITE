import {
  VB_BG_PREVIEW_CLASS,
  VB_ANIM_PREVIEW_CLASS,
} from "../../../lib/admin-portal/admin-video-builder-utils.js";

const BG_CLASS = VB_BG_PREVIEW_CLASS;
const ANIM_CLASS = VB_ANIM_PREVIEW_CLASS;

/**
 * @param {{ scene: Record<string, unknown>, mediaUrl?: string | null, mediaType?: string, aspectRatio?: string, active?: boolean }} props
 */
export default function AdminVideoScenePreview({
  scene,
  mediaUrl,
  mediaType,
  aspectRatio = "16:9",
  active = true,
}) {
  const bg = BG_CLASS[scene.bgType] || BG_CLASS.light;
  const anim = active ? ANIM_CLASS[scene.animation] || "" : "";
  const ratioClass =
    aspectRatio === "9:16"
      ? "aspect-[9/16]"
      : aspectRatio === "1:1"
        ? "aspect-square"
        : "aspect-video";

  return (
    <div
      className={`relative w-full ${ratioClass} rounded-lg overflow-hidden border border-white/20 ${bg} ${anim}`}
      dir="rtl"
    >
      {mediaUrl && mediaType === "image" ? (
        <img
          src={mediaUrl}
          alt=""
          className="absolute inset-0 m-auto max-h-[55%] max-w-[70%] object-contain"
        />
      ) : null}
      {mediaUrl && mediaType === "video" ? (
        <video
          src={mediaUrl}
          className="absolute inset-0 w-full h-full object-cover opacity-80"
          muted
          playsInline
          autoPlay={active}
          loop
        />
      ) : null}
      <div className="absolute inset-x-0 top-[8%] px-4 text-center z-10">
        {scene.title ? (
          <h3 className="text-lg sm:text-2xl font-bold drop-shadow-md">{scene.title}</h3>
        ) : null}
        {scene.subtitle ? (
          <p className="mt-2 text-sm sm:text-base opacity-90 drop-shadow">{scene.subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
