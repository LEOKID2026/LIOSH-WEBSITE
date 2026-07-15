import { subjectLabelHe } from "../platform-ui/hebrew-display-labels.js";
import { topicLabelHe } from "../teacher-portal/teacher-ui.he.js";
import { getTopicDisplayNameHe } from "../../utils/parent-report-insights/normalize-parent-facing-labels.js";

const UNMAPPED_FALLBACK_HE = "נושא ללא תווית";

function resolveTopicHe(subject, topicKey) {
  const topic = String(topicKey || "").trim();
  if (!topic) return null;

  const fromTeacher = topicLabelHe(subject, topic);
  if (fromTeacher) return fromTeacher;

  const fromParent = getTopicDisplayNameHe(subject, topic);
  if (fromParent) return fromParent;

  return null;
}

/**
 * User-facing Hebrew topic label for parent/student activity UI.
 * Never returns raw internal keys like "addition".
 *
 * @param {string|null|undefined} subject
 * @param {string|null|undefined} topicKey
 * @param {string|null|undefined} [subtopicKey]
 */
export function formatActivityTopicDisplayHe(subject, topicKey, subtopicKey) {
  const primary = resolveTopicHe(subject, topicKey);
  const sub = subtopicKey ? resolveTopicHe(subject, subtopicKey) : null;

  if (primary && sub && sub !== primary) {
    return `${primary} - ${sub}`;
  }
  if (primary) return primary;
  if (sub) return sub;
  return UNMAPPED_FALLBACK_HE;
}

/**
 * @param {string|null|undefined} subject
 * @param {string|null|undefined} topicKey
 * @param {string|null|undefined} [subtopicKey]
 */
export function formatActivitySubjectTopicLineHe(subject, topicKey, subtopicKey) {
  const subj = subjectLabelHe(subject);
  const topic = formatActivityTopicDisplayHe(subject, topicKey, subtopicKey);
  return `${subj} · ${topic}`;
}
