/**
 * Renderer-only tokenizer for stacked fraction display.
 * Does not mutate question/answer data — parse display strings only.
 */

/** Reject date-like a/b/c chains after a simple a/b match. */
const FRACTION_CORE =
  /^([−\-])?(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)(?!\s*\/\s*\d)/;

const NUMBER_TOKEN = /^([−\-])?\d+(?:\.\d+)?/;

const OPERATOR_TOKEN = /^[+=×÷*/()]/;

/**
 * @param {unknown} text
 * @returns {boolean}
 */
export function hasStackedFractionToken(text) {
  const s = String(text ?? "");
  if (!s) return false;
  return /(?:^|[^\d/])\d+\s*\/\s*\d+(?!\s*\/\s*\d)/.test(s) || /^\d+\s*\/\s*\d+(?!\s*\/\s*\d)/.test(s.trim());
}

/**
 * @param {{ type: string }[]} tokens
 */
function lastSignificant(tokens) {
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (tokens[i].type !== "space") return tokens[i];
  }
  return null;
}

/**
 * @param {{ type: string }[]} tokens
 */
function canAttachUnarySign(tokens) {
  const prev = lastSignificant(tokens);
  return !prev || prev.type === "operator";
}

/**
 * @param {string} sign
 */
function normalizeMinus(sign) {
  return sign === "-" || sign === "−" ? "−" : sign;
}

/**
 * @param {unknown} raw
 * @returns {Array<
 *   | { type: "fraction", sign: string, whole: string|null, numerator: string, denominator: string, raw: string }
 *   | { type: "number", value: string }
 *   | { type: "operator", value: string }
 *   | { type: "space", value: string }
 *   | { type: "text", value: string }
 * >}
 */
export function parseMathFractionExpression(raw) {
  const input = String(raw ?? "");
  if (!input) return [];

  /** @type {ReturnType<typeof parseMathFractionExpression>} */
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /\s/.test(input[j])) j += 1;
      tokens.push({ type: "space", value: input.slice(i, j) });
      i = j;
      continue;
    }

    const slice = input.slice(i);
    let frac = slice.match(FRACTION_CORE);
    if (frac) {
      let sign = frac[1] ? normalizeMinus(frac[1]) : "";
      let whole = frac[2] || null;
      let numerator = frac[3];
      let denominator = frac[4];
      let matched = frac[0];

      if (sign && !canAttachUnarySign(tokens)) {
        tokens.push({ type: "operator", value: sign });
        const rest = input.slice(i + 1);
        const again = rest.match(/^(?:(\d+)\s+)?(\d+)\s*\/\s*(\d+)(?!\s*\/\s*\d)/);
        if (!again) {
          tokens.push({ type: "text", value: matched[0] || sign });
          i += 1;
          continue;
        }
        sign = "";
        whole = again[1] || null;
        numerator = again[2];
        denominator = again[3];
        matched = input[i] + again[0];
      }

      tokens.push({
        type: "fraction",
        sign,
        whole,
        numerator,
        denominator,
        raw: matched,
      });
      i += matched.length;
      continue;
    }

    if (ch === "-" || ch === "−") {
      tokens.push({ type: "operator", value: normalizeMinus(ch) });
      i += 1;
      continue;
    }

    if (OPERATOR_TOKEN.test(ch)) {
      tokens.push({ type: "operator", value: ch === "*" ? "×" : ch === "/" ? "÷" : ch });
      i += 1;
      continue;
    }

    const num = slice.match(NUMBER_TOKEN);
    if (num) {
      let value = num[0];
      if ((value[0] === "-" || value[0] === "−") && !canAttachUnarySign(tokens)) {
        tokens.push({ type: "operator", value: normalizeMinus(value[0]) });
        value = value.slice(1);
        if (!value) {
          i += 1;
          continue;
        }
      }
      tokens.push({ type: "number", value: value.replace(/^-/, "−").replace(/^−/, "−") });
      i += num[0].length;
      continue;
    }

    let j = i + 1;
    while (
      j < input.length &&
      !/\s/.test(input[j]) &&
      !OPERATOR_TOKEN.test(input[j]) &&
      input[j] !== "-" &&
      input[j] !== "−" &&
      !FRACTION_CORE.test(input.slice(j)) &&
      !NUMBER_TOKEN.test(input.slice(j))
    ) {
      j += 1;
    }
    tokens.push({ type: "text", value: input.slice(i, j) });
    i = j;
  }

  return tokens;
}
