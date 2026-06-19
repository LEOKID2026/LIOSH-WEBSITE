/**
 * Weighted random pick — weights are positive integers.
 * @param {{ weight: number, value: unknown }[]} items
 */
export function weightedPick(items) {
  const pool = (items || []).filter((i) => Number(i.weight) > 0);
  if (!pool.length) return null;
  const total = pool.reduce((s, i) => s + Math.floor(Number(i.weight)), 0);
  if (total <= 0) return null;
  let r = Math.floor(Math.random() * total);
  for (const item of pool) {
    r -= Math.floor(Number(item.weight));
    if (r < 0) return item.value;
  }
  return pool[pool.length - 1].value;
}

/**
 * Pick N distinct values by key extractor.
 */
export function weightedPickDistinct(items, count, keyFn) {
  const picked = [];
  const used = new Set();
  let pool = [...items];
  for (let i = 0; i < count && pool.length; i += 1) {
    const value = weightedPick(pool.map((p) => ({ weight: p.weight, value: p })));
    if (!value) break;
    const key = keyFn(value.value ?? value);
    if (used.has(key)) {
      pool = pool.filter((p) => keyFn(p.value ?? p) !== key);
      i -= 1;
      continue;
    }
    used.add(key);
    picked.push(value.value ?? value);
    pool = pool.filter((p) => keyFn(p.value ?? p) !== key);
  }
  return picked;
}
