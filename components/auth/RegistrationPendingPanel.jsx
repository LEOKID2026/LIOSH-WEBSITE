import {
  PENDING_REJECTED_BODY,
  PENDING_REJECTED_HEADING,
  PENDING_SCHOOL_BODY,
  PENDING_SCHOOL_HEADING,
  PENDING_TEACHER_BODY,
  PENDING_TEACHER_HEADING,
} from "../../lib/auth/auth-registration.he.js";

/**
 * @param {{ variant: "teacher"|"school", rejected?: boolean }} props
 */
export default function RegistrationPendingPanel({ variant, rejected = false }) {
  const heading = rejected
    ? PENDING_REJECTED_HEADING
    : variant === "school"
      ? PENDING_SCHOOL_HEADING
      : PENDING_TEACHER_HEADING;
  const body = rejected
    ? PENDING_REJECTED_BODY
    : variant === "school"
      ? PENDING_SCHOOL_BODY
      : PENDING_TEACHER_BODY;

  return (
    <div
      className="max-w-lg space-y-3 text-right"
      data-testid={`${variant}-registration-pending`}
      data-state={rejected ? "rejected" : "pending"}
      dir="rtl"
      lang="he"
    >
      <h2 className="text-xl font-bold">{heading}</h2>
      <p className="text-white/70 text-sm leading-relaxed">{body}</p>
    </div>
  );
}
