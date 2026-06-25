import { useState } from "react";
import styles from "./learning-prototype-shared.module.css";

/**
 * @param {{ imageSrc?: string, emoji: string, alt?: string, className?: string, size?: 'sm'|'md'|'lg' }} props
 */
export default function PrototypeVisual({ imageSrc, emoji, alt = "", className = "", size = "md" }) {
  const [broken, setBroken] = useState(false);
  const showImage = imageSrc && !broken;

  const sizeClass =
    size === "lg" ? styles.visualLg : size === "sm" ? styles.visualSm : styles.visualMd;

  if (showImage) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        className={`${styles.visualImg} ${sizeClass} ${className}`}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span className={`${styles.visualEmoji} ${sizeClass} ${className}`} aria-hidden={!alt}>
      {emoji}
    </span>
  );
}
