import styles from "./RecyclingFactoryPrototype.module.css";

/**
 * @param {{ item: { emoji: string, name: string, imageSrc?: string }, compact?: boolean }} props
 */
export default function RecyclingItemVisual({ item, compact = false }) {
  return (
    <>
      {item.imageSrc ? (
        <img
          src={item.imageSrc}
          alt=""
          className={compact ? styles.itemImageCompact : styles.itemImage}
          draggable={false}
        />
      ) : (
        <span className={styles.itemEmoji}>{item.emoji}</span>
      )}
      <span className={styles.itemName}>{item.name}</span>
    </>
  );
}
