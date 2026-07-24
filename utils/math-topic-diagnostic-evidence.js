import { mcqCellValue } from "./mcq-option-cell.js";
import { MATH_TOPIC_COVERAGE_DEFINITIONS } from "./diagnostic-engine-v2/taxonomy-math-topic-coverage.js";

const BY_TOPIC = Object.freeze(
  Object.fromEntries(MATH_TOPIC_COVERAGE_DEFINITIONS.map((d) => [d.topic, d]))
);

function key(value) {
  return String(mcqCellValue(value) ?? "").trim();
}

function finiteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rounded(value, places = 6) {
  return Number(Number(value).toFixed(places));
}

/**
 * Derives a wrong answer by applying a named misconception transformation to
 * the actual generated question parameters. Returning null means the current
 * question shape cannot support a defensible misconception-specific claim.
 */
export function deriveMathMisconceptionEvidence(question) {
  const p = question.params || {};
  const topic = String(question.topic || question.operation || "");
  const correct = question.correctAnswer;
  const expected = finiteNumber(correct);
  let value = null;
  let transformationId = null;
  let transformation = null;

  if (topic === "compare") {
    value = correct === "<" ? ">" : correct === ">" ? "<" : null;
    transformationId = "reverse_comparison_relation";
    transformation = "Reverse the true greater-than/less-than relation.";
  } else if (topic === "scale") {
    if (p.kind === "scale_map_to_real") {
      value = rounded(Number(p.mapLength) / Number(p.scale));
      transformationId = "divide_instead_of_multiply_scale";
      transformation = "Divide map length by the scale factor instead of multiplying.";
    } else if (p.kind === "scale_real_to_map") {
      value = rounded(Number(p.realLength) * Number(p.scale));
      transformationId = "multiply_instead_of_divide_scale";
      transformation = "Multiply real length by the scale factor instead of dividing.";
    } else if (p.kind === "scale_find") {
      value = rounded(Number(p.realLength) * Number(p.mapLength));
      transformationId = "multiply_lengths_instead_of_forming_ratio";
      transformation = "Multiply the paired lengths instead of computing real ÷ map.";
    }
  } else if (topic === "division") {
    value = Number(p.dividend) * Number(p.divisor);
    transformationId = "multiply_instead_of_divide";
    transformation = "Substitute multiplication for the requested division.";
  } else if (topic === "division_with_remainder") {
    const quotient = Number(p.quotient);
    const remainder = Number(p.remainder);
    const divisor = Number(p.divisor);
    if (Number.isFinite(quotient) && Number.isFinite(remainder) && divisor > 1) {
      const wrongRemainder = remainder + 1 < divisor ? remainder + 1 : remainder - 1;
      value = `${quotient} ושארית ${wrongRemainder}`;
      transformationId = "change_remainder_without_rebalancing_quotient";
      transformation = "Alter the remainder while keeping the quotient, violating dividend = divisor×quotient+remainder.";
    }
  } else if (topic === "decimals" && expected != null) {
    value = rounded(expected * 10);
    transformationId = "shift_decimal_point_right";
    transformation = "Shift the decimal point one place right after the operation.";
  } else if (topic === "sequences" && expected != null && p.step != null) {
    value = rounded(expected - Number(p.step));
    transformationId = "omit_final_sequence_step";
    transformation = "Repeat the previous term by omitting the final application of the sequence step.";
  } else if (topic === "percentages" && p.base != null) {
    value = Number(p.base);
    transformationId = "return_whole_instead_of_percentage_part";
    transformation = "Return the whole/base instead of calculating the requested percentage part.";
  } else if (
    topic === "ratio" &&
    p.kind === "ratio_find" &&
    p.simplifiedA != null &&
    p.simplifiedB != null
  ) {
    value = `${p.simplifiedB}:${p.simplifiedA}`;
    transformationId = "reverse_ratio_order";
    transformation = "Reverse the order of the two ratio terms.";
  } else if (topic === "equations") {
    const c = Number(p.c);
    if (String(p.kind).startsWith("eq_add")) {
      const knownAddend =
        p.form === "a_plus_x" ? Number(p.a) : Number(p.b);
      value = c + knownAddend;
      transformationId = "add_known_term_instead_of_subtracting";
      transformation = "Add the known addend to the total instead of applying subtraction.";
    } else if (p.kind === "eq_sub" && p.form === "x_minus_b") {
      value = c - Number(p.b);
      transformationId = "subtract_subtrahend_instead_of_adding";
      transformation = "Subtract the known subtrahend from the difference instead of adding it.";
    } else if (p.kind === "eq_sub" && p.form === "a_minus_x") {
      value = Number(p.a) + c;
      transformationId = "add_difference_instead_of_subtracting";
      transformation = "Add the difference to the minuend instead of subtracting it.";
    }
  } else if (topic === "order_of_operations") {
    const a = Number(p.a);
    const b = Number(p.b);
    const c = Number(p.c);
    if (p.kind === "order_add_mul") {
      value = (a + b) * c;
      transformationId = "evaluate_left_to_right_before_multiplication";
      transformation = "Evaluate addition first, strictly left-to-right, instead of multiplication precedence.";
    } else if (p.kind === "order_mul_sub") {
      value = a * (b - c);
      transformationId = "evaluate_subtraction_before_multiplication";
      transformation = "Evaluate subtraction first instead of multiplication precedence.";
    } else if (p.kind === "order_parentheses") {
      value = a + b * c;
      transformationId = "ignore_parentheses";
      transformation = "Ignore the parentheses and apply ordinary multiplication precedence.";
    }
  } else if (topic === "divisibility") {
    value = key(correct) === "כן" ? "לא" : "כן";
    transformationId = "negate_divisibility_classification";
    transformation = "Apply the divisibility rule with the opposite Boolean conclusion.";
  } else if (topic === "prime_composite" && p.subKind === "pc_classify") {
    value = key(correct) === "ראשוני" ? "פריק" : "ראשוני";
    transformationId = "swap_prime_composite_classification";
    transformation = "Swap the mutually exclusive prime/composite classification.";
  } else if (topic === "powers" && p.kind === "power_calc") {
    value = Number(p.base) * Number(p.exp);
    transformationId = "multiply_base_by_exponent";
    transformation = "Treat exponentiation as base × exponent instead of repeated multiplication.";
  } else if (topic === "zero_one_properties") {
    if (String(p.kind).startsWith("zero_mul")) {
      value = Number(p.a);
      transformationId = "apply_multiplicative_identity_to_zero";
      transformation = "Apply a×1=a to a×0, ignoring the zero-product property.";
    } else if (String(p.kind).startsWith("zero_add")) {
      value = 0;
      transformationId = "apply_zero_product_rule_to_addition";
      transformation = "Apply the zero-product property to addition instead of additive identity.";
    } else if (String(p.kind).startsWith("one_mul")) {
      value = 1;
      transformationId = "return_identity_element_instead_of_operand";
      transformation = "Return the identity element 1 instead of preserving the other factor.";
    }
  } else if (topic === "estimation" && p.exact != null) {
    value = Number(p.exact);
    transformationId = "return_exact_result_instead_of_estimate";
    transformation = "Return the exact calculation instead of the requested rounded estimate.";
  } else if (topic === "factors_multiples" && p.kind === "fm_gcd") {
    value = Math.min(Number(p.a), Number(p.b));
    transformationId = "use_smaller_input_as_gcd";
    transformation = "Assume the smaller input is automatically the greatest common divisor.";
  }

  if (
    value == null ||
    !transformationId ||
    key(value) === key(correct) ||
    (typeof value === "number" && !Number.isFinite(value))
  ) {
    return null;
  }
  return { value, transformationId, transformation };
}

