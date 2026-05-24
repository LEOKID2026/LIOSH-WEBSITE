/**
 * Resolve demo student ADMIN/1234 for student-login video capture.
 */
export function resolveStudentDemoAccount() {
  const raw = String(process.env.VIRTUAL_STUDENT_ACCOUNTS || "").trim();
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const match =
          arr.find((a) => String(a?.username || a?.code || "").trim().toUpperCase() === "ADMIN") ||
          arr[0];
        if (match) {
          const username = String(match.username || match.code || "ADMIN").trim();
          const pin = String(match.pin || "").replace(/\D/g, "").trim();
          if (username && pin.length === 4) return { username, pin };
        }
      }
    } catch {
      /* fall through */
    }
  }
  const username = String(process.env.E2E_STUDENT_USERNAME || "ADMIN").trim();
  const pin = String(process.env.E2E_STUDENT_PIN || "1234").replace(/\D/g, "").trim();
  return { username, pin };
}

export function expectedDemoStudentName() {
  return "ישראל ישראלי";
}
