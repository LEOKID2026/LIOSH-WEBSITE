/** Shared catalog — backgrounds, animations, text styles (client + server safe). */

export const VB_BACKGROUND_IDS = [
  "light",
  "dark",
  "white",
  "black",
  "leo_indigo",
  "leo_purple",
  "leo_blue",
  "leo_teal",
  "leo_green",
  "leo_amber",
  "leo_orange",
  "leo_red",
  "leo_pink",
  "gradient_sunset",
  "gradient_ocean",
  "gradient_aurora",
  "gradient_fire",
  "gradient_night",
  "gradient_candy",
  "gradient_forest",
  "gradient_royal",
  "colorful",
];

export const VB_ANIMATION_IDS = [
  "none",
  "fade",
  "zoom",
  "slide_up",
  "slide_down",
  "slide_left",
  "slide_right",
  "blur_in",
  "scale_pop",
  "pulse",
  "ken_burns",
];

export const VB_TEXT_SIZE_IDS = ["sm", "md", "lg", "xl"];
export const VB_TEXT_ALIGN_IDS = ["center", "right", "left"];
export const VB_TEXT_SHADOW_IDS = ["none", "soft", "strong"];
export const VB_MEDIA_OVERLAY_IDS = ["none", "dim", "dark", "light"];
export const VB_TRANSITION_IDS = ["none", "crossfade", "fade_black", "slide_left", "wipe_right"];
export const VB_TEXT_BG_IDS = ["none", "soft", "solid", "pill"];
export const VB_FONT_IDS = ["arial", "segoe", "david", "gisha"];
export const VB_MEDIA_POSITION_IDS = ["center", "top", "bottom"];
export const VB_MEDIA_SCALE_IDS = ["sm", "md", "lg"];
export const VB_MEDIA_FIT_IDS = ["contain", "cover"];
export const VB_WATERMARK_POSITION_IDS = ["top_right", "top_left", "bottom_right", "bottom_left"];
export const VB_EXPORT_QUALITY_IDS = ["720p", "1080p"];

export const VB_ASPECT_RATIO_IDS = ["16:9", "9:16", "1:1", "4:5", "4:3"];

/** @type {Record<string, { label: string, w: number, h: number, previewClass: string, safeZone?: boolean }>} */
export const VB_ASPECT_RATIOS = {
  "16:9": { label: "16:9 - רחב", w: 16, h: 9, previewClass: "aspect-video" },
  "9:16": { label: "9:16 - סטורי", w: 9, h: 16, previewClass: "aspect-[9/16]", safeZone: true },
  "1:1": { label: "1:1 - ריבוע", w: 1, h: 1, previewClass: "aspect-square" },
  "4:5": { label: "4:5 - פיד", w: 4, h: 5, previewClass: "aspect-[4/5]", safeZone: true },
  "4:3": { label: "4:3 - קלאסי", w: 4, h: 3, previewClass: "aspect-[4/3]" },
};

export const VB_MEDIA_SCALE_FACTOR = { sm: 0.45, md: 0.65, lg: 0.85 };
export const VB_MEDIA_POSITION_Y = { center: "-80", top: "-200", bottom: "40" };
/** ffmpeg crop Y expr for cover mode */
export const VB_MEDIA_CROP_Y = { center: "(ih-oh)/2", top: "0", bottom: "(ih-oh)" };

/** @type {Record<string, { label: string }>} */
export const VB_MEDIA_FITS = {
  contain: { label: "מותאם - עם רקע" },
  cover: { label: "מילוי מסך - ללא רקע" },
};

/** @type {Record<string, { label: string, xfade?: string, duration: number }>} */
export const VB_TRANSITIONS = {
  none: { label: "ללא", duration: 0 },
  crossfade: { label: "Crossfade", xfade: "fade", duration: 0.5 },
  fade_black: { label: "Fade לשחור", xfade: "fadeblack", duration: 0.6 },
  slide_left: { label: "Slide שמאלה", xfade: "slideleft", duration: 0.5 },
  wipe_right: { label: "Wipe ימינה", xfade: "wiperight", duration: 0.5 },
};

