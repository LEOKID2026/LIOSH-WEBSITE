import { useEffect, useState } from "react";
import styles from "./LeoSupermarketGame.module.css";

/**
 * @param {{
 *   product: {
 *     id?: string
 *     name: string
 *     price: number
 *     requestIcon: string
 *     shelfIcon: string
 *     imageSrc?: string
 *   }
 *   imageClassName?: string
 *   iconClassName?: string
 *   centerClassName?: string
 * }} props
 */
function ShelfVisual({ product, imageClassName, iconClassName, centerClassName }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [product.id, product.imageSrc]);

  const canTryImage = Boolean(product.imageSrc) && !imageFailed;

  return (
    <div className={centerClassName}>
      {canTryImage ? (
        <img
          src={product.imageSrc}
          alt=""
          className={imageClassName}
          draggable={false}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span className={iconClassName} aria-hidden>
          {product.shelfIcon}
        </span>
      )}
    </div>
  );
}

/**
 * @param {{
 *   product: {
 *     id?: string
 *     name: string
 *     price: number
 *     requestIcon: string
 *     shelfIcon: string
 *     imageSrc?: string
 *   }
 *   variant?: 'shelf' | 'register-chip'
 *   showPrice?: boolean
 *   nameOnShelf?: boolean
 * }} props
 */
export default function GroceryItemVisual({
  product,
  variant = "shelf",
  showPrice = true,
  nameOnShelf = true,
}) {
  const visual = (
    <ShelfVisual
      product={product}
      imageClassName={variant === "register-chip" ? styles.registerChipImage : styles.shelfItemImage}
      iconClassName={variant === "register-chip" ? styles.registerChipIcon : styles.shelfItemIcon}
      centerClassName={variant === "shelf" ? styles.shelfItemCenter : undefined}
    />
  );

  if (variant === "register-chip") {
    return (
      <div className={styles.registerProductChip}>
        {visual}
        <span className={styles.registerChipName}>{product.name}</span>
      </div>
    );
  }

  if (!nameOnShelf) {
    return (
      <div className={styles.shelfItemIconPrice}>
        {visual}
        {showPrice ? <span className={styles.shelfItemPriceOnly}>{product.price}₪</span> : null}
      </div>
    );
  }

  return (
    <div className={styles.shelfItemRow}>
      <span className={styles.shelfItemName}>{product.name}</span>
      {visual}
      {showPrice ? <span className={styles.shelfItemPriceBadge}>{product.price}₪</span> : null}
    </div>
  );
}
