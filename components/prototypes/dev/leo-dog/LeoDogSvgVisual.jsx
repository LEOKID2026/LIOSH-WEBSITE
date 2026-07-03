import styles from "./LeoDogGame.module.css";

/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-state.js').LeoDogMood} LeoDogMood */
/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-state.js').LeoDogAnim} LeoDogAnim */

/**
 * @param {{
 *   anim: LeoDogAnim
 *   mood: LeoDogMood
 *   cleanliness: number
 *   onTouchHead: () => void
 *   onTouchNose: () => void
 *   onTouchBelly: () => void
 *   onTouchPaw: () => void
 *   onTouchBody: () => void
 * }} props
 */
export default function LeoDogSvgVisual({
  anim,
  mood,
  cleanliness,
  onTouchHead,
  onTouchNose,
  onTouchBelly,
  onTouchPaw,
  onTouchBody,
}) {
  const dirtLevel = cleanliness >= 55 ? 0 : cleanliness >= 35 ? 1 : cleanliness >= 20 ? 2 : 3;
  const isHappy = mood === "happy" || mood === "superHappy";
  const isTired = mood === "tired" || anim === "sleep";
  const mouthCurve = isHappy
    ? "M 108 92 Q 120 102 132 92"
    : mood === "hungry"
      ? "M 110 96 Q 120 90 130 96"
      : "M 108 94 Q 120 98 132 94";

  return (
    <div className={styles.dogWrap} data-anim={anim} data-mood={mood} data-render="svg">
      <svg viewBox="0 0 240 160" className={styles.dogSvg} aria-label="ליאו הכלב" role="img">
        <ellipse cx="120" cy="148" rx="52" ry="8" fill="rgba(0,0,0,0.15)" />
        <g className={styles.tail}>
          <path
            d="M 48 108 Q 22 88 18 68 Q 16 58 24 52 Q 32 48 38 58 Q 42 68 48 78 Z"
            fill="#e8a855"
            stroke="#c4842f"
            strokeWidth="1.5"
          />
        </g>
        <ellipse cx="88" cy="132" rx="14" ry="10" fill="#f5c16c" />
        <ellipse cx="152" cy="132" rx="14" ry="10" fill="#f5c16c" />
        <ellipse cx="120" cy="108" rx="48" ry="36" fill="#f5c16c" stroke="#d4a055" strokeWidth="2" />
        <ellipse cx="92" cy="128" rx="12" ry="14" fill="#f5c16c" stroke="#d4a055" strokeWidth="1.5" />
        <ellipse cx="148" cy="128" rx="12" ry="14" fill="#f5c16c" stroke="#d4a055" strokeWidth="1.5" />
        <ellipse cx="92" cy="138" rx="10" ry="6" fill="#fff" opacity="0.5" />
        <ellipse cx="148" cy="138" rx="10" ry="6" fill="#fff" opacity="0.5" />
        <circle cx="120" cy="68" r="38" fill="#f5c16c" stroke="#d4a055" strokeWidth="2" />
        <g className={styles.earLeft}>
          <path d="M 88 48 L 78 22 L 98 38 Z" fill="#e8a855" stroke="#c4842f" strokeWidth="1.5" />
        </g>
        <g className={styles.earRight}>
          <path d="M 152 48 L 162 22 L 142 38 Z" fill="#e8a855" stroke="#c4842f" strokeWidth="1.5" />
        </g>
        {mood === "superHappy" ? (
          <>
            <ellipse cx="92" cy="78" rx="8" ry="5" fill="#fca5a5" opacity="0.5" />
            <ellipse cx="148" cy="78" rx="8" ry="5" fill="#fca5a5" opacity="0.5" />
          </>
        ) : null}
        <g className={styles.eyeGroup}>
          <g transform="translate(102, 62)">
            <ellipse cx="0" cy="0" rx="9" ry="10" fill="#fff" stroke="#1e293b" strokeWidth="1.2" />
            <circle className={styles.pupil} cx="1" cy="1" r="4.5" fill="#1e293b" />
            <circle cx="-2" cy="-2" r="1.8" fill="#fff" />
            <rect className={styles.lid} x="-10" y="-11" width="20" height="11" fill="#f5c16c" rx="2" />
          </g>
          <g transform="translate(138, 62)">
            <ellipse cx="0" cy="0" rx="9" ry="10" fill="#fff" stroke="#1e293b" strokeWidth="1.2" />
            <circle className={styles.pupil} cx="1" cy="1" r="4.5" fill="#1e293b" />
            <circle cx="-2" cy="-2" r="1.8" fill="#fff" />
            <rect className={styles.lid} x="-10" y="-11" width="20" height="11" fill="#f5c16c" rx="2" />
          </g>
        </g>
        {isTired ? (
          <>
            <path d="M 93 64 Q 102 68 111 64" stroke="#1e293b" strokeWidth="2" fill="none" />
            <path d="M 129 64 Q 138 68 147 64" stroke="#1e293b" strokeWidth="2" fill="none" />
          </>
        ) : null}
        <ellipse cx="120" cy="82" rx="7" ry="5" fill="#1e293b" />
        <path className={styles.mouth} d={mouthCurve} stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
        {isHappy && anim !== "sleep" ? (
          <ellipse cx="120" cy="98" rx="5" ry="4" fill="#f87171" />
        ) : null}
        <g className={styles.dirtOverlay} data-level={dirtLevel > 0 ? dirtLevel : undefined}>
          <circle cx="100" cy="100" r="6" fill="#8B6914" opacity="0.7" />
          <circle cx="135" cy="95" r="5" fill="#6B4F12" opacity="0.6" />
          <circle cx="115" cy="115" r="7" fill="#7A5C10" opacity="0.65" />
          <circle cx="95" cy="72" r="4" fill="#8B6914" opacity="0.5" />
          <circle cx="140" cy="78" r="5" fill="#6B4F12" opacity="0.55" />
          {dirtLevel >= 3 ? (
            <>
              <circle cx="108" cy="88" r="4" fill="#5C4510" opacity="0.6" />
              <circle cx="128" cy="108" r="5" fill="#5C4510" opacity="0.55" />
            </>
          ) : null}
        </g>
        <text className={styles.zzz} x="168" y="42">
          z z z
        </text>
      </svg>
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

/** @param {{ onTouchHead: () => void, onTouchNose: () => void, onTouchBelly: () => void, onTouchPaw: () => void, onTouchBody: () => void }} props */
export function LeoDogTouchZones({ onTouchHead, onTouchNose, onTouchBelly, onTouchPaw, onTouchBody }) {
  return (
    <>
      <button type="button" className={`${styles.hitZone} ${styles.hitHead}`} aria-label="ליטוף ראש" onClick={onTouchHead} />
      <button type="button" className={`${styles.hitZone} ${styles.hitNose}`} aria-label="לחיצה על האף" onClick={onTouchNose} />
      <button type="button" className={`${styles.hitZone} ${styles.hitBelly}`} aria-label="ליטוף בטן" onClick={onTouchBelly} />
      <button type="button" className={`${styles.hitZone} ${styles.hitPaw}`} aria-label="כף יד" onClick={onTouchPaw} />
      <button type="button" className={`${styles.hitZone} ${styles.hitBody}`} aria-label="ליטוף גב" onClick={onTouchBody} />
    </>
  );
}
