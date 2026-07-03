import LeoDogSvgVisual from "./LeoDogSvgVisual.jsx";
import LeoDogSpriteVisual from "./LeoDogSpriteVisual.jsx";

/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-state.js').LeoDogMood} LeoDogMood */
/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-state.js').LeoDogAnim} LeoDogAnim */
/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-action-state.js').LeoDogCurrentAction} LeoDogCurrentAction */
/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-assets.js').LeoDogGameVisualMode} LeoDogGameVisualMode */

/**
 * @param {{
 *   gameVisualMode: LeoDogGameVisualMode
 *   anim: LeoDogAnim
 *   currentAction: LeoDogCurrentAction
 *   isSleeping: boolean
 *   mood: LeoDogMood
 *   cleanliness: number
 *   energy: number
 *   onTouchHead: () => void
 *   onTouchNose: () => void
 *   onTouchBelly: () => void
 *   onTouchPaw: () => void
 *   onTouchBody: () => void
 * }} props
 */
export default function LeoDogVisual({ gameVisualMode, ...rest }) {
  if (gameVisualMode === "svg") {
    return <LeoDogSvgVisual {...rest} />;
  }
  return <LeoDogSpriteVisual {...rest} />;
}
