/**
 * Local memory deck for offline solo memory — no shop API.
 * Uses static images from public/.
 */

const SHOP_CARD_BACK = "/rewards/cards/common/card_back.webp";

/** @type {{ pairKey: string, src: string, preBaked: boolean, nameHe: string }[]} */
const OFFLINE_MEMORY_POOL = Object.freeze([
  { pairKey: "shiba1", src: "/images/card/shiba1.png", preBaked: true, nameHe: "ליאו 1" },
  { pairKey: "shiba2", src: "/images/card/shiba2.png", preBaked: true, nameHe: "ליאו 2" },
  { pairKey: "shiba3", src: "/images/card/shiba3.png", preBaked: true, nameHe: "ליאו 3" },
  { pairKey: "shiba4", src: "/images/card/shiba4.png", preBaked: true, nameHe: "ליאו 4" },
  { pairKey: "shiba5", src: "/images/card/shiba5.png", preBaked: true, nameHe: "ליאו 5" },
  { pairKey: "heart", src: "/images/candy/heart.png", preBaked: true, nameHe: "לב" },
  { pairKey: "star", src: "/images/candy/star.png", preBaked: true, nameHe: "כוכב" },
  { pairKey: "square", src: "/images/candy/square.png", preBaked: true, nameHe: "ריבוע" },
  { pairKey: "drop", src: "/images/candy/drop.png", preBaked: true, nameHe: "טיפה" },
  { pairKey: "diamond", src: "/images/candy/diamond.png", preBaked: true, nameHe: "יהלום" },
  { pairKey: "circle", src: "/images/candy/circle.png", preBaked: true, nameHe: "עיגול" },
  { pairKey: "leo", src: "/images/leo.png", preBaked: true, nameHe: "ליאו" },
]);

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {number} pairCount
 * @returns {Promise<{ ok: true, deck: object[] } | { ok: false, reason: string }>}
 */
export async function buildMemoryDeckOffline(pairCount) {
  const need = Math.max(1, Math.floor(Number(pairCount) || 1));
  if (OFFLINE_MEMORY_POOL.length < need) {
    return { ok: false, reason: "insufficient_offline_cards" };
  }

  const finalPairs = shuffle([...OFFLINE_MEMORY_POOL]).slice(0, need);
  const deckItems = [];
  for (const item of finalPairs) {
    deckItems.push(item, { ...item });
  }

  const deck = shuffle(deckItems).map((item, index) => ({
    id: index,
    pairKey: item.pairKey,
    src: item.src,
    preBaked: item.preBaked,
    nameHe: item.nameHe,
  }));

  void SHOP_CARD_BACK;
  return { ok: true, deck };
}
