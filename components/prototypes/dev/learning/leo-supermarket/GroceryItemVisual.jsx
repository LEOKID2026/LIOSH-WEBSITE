import { useEffect, useState } from "react";
import styles from "./LeoSupermarketPrototype.module.css";

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
 * }} props
 */
function ShelfVisual({ product, imageClassName, iconClassName }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [product.id, product.imageSrc]);

  const canTryImage = Boolean(product.imageSrc) && !imageFailed;

  if (canTryImage) {
    return (
      <img
        src={product.imageSrc}
        alt=""
        className={imageClassName}
        draggable={false}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span className={iconClassName} aria-hidden>
      {product.shelfIcon}
    </span>
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
 *   variant?: 'shelf' | 'register-mini'
 *   showPrice?: boolean
 * }} props
 */
export default function GroceryItemVisual({ product, variant = "shelf", showPrice = true }) {
  const visual = (
    <ShelfVisual
      product={product}
      imageClassName={styles.shelfItemImage}
      iconClassName={styles.shelfItemIcon}
    />
  );

  if (variant === "register-mini") {
    return <div className={styles.registerMiniItem}>{visual}</div>;
  }

  return (
    <div className={styles.shelfItemRow}>
      <span className={styles.shelfItemName}>{product.name}</span>
      {visual}
      {showPrice ? <span className={styles.shelfItemPrice}>{product.price}₪</span> : null}
    </div>
  );
}
