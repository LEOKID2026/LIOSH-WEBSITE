/**
 * Per-session anti-repeat selection for learning masters.
 */

const DEFAULT_HISTORY_SIZE = 60;
const DEFAULT_NEAR_TAIL = 16;
const DEFAULT_MAX_ATTEMPTS = 80;

/**
 * @param {string} key
 * @param {string[]} orderedKeys
 */
function countInTail(key, orderedKeys) {
  let n = 0;
  for (const k of orderedKeys) {
    if (k === key) n += 1;
  }
  return n;
}

export class SessionAntiRepeatBuffer {
  /**
   * @param {{ maxSize?: number, nearTailSize?: number, nearRepeatLimit?: number }} [opts]
   */
  constructor(opts = {}) {
    this.maxSize = opts.maxSize ?? DEFAULT_HISTORY_SIZE;
    this.nearTailSize = opts.nearTailSize ?? DEFAULT_NEAR_TAIL;
    this.nearRepeatLimit = opts.nearRepeatLimit ?? 2;
    /** @type {string[]} */
    this.keys = [];
    /** @type {string[]} */
    this.nearKeys = [];
    this.lastKey = null;
  }

  /** @param {Iterable<string>|SessionAntiRepeatBuffer} src */
  static fromIterable(src) {
    const buf = new SessionAntiRepeatBuffer();
    if (src instanceof SessionAntiRepeatBuffer) {
      buf.keys = [...src.keys];
      buf.nearKeys = [...src.nearKeys];
      buf.lastKey = src.lastKey;
      return buf;
    }
    for (const k of src || []) {
      if (k) buf.keys.push(String(k));
    }
    buf.lastKey = buf.keys[buf.keys.length - 1] || null;
    return buf;
  }

  toSet() {
    return new Set(this.keys);
  }

  /**
   * @param {string} key
   * @param {string} [nearKey]
   */
  wouldAccept(key, nearKey = "") {
    const k = String(key || "");
    if (!k) return false;
    if (this.lastKey && this.lastKey === k) return false;
    if (this.keys.includes(k)) return false;
    const nearTail = this.nearKeys.slice(-this.nearTailSize);
    if (nearKey && countInTail(nearKey, nearTail) >= this.nearRepeatLimit) {
      return false;
    }
    return true;
  }

  /**
   * @param {string} key
   * @param {string} [nearKey]
   */
  record(key, nearKey = "") {
    const k = String(key || "");
    if (!k) return;
    this.keys.push(k);
    if (this.keys.length > this.maxSize) {
      this.keys = this.keys.slice(-this.maxSize);
    }
    if (nearKey) {
      this.nearKeys.push(String(nearKey));
      if (this.nearKeys.length > this.nearTailSize * 2) {
        this.nearKeys = this.nearKeys.slice(-this.nearTailSize * 2);
      }
    }
    this.lastKey = k;
  }

  /** Soft reset: drop oldest half so thin pools can rotate fairly. */
  softenOnExhaustion() {
    if (this.keys.length <= 8) {
      const keep = this.lastKey ? [this.lastKey] : [];
      this.keys = keep;
      this.nearKeys = this.nearKeys.slice(-4);
      return;
    }
    this.keys = this.keys.slice(-Math.max(8, Math.floor(this.maxSize / 2)));
    this.nearKeys = this.nearKeys.slice(-Math.floor(this.nearTailSize / 2));
  }

  clear() {
    this.keys = [];
    this.nearKeys = [];
    this.lastKey = null;
  }
}

/**
 * Pick from a finite pool with anti-repeat.
 * @template T
 * @param {object} p
 * @param {T[]} p.pool
 * @param {SessionAntiRepeatBuffer} p.history
 * @param {(item: T) => string} p.getFingerprint
 * @param {(item: T) => string} [p.getNearKey]
 * @param {(items: T[]) => T|null|undefined} [p.pickFn]
 * @param {number} [p.maxAttempts]
 */
export function selectFromPoolWithAntiRepeat({
  pool,
  history,
  getFingerprint,
  getNearKey,
  pickFn,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}) {
  if (!pool?.length) return { item: null, exhausted: true };

  const pick =
    pickFn ||
    ((items) => items[Math.floor(Math.random() * items.length)]);

  const unused = pool.filter((item) =>
    history.wouldAccept(getFingerprint(item), getNearKey?.(item))
  );
  const candidates = unused.length ? unused : pool.filter(
    (item) => getFingerprint(item) !== history.lastKey
  );
  const eligible = candidates.length ? candidates : pool;

  for (let i = 0; i < maxAttempts; i++) {
    const item = pick(eligible);
    if (!item) continue;
    const fp = getFingerprint(item);
    const near = getNearKey?.(item) || "";
    if (history.wouldAccept(fp, near)) {
      history.record(fp, near);
      return { item, exhausted: false };
    }
  }

  history.softenOnExhaustion();
  const item = pick(
    pool.filter((x) => getFingerprint(x) !== history.lastKey) || pool
  );
  if (item) {
    history.record(getFingerprint(item), getNearKey?.(item));
  }
  return { item, exhausted: true };
}

/**
 * Loop generator until anti-repeat accepts (for procedural questions).
 * @template T
 * @param {object} p
 * @param {() => T} p.generateOnce
 * @param {(item: T) => boolean} [p.extraAccept]
 * @param {(item: T) => string} p.getFingerprint
 * @param {(item: T) => string} [p.getNearKey]
 * @param {SessionAntiRepeatBuffer} p.history
 * @param {number} [p.maxAttempts]
 */
export function selectGeneratedWithAntiRepeat({
  generateOnce,
  extraAccept,
  getFingerprint,
  getNearKey,
  history,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}) {
  for (let i = 0; i < maxAttempts; i++) {
    const q = generateOnce();
    const fp = getFingerprint(q);
    const near = getNearKey?.(q) || "";
    const ok =
      history.wouldAccept(fp, near) && (extraAccept ? extraAccept(q) : true);
    if (ok) {
      history.record(fp, near);
      return { question: q, exhausted: false };
    }
  }

  history.softenOnExhaustion();
  for (let i = 0; i < 12; i++) {
    const q = generateOnce();
    const fp = getFingerprint(q);
    if (fp !== history.lastKey && (extraAccept ? extraAccept(q) : true)) {
      history.record(fp, getNearKey?.(q));
      return { question: q, exhausted: true };
    }
  }

  const fallback = generateOnce();
  history.record(getFingerprint(fallback), getNearKey?.(fallback));
  return { question: fallback, exhausted: true };
}
