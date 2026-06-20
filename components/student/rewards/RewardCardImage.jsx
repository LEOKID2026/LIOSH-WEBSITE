/**
 * Unified reward card image — trim dark borders + rounded clip (no extra frame).
 */
import { useEffect, useState } from "react";
import {
  REWARD_CARD_CLIP_CLASS_MODAL,
  REWARD_CARD_CLIP_CLASS_THUMB,
  REWARD_CARD_CLIP_CLASS_TILE,
} from "../../../lib/rewards/reward-card-display.js";
import { getProcessedRewardCardDisplayUrl } from "../../../lib/rewards/reward-card-image-process.client.js";

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
export default function RewardCardImage({
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
  const [displaySrc, setDisplaySrc] = useState(src);

  useEffect(() => {
    let alive = true;
    setDisplaySrc(src);

    if (!src) return () => {
      alive = false;
    };

    void getProcessedRewardCardDisplayUrl(src).then((url) => {
      if (alive && url) setDisplaySrc(url);
    });

    return () => {
      alive = false;
    };
  }, [src]);

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
        src={displaySrc || "/rewards/cards/placeholders/regular/default.svg"}
        alt={alt}
        className={`block ${fitClass} pointer-events-none select-none ${imgClassName}`.trim()}
        loading={loading}
        draggable={draggable}
      />
      {children}
    </div>
  );
}