/**
 * Adds one value-grounded diagnostic distractor to a real generated question.
 * Other wrong options remain generic, which preserves a random-error negative.
 */
export function attachMathTopicDiagnosticEvidence(question) {
  if (!question || typeof question !== "object") return question;
  const topic = String(question.topic || question.operation || "");
  const definition = BY_TOPIC[topic];
  const answers = Array.isArray(question.answers) ? question.answers : [];
  if (!definition || answers.length < 2) return question;

  const correct = question.correctAnswer;
  const misconception = deriveMathMisconceptionEvidence(question);
  if (!misconception) return question;
  const existingDiagnosticIndex = answers.findIndex(
    (answer) => key(answer) === key(misconception.value)
  );
  const replacementIndex =
    existingDiagnosticIndex >= 0
      ? existingDiagnosticIndex
      : answers.findIndex((answer) => key(answer) !== key(correct));
  if (replacementIndex < 0) return question;
  const diagnosticAnswers = [...answers];
  diagnosticAnswers[replacementIndex] = misconception.value;
  const diagnosticWrong = diagnosticAnswers[replacementIndex];

  const oldCells = Array.isArray(question.params?.mcqOptionCells)
    ? question.params.mcqOptionCells
    : [];
  const alignedCells = diagnosticAnswers.map((answer, index) => {
    const existing = oldCells.find((cell) => key(cell) === key(answer));
    const isDiagnostic = key(answer) === key(diagnosticWrong);
    return {
      ...(existing && typeof existing === "object" ? existing : {}),
      value: mcqCellValue(answer),
      distractorFamily:
        key(answer) === key(correct)
          ? null
          : isDiagnostic
            ? definition.tag
            : "generic_proximity",
      index,
    };
  });

  return {
    ...question,
    answers: diagnosticAnswers,
    options: Array.isArray(question.options) ? diagnosticAnswers : question.options,
    params: {
      ...(question.params || {}),
      mcqOptionCells: alignedCells,
      topicDiagnosticEvidence: {
        version: "math-topic-diagnostic-evidence-v1",
        taxonomyId: definition.id,
        tag: definition.tag,
        wrongAnswer: mcqCellValue(diagnosticWrong),
        transformationId: misconception.transformationId,
        transformation: misconception.transformation,
        sourceParameters: Object.fromEntries(
          Object.entries(question.params || {}).filter(
            ([name]) =>
              !["mcqOptionCells", "topicDiagnosticEvidence", "canonicalMetadata"].includes(name)
          )
        ),
        topicLevelOnly: true,
      },
    },
  };
}
