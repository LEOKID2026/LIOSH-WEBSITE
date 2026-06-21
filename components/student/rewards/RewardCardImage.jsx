/**
 * Unified reward card image — CSS clip first; canvas trim only when needed (cached).
 */
import { memo, useEffect, useState } from "react";
import {
  REWARD_CARD_CLIP_CLASS_MODAL,
  REWARD_CARD_CLIP_CLASS_THUMB,
  REWARD_CARD_CLIP_CLASS_TILE,
} from "../../../lib/rewards/reward-card-display.js";
import { resolveRewardCardDisplaySource } from "../../../lib/rewards/reward-card-image-process.client.js";

const PLACEHOLDER = "/rewards/cards/placeholders/regular/default.svg";

/** @type {Record<string, string>} */
const CLIP_BY_SIZE = {
  thumb: REWARD_CARD_CLIP_CLASS_THUMB,
  tile: REWARD_CARD_CLIP_CLASS_TILE,
  modal: REWARD_CARD_CLIP_CLASS_MODAL,
};

/**
 * @param {{
 *   src: string,
 *   alt?: string,
 *   size?: "thumb" | "tile" | "modal",
 *   fit?: "cover" | "contain",
 *   className?: string,
 *   wrapperClassName?: string,
 *   imgClassName?: string,
 *   loading?: "lazy" | "eager",
 *   draggable?: boolean,
 *   children?: import("react").ReactNode,
 * }} props
 */
function RewardCardImage({
  src,
  alt = "",
  size = "tile",
  fit = "cover",
  className = "",
  wrapperClassName = "",
  imgClassName = "",
  loading = "lazy",
  draggable = false,
  children,
}) {
  const [displaySrc, setDisplaySrc] = useState(src || PLACEHOLDER);

  useEffect(() => {
    let alive = true;
    const normalized = src || PLACEHOLDER;
    const priority = size === "modal" || loading === "eager" ? "eager" : "lazy";
    const { immediate, upgrade } = resolveRewardCardDisplaySource(normalized, { priority });

    setDisplaySrc(immediate || PLACEHOLDER);

    if (!upgrade) {
      return () => {
        alive = false;
      };
    }

    void upgrade.then((url) => {
      if (alive && url) setDisplaySrc(url);
    });

    return () => {
      alive = false;
    };
  }, [src, size, loading]);

  const fitClass =
    fit === "contain"
      ? "max-w-full max-h-[80vh] w-auto h-auto object-contain"
      : "w-full h-full object-cover";

  const wrapperFitClass =
    fit === "contain" ? "inline-block max-w-full max-h-[80vh]" : "w-full h-full";

  const clipClass = CLIP_BY_SIZE[size] || REWARD_CARD_CLIP_CLASS_TILE;

  return (
    <div
      className={`relative overflow-hidden bg-transparent ${clipClass} ${wrapperFitClass} ${wrapperClassName} ${className}`.trim()}
    >
      <img
        src={displaySrc || PLACEHOLDER}
        alt={alt}
        className={`block ${fitClass} pointer-events-none select-none ${imgClassName}`.trim()}
        loading={loading}
        draggable={draggable}
        decoding="async"
      />
      {children}
    </div>
  );
}

export default memo(RewardCardImage, (prev, next) =>
  prev.src === next.src &&
  prev.size === next.size &&
  prev.fit === next.fit &&
  prev.loading === next.loading &&
  prev.alt === next.alt &&
  prev.wrapperClassName === next.wrapperClassName &&
  prev.imgClassName === next.imgClassName &&
  prev.className === next.className
);
