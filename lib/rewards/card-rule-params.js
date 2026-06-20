/**
 * Normalize rule parameters from params_json + legacy columns (DB single source).
 * @param {object|null|undefined} rule
 */
export function normalizeRuleParams(rule) {
  const pj =
    rule?.params_json && typeof rule.params_json === "object" && !Array.isArray(rule.params_json)
      ? rule.params_json
      : {};
  return {
    min_questions: pj.min_questions ?? rule?.min_questions ?? null,
    min_accuracy: pj.min_accuracy ?? rule?.min_accuracy ?? null,
    min_streak_days: pj.min_streak_days ?? rule?.min_streak_days ?? null,
    min_completed_activities:
      pj.min_completed_activities ?? rule?.min_completed_activities ?? null,
    min_learning_minutes_monthly:
      pj.min_learning_minutes_monthly ?? rule?.min_learning_minutes_monthly ?? null,
    subject: pj.subject ?? rule?.subject ?? null,
    topic: pj.topic ?? rule?.topic ?? null,
    mission_key: pj.mission_key ?? null,
    grade_band: rule?.grade_band ?? pj.grade_band ?? null,
  };
}

/**
 * @param {object} rule
 */
export function ruleParamsToLegacyColumns(rule) {
  const p = normalizeRuleParams(rule);
  return {
    min_questions: p.min_questions,
    min_accuracy: p.min_accuracy,
    min_streak_days: p.min_streak_days,
    min_completed_activities: p.min_completed_activities,
    min_learning_minutes_monthly: p.min_learning_minutes_monthly,
    subject: p.subject,
    topic: p.topic,
    grade_band: p.grade_band,
  };
}

/**
 * Build params_json + sync legacy columns from admin payload.
 * @param {object} body
 */
export function buildRuleRowFromAdminPayload(body) {
  const existingParams =
    body.params_json && typeof body.params_json === "object" ? body.params_json : {};
  const params = {
    ...existingParams,
    ...(body.min_questions != null ? { min_questions: Number(body.min_questions) } : {}),
    ...(body.min_accuracy != null ? { min_accuracy: Number(body.min_accuracy) } : {}),
    ...(body.min_streak_days != null ? { min_streak_days: Number(body.min_streak_days) } : {}),
    ...(body.min_completed_activities != null
      ? { min_completed_activities: Number(body.min_completed_activities) }
      : {}),
    ...(body.min_learning_minutes_monthly != null
      ? { min_learning_minutes_monthly: Number(body.min_learning_minutes_monthly) }
      : {}),
    ...(body.subject != null ? { subject: body.subject } : {}),
    ...(body.topic != null ? { topic: body.topic } : {}),
    ...(body.mission_key != null ? { mission_key: body.mission_key } : {}),
    ...(body.grade_band != null ? { grade_band: body.grade_band } : {}),
  };

  const merged = normalizeRuleParams({ ...body, params_json: params });

  return {
    rule_type: body.rule_type,
    params_json: params,
    requirement_text_he: body.requirement_text_he ?? null,
    grant_enabled: body.grant_enabled !== false,
    is_active: body.is_active !== false,
    display_order: Number(body.display_order) || 0,
    starts_at: body.starts_at ?? null,
    ends_at: body.ends_at ?? null,
    min_questions: merged.min_questions,
    min_accuracy: merged.min_accuracy,
    min_streak_days: merged.min_streak_days,
    min_completed_activities: merged.min_completed_activities,
    min_learning_minutes_monthly: merged.min_learning_minutes_monthly,
    subject: merged.subject,
    topic: merged.topic,
    grade_band: merged.grade_band,
  };
}
