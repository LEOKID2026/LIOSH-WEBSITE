/**
 * Column / step tracing for multi-digit integer add & sub.
 * Digits are right-aligned: index 0 = ones, 1 = tens, …
 */

/**
 * @param {number} n
 * @returns {number[]} digits least-significant first (non-negative magnitude)
 */
export function toColumns(n) {
  const v = Math.trunc(Math.abs(Number(n)));
  if (!Number.isFinite(v)) return [];
  if (v === 0) return [0];
  const digits = [];
  let x = v;
  while (x > 0) {
    digits.push(x % 10);
    x = Math.floor(x / 10);
  }
  return digits;
}

/**
 * @param {number[]} cols
 * @returns {number}
 */
export function fromColumns(cols) {
  let n = 0;
  for (let i = cols.length - 1; i >= 0; i -= 1) n = n * 10 + (cols[i] || 0);
  return n;
}

/**
 * Pad shorter column arrays on the high end so both share length.
 * @param {number[]} a
 * @param {number[]} b
 */
export function alignColumns(a, b) {
  const len = Math.max(a.length, b.length, 1);
  const left = Array.from({ length: len }, (_, i) => a[i] || 0);
  const right = Array.from({ length: len }, (_, i) => b[i] || 0);
  return { left, right, len };
}

/**
 * Compare two integers digit-by-digit (same written length required for slip).
 * @param {number} user
 * @param {number} expected
 * @returns {{ sameLength: boolean, diffCount: number, positions: number[], userCols: number[], expectedCols: number[] }}
 */
export function compareDigitColumns(user, expected) {
  const uStr = String(Math.trunc(Math.abs(Number(user))));
  const eStr = String(Math.trunc(Math.abs(Number(expected))));
  const userCols = toColumns(user);
  const expectedCols = toColumns(expected);
  if (uStr.length !== eStr.length) {
    return { sameLength: false, diffCount: -1, positions: [], userCols, expectedCols };
  }
  /** @type {number[]} */
  const positions = [];
  for (let i = 0; i < uStr.length; i += 1) {
    if (uStr[i] !== eStr[i]) positions.push(uStr.length - 1 - i); // column power index
  }
  return {
    sameLength: true,
    diffCount: positions.length,
    positions,
    userCols,
    expectedCols,
  };
}

/**
 * Vertical addition column trace with carries.
 * @param {number} a
 * @param {number} b
 */
export function traceAdditionColumns(a, b) {
  const { left, right, len } = alignColumns(toColumns(a), toColumns(b));
  /** @type {{ col: number, digitA: number, digitB: number, carryIn: number, raw: number, write: number, carryOut: number }[]} */
  const steps = [];
  let carry = 0;
  for (let i = 0; i < len; i += 1) {
    const raw = left[i] + right[i] + carry;
    const write = raw % 10;
    const carryOut = Math.floor(raw / 10);
    steps.push({
      col: i,
      digitA: left[i],
      digitB: right[i],
      carryIn: carry,
      raw,
      write,
      carryOut,
    });
    carry = carryOut;
  }
  if (carry > 0) {
    steps.push({
      col: len,
      digitA: 0,
      digitB: 0,
      carryIn: carry,
      raw: carry,
      write: carry % 10,
      carryOut: Math.floor(carry / 10),
    });
  }
  return { steps, sum: a + b };
}

/**
 * Vertical subtraction column trace with borrows (a ≥ b assumed for school algorithm).
 * @param {number} a
 * @param {number} b
 */
export function traceSubtractionColumns(a, b) {
  const { left, right, len } = alignColumns(toColumns(a), toColumns(b));
  /** @type {{ col: number, digitA: number, digitB: number, borrowed: boolean, write: number }[]} */
  const steps = [];
  const working = left.slice();
  for (let i = 0; i < len; i += 1) {
    let top = working[i];
    let borrowed = false;
    if (top < right[i]) {
      // borrow from next higher column
      let j = i + 1;
      while (j < len && working[j] === 0) j += 1;
      if (j < len) {
        working[j] -= 1;
        for (let k = j - 1; k > i; k -= 1) working[k] += 9;
        top += 10;
        borrowed = true;
      }
    }
    steps.push({
      col: i,
      digitA: left[i],
      digitB: right[i],
      borrowed,
      write: top - right[i],
    });
  }
  return { steps, difference: a - b };
}

/**
 * Exact proof: selected and correct share digit length and differ in exactly one column.
 * @param {{ userAnswer: number, expectedAnswer: number, trueOp: number }} p
 */
export function proveSingleColumnDigitSlip(p) {
  const user = Number(p.userAnswer);
  const expected = Number(p.expectedAnswer);
  const trueOp = Number(p.trueOp);
  if (![user, expected, trueOp].every(Number.isFinite)) return null;
  if (user === expected) return null;
  if (expected !== trueOp) return null;
  const cmp = compareDigitColumns(user, expected);
  if (!cmp.sameLength || cmp.diffCount !== 1) return null;
  return {
    mode: "column_digit_slip",
    column: cmp.positions[0],
    userCols: cmp.userCols,
    expectedCols: cmp.expectedCols,
  };
}
