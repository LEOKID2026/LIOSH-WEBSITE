import {
  getAnimationPreviewClass,
  getBackgroundPreviewClass,
  getBackgroundPreviewStyle,
  getAspectRatioPreviewClass,
  aspectRatioHasSafeZone,
  getMediaObjectPositionClass,
  normalizeSceneStyle,
  VB_MEDIA_OVERLAYS,
  VB_TEXT_BACKGROUNDS,
  VB_TEXT_SHADOWS,
  VB_TEXT_SIZES,
  VB_MEDIA_SCALE_FACTOR,
} from "../../../lib/admin-portal/admin-video-builder-catalog.js";

const MEDIA_Y_CLASS = { center: "top-[22%]", top: "top-[10%]", bottom: "top-[38%]" };
const WM_CLASS = {
  top_right: "top-3 left-3",
  top_left: "top-3 right-3",
  bottom_right: "bottom-3 left-3",
  bottom_left: "bottom-3 right-3",
};

/**
 * @param {{ scene: Record<string, unknown>, mediaUrl?: string | null, mediaType?: string, aspectRatio?: string, active?: boolean, watermarkUrl?: string | null, watermarkPosition?: string, showSafeZone?: boolean }} props
 */
export default function AdminVideoScenePreview({
  scene,
  mediaUrl,
  mediaType,
  aspectRatio = "16:9",
  active = true,
  watermarkUrl,
  watermarkPosition = "top_right",
  showSafeZone = false,
}) {
  const styled = normalizeSceneStyle(scene);
  const isCover = styled.mediaFit === "cover" && Boolean(mediaUrl);
  const bgClass = isCover ? "" : getBackgroundPreviewClass(styled.bgType);
  const bgStyle = isCover ? undefined : getBackgroundPreviewStyle(styled.bgType);
  const anim =
    styled.animation === "ken_burns" && active
      ? "animate-vb-ken-burns"
      : getAnimationPreviewClass(styled.animation, active);
  const overlayClass = VB_MEDIA_OVERLAYS[styled.mediaOverlay]?.previewClass || "";
  const textBgClass = VB_TEXT_BACKGROUNDS[styled.textBg]?.previewClass || "";
  const titleSize = VB_TEXT_SIZES[styled.titleSize]?.previewTitle || VB_TEXT_SIZES.md.previewTitle;
  const subtitleSize =
    VB_TEXT_SIZES[styled.subtitleSize]?.previewSubtitle || VB_TEXT_SIZES.md.previewSubtitle;
  const shadowClass = VB_TEXT_SHADOWS[styled.textShadow]?.previewClass || "";
  const alignClass =
    styled.textAlign === "right"
      ? "text-right items-end"
      : styled.textAlign === "left"
        ? "text-left items-start"
        : "text-center items-center";
  const mediaScale = VB_MEDIA_SCALE_FACTOR[styled.mediaScale] || 0.65;
  const mediaMax = `${Math.round(mediaScale * 100)}%`;
  const objectPos = getMediaObjectPositionClass(styled.mediaPosition);

  const ratioClass = getAspectRatioPreviewClass(aspectRatio);

  return (
    <div
      className={`relative w-full ${ratioClass} rounded-lg overflow-hidden border border-white/20 ${bgClass} ${!isCover ? anim : ""} ${overlayClass}`}
      style={bgStyle}
      dir="rtl"
    >
      {showSafeZone && aspectRatioHasSafeZone(aspectRatio) ? (
        <div className="absolute inset-3 border border-dashed border-white/30 pointer-events-none z-20 rounded" />
      ) : null}
      {mediaUrl && mediaType === "image" && isCover ? (
        <img
          src={mediaUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover z-[1] ${objectPos} ${anim}`}
        />
      ) : null}
      {mediaUrl && mediaType === "image" && !isCover ? (
        <img
          src={mediaUrl}
          alt=""
          style={{ maxHeight: mediaMax, maxWidth: mediaMax }}
          className={`absolute inset-x-0 mx-auto object-contain z-[1] ${MEDIA_Y_CLASS[styled.mediaPosition] || MEDIA_Y_CLASS.center}`}
        />
      ) : null}
      {mediaUrl && mediaType === "video" ? (
        <video
          src={mediaUrl}
          className={`absolute inset-0 w-full h-full z-[1] opacity-90 ${
            isCover ? `object-cover ${objectPos}` : "object-contain"
          }`}
          muted
          playsInline
          autoPlay={active}
          loop
        />
      ) : null}
      {watermarkUrl ? (
        <img
          src={watermarkUrl}
          alt=""
          className={`absolute w-12 h-12 object-contain z-20 opacity-90 ${WM_CLASS[watermarkPosition] || WM_CLASS.top_right}`}
        />
      ) : null}
      <div
        className={`absolute inset-x-0 top-[8%] px-4 flex flex-col z-10 ${alignClass} ${textBgClass}`}
        style={{ color: styled.titleColor }}
      >
        {styled.title ? (
          <h3 className={`${titleSize} ${styled.titleBold ? "font-bold" : "font-semibold"} ${shadowClass}`}>
            {styled.title}
          </h3>
        ) : null}
        {styled.subtitle ? (
          <p
            className={`mt-2 ${subtitleSize} opacity-95 ${shadowClass}`}
            style={{ color: styled.subtitleColor }}
          >
            {styled.subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}
