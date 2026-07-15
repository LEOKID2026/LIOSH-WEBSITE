import styles from "./LeoDogGame.module.css";
import {
  LEO_DOG_CARD_GALLERY,
  LEO_DOG_REFERENCE_PHOTOS,
  LEO_DOG_SPRITE_GALLERY,
} from "../../../../lib/prototypes/leo-dog/leo-dog-assets.js";

/** @typedef {import('../../../../lib/prototypes/leo-dog/leo-dog-assets.js').LeoDogDebugPanelMode} LeoDogDebugPanelMode */

/**
 * @param {{ items: { src: string, label: string, note?: string }[], title: string }} props
 */
function GallerySection({ title, items }) {
  return (
    <>
      <p className={styles.galleryTitle}>{title}</p>
      <div className={styles.galleryGrid}>
        {items.map((item) => (
          <figure key={item.src} className={styles.galleryItem}>
            <img src={item.src} alt={item.label} className={styles.galleryThumb} loading="lazy" />
            <figcaption className={styles.galleryCaption}>
              <span className={styles.galleryLabel}>{item.label}</span>
              {item.note ? <span className={styles.galleryMeta}>{item.note}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}

/**
 * Debug-only asset gallery — never rendered in the main game scene.
 * @param {{ mode: LeoDogDebugPanelMode }} props
 */
export default function LeoDogReferenceGallery({ mode }) {
  if (mode === "svg") {
    return (
      <div className={styles.galleryPanel}>
        <p className={styles.galleryNote}>
          המשחק: toggle &quot;ליאו החדש&quot; / &quot;SVG ישן&quot;. גלריות - בלשוניות למטה.
        </p>
      </div>
    );
  }

  if (mode === "photos") {
    return (
      <div className={styles.galleryPanel}>
        <GallerySection title="תמונות אמיתיות (reference)" items={LEO_DOG_REFERENCE_PHOTOS} />
      </div>
    );
  }

  return (
    <div className={styles.galleryPanel}>
      <p className={styles.galleryNote}>צפייה בלבד - לא משפיע על המשחק.</p>
      <GallerySection title="Sprites חדשים (PNG שקוף)" items={LEO_DOG_SPRITE_GALLERY} />
      <GallerySection title="קלפים legacy (לא למשחק)" items={LEO_DOG_CARD_GALLERY} />
    </div>
  );
}
