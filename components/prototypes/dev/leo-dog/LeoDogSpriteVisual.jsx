import styles from "./LeoDogGame.module.css";

import { LeoDogTouchZones } from "./LeoDogSvgVisual.jsx";

import {
  resolveLeoSprite,
} from "../../../../lib/prototypes/leo-dog/leo-dog-assets.js";



/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-state.js').LeoDogMood} LeoDogMood */

/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-state.js').LeoDogAnim} LeoDogAnim */

/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-action-state.js').LeoDogCurrentAction} LeoDogCurrentAction */



/**

 * @param {{

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

export default function LeoDogSpriteVisual({

  anim,

  currentAction,

  isSleeping,

  mood,

  cleanliness,

  energy,

  onTouchHead,

  onTouchNose,

  onTouchBelly,

  onTouchPaw,

  onTouchBody,

}) {

  const spriteSrc = resolveLeoSprite(mood, currentAction, { cleanliness, energy }, isSleeping);
  const showBubbles = currentAction === "bathing";
  const showZzz = isSleeping || currentAction === "sleeping";



  const displayAnim =

    mood === "missing" && anim === "idle" && currentAction === "idle" ? "missing" : anim;



  return (

    <div

      className={`${styles.dogWrap} ${styles.dogWrapSprite}`}

      data-anim={displayAnim}

      data-mood={mood}

      data-action={currentAction}

      data-render="sprites"

    >

      <div className={styles.spriteStage}>

        <div className={styles.spriteShadow} aria-hidden />

        <img

          key={spriteSrc}

          src={spriteSrc}

          alt="ליאו"

          className={styles.leoSpriteImg}

          draggable={false}

        />
        {showBubbles ? <div className={styles.imageBubbleOverlay} aria-hidden /> : null}

        {showZzz ? <span className={styles.imageZzz} aria-hidden>z z z</span> : null}

      </div>

      <LeoDogTouchZones

        onTouchHead={onTouchHead}

        onTouchNose={onTouchNose}

        onTouchBelly={onTouchBelly}

        onTouchPaw={onTouchPaw}

        onTouchBody={onTouchBody}

      />

    </div>

  );

}