/** @type {Record<string, { label: string, previewClass?: string, ffmpegBox?: string }>} */
export const VB_TEXT_BACKGROUNDS = {
  none: { label: "ללא" },
  soft: { label: "רקע רך", previewClass: "vb-text-bg-soft", ffmpegBox: "black@0.35" },
  solid: { label: "רקע מלא", previewClass: "vb-text-bg-solid", ffmpegBox: "black@0.65" },
  pill: { label: "Pill", previewClass: "vb-text-bg-pill", ffmpegBox: "black@0.5" },
};

/** @type {Record<string, { label: string, winPath: string }>} */
export const VB_FONTS = {
  arial: { label: "Arial", winPath: "C:/Windows/Fonts/arial.ttf" },
  segoe: { label: "Segoe UI", winPath: "C:/Windows/Fonts/segouib.ttf" },
  david: { label: "David", winPath: "C:/Windows/Fonts/davidbd.ttf" },
  gisha: { label: "Gisha", winPath: "C:/Windows/Fonts/gishabd.ttf" },
};

export const VB_WATERMARK_POSITIONS = {
  top_right: { label: "ימין למעלה", overlay: "W-w-40:40" },
  top_left: { label: "שמאל למעלה", overlay: "40:40" },
  bottom_right: { label: "ימין למטה", overlay: "W-w-40:H-h-40" },
  bottom_left: { label: "שמאל למטה", overlay: "40:H-h-40" },
};

export const VB_EXPORT_QUALITIES = {
  "720p": { label: "720p (מהיר)", scale: 720 },
  "1080p": { label: "1080p (איכות)", scale: 1080 },
};

export const VB_SCENE_TEMPLATES = [
  {
    id: "intro_leo",
    label: "Intro Leo",
    scenes: [
      {
        title: "ברוכים הבאים ל-Leo",
        subtitle: "לומדים עם חיוך",
        durationSec: 4,
        bgType: "gradient_ocean",
        animation: "fade",
        titleSize: "xl",
        textShadow: "strong",
      },
      {
        title: "משחקים · תגמולים · התקדמות",
        subtitle: "הכל במקום אחד",
        durationSec: 4,
        bgType: "leo_indigo",
        animation: "slide_up",
        titleSize: "lg",
      },
      {
        title: "הצטרפו אלינו",
        subtitle: "leo-kids.com",
        durationSec: 3,
        bgType: "gradient_royal",
        animation: "scale_pop",
        titleColor: "#fbbf24",
      },
    ],
  },
  {
    id: "reels_hook",
    label: "Reels Hook 9:16",
    scenes: [
      {
        title: "ידעתם?",
        subtitle: "3 טיפים ללמידה מהנה",
        durationSec: 3,
        bgType: "gradient_fire",
        animation: "scale_pop",
        titleSize: "xl",
        textBg: "pill",
      },
      {
        title: "טיפ #1",
        subtitle: "קצר וממוקד",
        durationSec: 4,
        bgType: "dark",
        animation: "fade",
      },
      {
        title: "עקבו לעוד",
        subtitle: "Leo Kids",
        durationSec: 3,
        bgType: "leo_purple",
        animation: "fade",
        titleColor: "#ffffff",
      },
    ],
  },
  {
    id: "parent_trust",
    label: "הורה - אמון",
    scenes: [
      {
        title: "דוח התקדמות חכם",
        subtitle: "לראות את הילד/ה באמת מתקדם/ת",
        durationSec: 5,
        bgType: "gradient_forest",
        animation: "fade",
        textBg: "soft",
      },
      {
        title: "שקיפות מלאה",
        subtitle: "פעילויות, זמן למידה, המלצות",
        durationSec: 5,
        bgType: "light",
        animation: "slide_up",
        titleColor: "#0f172a",
      },
    ],
  },
];

