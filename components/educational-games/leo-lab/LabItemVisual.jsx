import { useEffect, useState } from "react";
import styles from "./LeoLabGame.module.css";

/**
 * @param {{
 *   item: { id?: string, name: string, icon: string, imageSrc?: string }
 *   size?: 'shelf' | 'bench' | 'ghost'
 *   showName?: boolean
 * }} props
 */
export default function LabItemVisual({ item, size = "shelf", showName = true }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [item.id, item.imageSrc]);

  const canTryImage = Boolean(item.imageSrc) && !imageFailed;
  const isPaintItem = typeof item.id === "string" && item.id.startsWith("paint_");
  const sizeClass =
    size === "bench" ? styles.benchItemVisual : size === "ghost" ? styles.ghostItemVisual : styles.shelfItemVisual;

  return (
    <div className={sizeClass}>
      <div className={styles.itemVisualCenter}>
        {canTryImage ? (
          <img
            src={item.imageSrc}
            alt=""
            className={styles.itemImage}
            draggable={false}
            onError={() => setImageFailed(true)}
          />
        ) : isPaintItem ? (
          <span className={styles.paintSwatch} data-paint={item.id} aria-hidden />
        ) : (
          <span className={styles.itemIcon} aria-hidden>
            {item.icon}
          </span>
        )}
      </div>
      {showName && size !== "ghost" ? <span className={styles.itemName}>{item.name}</span> : null}
    </div>
  );
}
