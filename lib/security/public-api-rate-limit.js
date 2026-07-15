import { rejectIfRateLimited } from "./in-memory-rate-limit.js";

const TEN_MIN = 10 * 60 * 1000;

/** B-HEBREW: expensive Dicta vocalization */
export function rejectIfHebrewNakdanRateLimited(req, res) {
  return rejectIfRateLimited(req, res, {
    namespace: "hebrew-nakdan",
    maxAttempts: 30,
    windowMs: TEN_MIN,
  });
}

/** B-HEBREW: Edge TTS generation */
export function rejectIfHebrewAudioEnsureRateLimited(req, res) {
  return rejectIfRateLimited(req, res, {
    namespace: "hebrew-audio-ensure",
    maxAttempts: 20,
    windowMs: TEN_MIN,
  });
}

/** B-HEBREW: MP3 stream by hash */
export function rejectIfHebrewAudioStreamRateLimited(req, res) {
  return rejectIfRateLimited(req, res, {
    namespace: "hebrew-audio-stream",
    maxAttempts: 120,
    windowMs: TEN_MIN,
  });
}

/** B-HEBREW: artifact upload queue */
export function rejectIfHebrewAudioArtifactRateLimited(req, res) {
  return rejectIfRateLimited(req, res, {
    namespace: "hebrew-audio-artifact",
    maxAttempts: 15,
    windowMs: TEN_MIN,
  });
}

/** B-GALLERY: public media listing */
export function rejectIfGalleryRateLimited(req, res) {
  return rejectIfRateLimited(req, res, {
    namespace: "gallery",
    maxAttempts: 120,
    windowMs: TEN_MIN,
  });
}

/**
 * B-COPILOT: IP bucket (call before auth).
 * @returns {boolean} true when rejected
 */
export function rejectIfCopilotIpRateLimited(req, res) {
  return rejectIfRateLimited(req, res, {
    namespace: "copilot-turn-ip",
    maxAttempts: 25,
    windowMs: TEN_MIN,
  });
}

/**
 * B-COPILOT: per-auth bucket after authorization.
 * @param {string} authBucketKey e.g. student_session:<uuid> or parent_bearer:<studentId>
 * @returns {boolean} true when rejected
 */
export function rejectIfCopilotAuthRateLimited(req, res, authBucketKey) {
  if (!authBucketKey) return false;
  return rejectIfRateLimited(req, res, {
    namespace: "copilot-turn-auth",
    maxAttempts: 12,
    windowMs: TEN_MIN,
    extraKeys: [`auth:${authBucketKey}`],
  });
}

/** Public worksheets: catalog listing */
export function rejectIfPublicWorksheetsCatalogRateLimited(req, res) {
  return rejectIfRateLimited(req, res, {
    namespace: "public-worksheets-catalog",
    maxAttempts: 120,
    windowMs: TEN_MIN,
  });
}

/** Public worksheets: ready slug fetch */
export function rejectIfPublicWorksheetsReadyRateLimited(req, res) {
  return rejectIfRateLimited(req, res, {
    namespace: "public-worksheets-ready",
    maxAttempts: 60,
    windowMs: TEN_MIN,
  });
}

/** Public worksheets: demo generate */
export function rejectIfPublicWorksheetsGenerateRateLimited(req, res) {
  return rejectIfRateLimited(req, res, {
    namespace: "public-worksheets-generate",
    maxAttempts: 15,
    windowMs: TEN_MIN,
  });
}

/** Public worksheets: answer key */
export function rejectIfPublicWorksheetsAnswerKeyRateLimited(req, res) {
  return rejectIfRateLimited(req, res, {
    namespace: "public-worksheets-answer-key",
    maxAttempts: 30,
    windowMs: TEN_MIN,
  });
}