/** @type {Record<string, { label: string, previewClass?: string, previewStyle?: string, ffmpeg: { type: 'color' | 'gradient', color?: string, c0?: string, c1?: string }, defaultTitleColor: string, defaultSubtitleColor: string }>} */
export const VB_BACKGROUNDS = {
  light: {
    label: "בהיר",
    previewClass: "bg-[#f5f5f5] text-gray-900",
    ffmpeg: { type: "color", color: "0xf5f5f5" },
    defaultTitleColor: "#1e293b",
    defaultSubtitleColor: "#475569",
  },
  dark: {
    label: "כהה",
    previewClass: "bg-[#1e1e2e] text-white",
    ffmpeg: { type: "color", color: "0x1e1e2e" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#e2e8f0",
  },
  white: {
    label: "לבן נקי",
    previewClass: "bg-white text-gray-900",
    ffmpeg: { type: "color", color: "0xffffff" },
    defaultTitleColor: "#0f172a",
    defaultSubtitleColor: "#334155",
  },
  black: {
    label: "שחור",
    previewClass: "bg-black text-white",
    ffmpeg: { type: "color", color: "0x000000" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#cbd5e1",
  },
  leo_indigo: {
    label: "Leo - אינדיגו",
    previewClass: "bg-indigo-600 text-white",
    ffmpeg: { type: "color", color: "0x4f46e5" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#e0e7ff",
  },
  leo_purple: {
    label: "Leo - סגול",
    previewClass: "bg-purple-600 text-white",
    ffmpeg: { type: "color", color: "0x9333ea" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#f3e8ff",
  },
  leo_blue: {
    label: "Leo - כחול",
    previewClass: "bg-blue-600 text-white",
    ffmpeg: { type: "color", color: "0x2563eb" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#dbeafe",
  },
  leo_teal: {
    label: "Leo - טורקיז",
    previewClass: "bg-teal-600 text-white",
    ffmpeg: { type: "color", color: "0x0d9488" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#ccfbf1",
  },
  leo_green: {
    label: "Leo - ירוק",
    previewClass: "bg-emerald-600 text-white",
    ffmpeg: { type: "color", color: "0x059669" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#d1fae5",
  },
  leo_amber: {
    label: "Leo - ענבר",
    previewClass: "bg-amber-500 text-gray-900",
    ffmpeg: { type: "color", color: "0xf59e0b" },
    defaultTitleColor: "#1c1917",
    defaultSubtitleColor: "#44403c",
  },
  leo_orange: {
    label: "Leo - כתום",
    previewClass: "bg-orange-500 text-white",
    ffmpeg: { type: "color", color: "0xf97316" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#ffedd5",
  },
  leo_red: {
    label: "Leo - אדום",
    previewClass: "bg-red-600 text-white",
    ffmpeg: { type: "color", color: "0xdc2626" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#fee2e2",
  },
  leo_pink: {
    label: "Leo - ורוד",
    previewClass: "bg-pink-500 text-white",
    ffmpeg: { type: "color", color: "0xec4899" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#fce7f3",
  },
  gradient_sunset: {
    label: "גרדיאנט - שקיעה",
    previewStyle: "linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)",
    previewClass: "text-white",
    ffmpeg: { type: "gradient", c0: "0xff6b6b", c1: "0xfeca57" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#fff7ed",
  },
  gradient_ocean: {
    label: "גרדיאנט - אוקיינוס",
    previewStyle: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    previewClass: "text-white",
    ffmpeg: { type: "gradient", c0: "0x667eea", c1: "0x764ba2" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#e0e7ff",
  },
  gradient_aurora: {
    label: "גרדיאנט - אורורה",
    previewStyle: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    previewClass: "text-white",
    ffmpeg: { type: "gradient", c0: "0xa18cd1", c1: "0xfbc2eb" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#fdf4ff",
  },
  gradient_fire: {
    label: "גרדיאנט - אש",
    previewStyle: "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
    previewClass: "text-white",
    ffmpeg: { type: "gradient", c0: "0xf12711", c1: "0xf5af19" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#fff7ed",
  },
  gradient_night: {
    label: "גרדיאנט - לילה",
    previewStyle: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
    previewClass: "text-white",
    ffmpeg: { type: "gradient", c0: "0x0f0c29", c1: "0x302b63" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#c7d2fe",
  },
  gradient_candy: {
    label: "גרדיאנט - ממתקים",
    previewStyle: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)",
    previewClass: "text-gray-900",
    ffmpeg: { type: "gradient", c0: "0xff9a9e", c1: "0xfecfef" },
    defaultTitleColor: "#831843",
    defaultSubtitleColor: "#9d174d",
  },
  gradient_forest: {
    label: "גרדיאנט - יער",
    previewStyle: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
    previewClass: "text-white",
    ffmpeg: { type: "gradient", c0: "0x134e5e", c1: "0x71b280" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#ecfdf5",
  },
  gradient_royal: {
    label: "גרדיאנט - מלכותי",
    previewStyle: "linear-gradient(135deg, #141e30 0%, #243b55 100%)",
    previewClass: "text-white",
    ffmpeg: { type: "gradient", c0: "0x141e30", c1: "0x243b55" },
    defaultTitleColor: "#fbbf24",
    defaultSubtitleColor: "#fde68a",
  },
  colorful: {
    label: "צבעוני",
    previewClass: "bg-indigo-500 text-white",
    ffmpeg: { type: "color", color: "0x6366f1" },
    defaultTitleColor: "#ffffff",
    defaultSubtitleColor: "#e0e7ff",
  },
};

/** @type {Record<string, { label: string, previewClass: string, exportKind: string }>} */
export const VB_ANIMATIONS = {
  none: { label: "ללא", previewClass: "", exportKind: "none" },
  fade: { label: "Fade - הופעה", previewClass: "animate-vb-fade-in", exportKind: "fade" },
  zoom: { label: "Zoom - זום קל", previewClass: "animate-vb-zoom-in", exportKind: "zoom" },
  slide_up: { label: "Slide - מלמטה", previewClass: "animate-vb-slide-up", exportKind: "fade" },
  slide_down: { label: "Slide - מלמעלה", previewClass: "animate-vb-slide-down", exportKind: "fade" },
  slide_left: { label: "Slide - מימין", previewClass: "animate-vb-slide-right", exportKind: "fade" },
  slide_right: { label: "Slide - משמאל", previewClass: "animate-vb-slide-left", exportKind: "fade" },
  blur_in: { label: "Blur - טשטוש", previewClass: "animate-vb-blur-in", exportKind: "fade" },
  scale_pop: { label: "Pop - קפיצה", previewClass: "animate-vb-scale-pop", exportKind: "scale_pop" },
  pulse: { label: "Pulse - פעימה", previewClass: "animate-vb-pulse", exportKind: "fade" },
  ken_burns: { label: "Ken Burns - תנועה", previewClass: "animate-vb-ken-burns", exportKind: "ken_burns" },
};

export const VB_TEXT_SIZES = {
  sm: { label: "קטן", titlePx: 40, subtitlePx: 26, previewTitle: "text-base sm:text-lg", previewSubtitle: "text-xs sm:text-sm" },
  md: { label: "בינוני", titlePx: 56, subtitlePx: 36, previewTitle: "text-lg sm:text-2xl", previewSubtitle: "text-sm sm:text-base" },
  lg: { label: "גדול", titlePx: 72, subtitlePx: 48, previewTitle: "text-xl sm:text-3xl", previewSubtitle: "text-base sm:text-lg" },
  xl: { label: "ענק", titlePx: 96, subtitlePx: 56, previewTitle: "text-2xl sm:text-4xl", previewSubtitle: "text-lg sm:text-xl" },
};

export const VB_TEXT_SHADOWS = {
  none: { label: "ללא", previewClass: "", borderw: 0, borderAlpha: 0 },
  soft: { label: "רך", previewClass: "drop-shadow-md", borderw: 2, borderAlpha: 0.35 },
  strong: { label: "חזק", previewClass: "drop-shadow-lg", borderw: 3, borderAlpha: 0.55 },
};

export const VB_MEDIA_OVERLAYS = {
  none: { label: "ללא", previewClass: "", ffmpegBox: null },
  dim: { label: "הכהיה קלה", previewClass: "vb-overlay-dim", ffmpegBox: "black@0.3" },
  dark: { label: "הכהיה חזקה", previewClass: "vb-overlay-dark", ffmpegBox: "black@0.55" },
  light: { label: "הבהרה", previewClass: "vb-overlay-light", ffmpegBox: "white@0.25" },
};

export const VB_TEXT_COLOR_PRESETS = [
  { id: "white", label: "לבן", hex: "#ffffff" },
  { id: "black", label: "שחור", hex: "#000000" },
  { id: "gold", label: "זהב", hex: "#fbbf24" },
  { id: "amber", label: "ענבר", hex: "#f59e0b" },
  { id: "red", label: "אדום", hex: "#ef4444" },
  { id: "pink", label: "ורוד", hex: "#ec4899" },
  { id: "purple", label: "סגול", hex: "#a855f7" },
  { id: "blue", label: "כחול", hex: "#3b82f6" },
  { id: "teal", label: "טורקיז", hex: "#14b8a6" },
  { id: "green", label: "ירוק", hex: "#22c55e" },
  { id: "slate", label: "אפור כהה", hex: "#334155" },
  { id: "cream", label: "קרם", hex: "#fef3c7" },
];

export function isValidHexColor(raw) {
  return /^#[0-9a-fA-F]{6}$/.test(String(raw || "").trim());
}

/** @param {Record<string, unknown>} scene */
export function normalizeSceneStyle(scene) {
  const bgKey = VB_BACKGROUND_IDS.includes(String(scene.bgType)) ? String(scene.bgType) : "light";
  const bg = VB_BACKGROUNDS[bgKey] || VB_BACKGROUNDS.light;
  const animKey = VB_ANIMATION_IDS.includes(String(scene.animation)) ? String(scene.animation) : "none";
  const titleSize = VB_TEXT_SIZE_IDS.includes(String(scene.titleSize)) ? String(scene.titleSize) : "md";
  const subtitleSize = VB_TEXT_SIZE_IDS.includes(String(scene.subtitleSize)) ? String(scene.subtitleSize) : "md";
  const textAlign = VB_TEXT_ALIGN_IDS.includes(String(scene.textAlign)) ? String(scene.textAlign) : "center";
  const textShadow = VB_TEXT_SHADOW_IDS.includes(String(scene.textShadow)) ? String(scene.textShadow) : "soft";
  const mediaOverlay = VB_MEDIA_OVERLAY_IDS.includes(String(scene.mediaOverlay))
    ? String(scene.mediaOverlay)
    : "none";
  const transitionOut = VB_TRANSITION_IDS.includes(String(scene.transitionOut))
    ? String(scene.transitionOut)
    : "none";
  const textBg = VB_TEXT_BG_IDS.includes(String(scene.textBg)) ? String(scene.textBg) : "none";
  const fontFamily = VB_FONT_IDS.includes(String(scene.fontFamily)) ? String(scene.fontFamily) : "segoe";
  const mediaPosition = VB_MEDIA_POSITION_IDS.includes(String(scene.mediaPosition))
    ? String(scene.mediaPosition)
    : "center";
  const mediaScale = VB_MEDIA_SCALE_IDS.includes(String(scene.mediaScale)) ? String(scene.mediaScale) : "md";
  const mediaFit = VB_MEDIA_FIT_IDS.includes(String(scene.mediaFit)) ? String(scene.mediaFit) : "contain";

  const titleColor = isValidHexColor(scene.titleColor) ? String(scene.titleColor) : bg.defaultTitleColor;
  const subtitleColor = isValidHexColor(scene.subtitleColor)
    ? String(scene.subtitleColor)
    : bg.defaultSubtitleColor;

  return {
    ...scene,
    bgType: bgKey,
    animation: animKey,
    titleSize,
    subtitleSize,
    textAlign,
    textShadow,
    mediaOverlay,
    transitionOut,
    textBg,
    fontFamily,
    mediaPosition,
    mediaScale,
    mediaFit,
    titleBold: Boolean(scene.titleBold),
    titleColor,
    subtitleColor,
  };
}

/** @param {Record<string, unknown>} project */
export function normalizeProjectSettings(project) {
  return {
    voiceoverVolume: clampPct(project.voiceoverVolume, 100),
    backgroundMusicVolume: clampPct(project.backgroundMusicVolume, 35),
    exportQuality: VB_EXPORT_QUALITY_IDS.includes(String(project.exportQuality))
      ? String(project.exportQuality)
      : "1080p",
    defaultTransition: VB_TRANSITION_IDS.includes(String(project.defaultTransition))
      ? String(project.defaultTransition)
      : "crossfade",
    watermarkPosition: VB_WATERMARK_POSITION_IDS.includes(String(project.watermarkPosition))
      ? String(project.watermarkPosition)
      : "top_right",
    watermarkAssetId: project.watermarkAssetId ?? null,
    backgroundMusicAssetId: project.backgroundMusicAssetId ?? null,
    voiceoverAssetId: project.voiceoverAssetId ?? null,
  };
}

function clampPct(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function getExportDimensions(aspectRatio, exportQuality) {
  const q = VB_EXPORT_QUALITIES[exportQuality] || VB_EXPORT_QUALITIES["1080p"];
  const base = q.scale;
  const meta = VB_ASPECT_RATIOS[aspectRatio] || VB_ASPECT_RATIOS["16:9"];
  const { w, h } = meta;
  if (w >= h) {
    return { width: Math.round((base * w) / h), height: base };
  }
  return { width: base, height: Math.round((base * h) / w) };
}

export function getAspectRatioPreviewClass(aspectRatio) {
  return VB_ASPECT_RATIOS[aspectRatio]?.previewClass || VB_ASPECT_RATIOS["16:9"].previewClass;
}

export function aspectRatioHasSafeZone(aspectRatio) {
  return Boolean(VB_ASPECT_RATIOS[aspectRatio]?.safeZone);
}

export function getMediaObjectPositionClass(mediaPosition) {
  if (mediaPosition === "top") return "object-top";
  if (mediaPosition === "bottom") return "object-bottom";
  return "object-center";
}

export function getBackgroundPreviewStyle(bgType) {
  const bg = VB_BACKGROUNDS[bgType] || VB_BACKGROUNDS.light;
  if (bg.previewStyle) return { background: bg.previewStyle };
  return undefined;
}

export function getBackgroundPreviewClass(bgType) {
  const bg = VB_BACKGROUNDS[bgType] || VB_BACKGROUNDS.light;
  return bg.previewClass || VB_BACKGROUNDS.light.previewClass;
}

export function getAnimationPreviewClass(animation, active) {
  if (!active) return "";
  return VB_ANIMATIONS[animation]?.previewClass || "";
}

export function hexToFfmpegColor(hex) {
  const h = String(hex || "#ffffff").replace("#", "").slice(0, 6);
  return `0x${h}`;
}

export function buildFfmpegBackgroundInput(bgType, width, height, duration) {
  const bg = VB_BACKGROUNDS[bgType] || VB_BACKGROUNDS.light;
  const ff = bg.ffmpeg;
  if (ff.type === "gradient") {
    return [
      "-f",
      "lavfi",
      "-i",
      `gradients=s=${width}x${height}:c0=${ff.c0}:c1=${ff.c1}:duration=${duration}`,
    ];
  }
  return ["-f", "lavfi", "-i", `color=c=${ff.color}:s=${width}x${height}:d=${duration}`];
}

export function defaultSceneFields() {
  return {
    title: "כותרת חדשה",
    subtitle: "טקסט משנה",
    mediaAssetId: null,
    durationSec: 5,
    bgType: "leo_indigo",
    animation: "fade",
    titleColor: null,
    subtitleColor: null,
    titleSize: "md",
    subtitleSize: "md",
    textAlign: "center",
    textShadow: "soft",
    mediaOverlay: "none",
    transitionOut: "none",
    textBg: "none",
    fontFamily: "segoe",
    titleBold: true,
    mediaPosition: "center",
    mediaScale: "md",
    mediaFit: "contain",
  };
}

export function defaultProjectFields() {
  return {
    voiceoverAssetId: null,
    backgroundMusicAssetId: null,
    voiceoverVolume: 100,
    backgroundMusicVolume: 35,
    watermarkAssetId: null,
    watermarkPosition: "top_right",
    exportQuality: "1080p",
    defaultTransition: "crossfade",
  };
}

export function pickSceneStyleFields(scene) {
  const keys = [
    "bgType",
    "animation",
    "titleColor",
    "subtitleColor",
    "titleSize",
    "subtitleSize",
    "textAlign",
    "textShadow",
    "mediaOverlay",
    "transitionOut",
    "textBg",
    "fontFamily",
    "titleBold",
    "mediaPosition",
    "mediaScale",
    "mediaFit",
  ];
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of keys) {
    if (scene[k] !== undefined) out[k] = scene[k];
  }
  return out;
}

export function ffmpegTextXExpr(textAlign) {
  if (textAlign === "right") return "w-text_w-80";
  if (textAlign === "left") return "80";
  return "(w-text_w)/2";
}
