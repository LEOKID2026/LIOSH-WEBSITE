# School Portal — Phase 4 Optional Features Plan

Based on Phase 2–3 delivery (2026-05-27). Enable after usage data from messaging and account management.

## Candidates (priority order)

1. **Scheduled messages** — `scheduled_at` on `school_messages`, cron/edge job to fan-out at send time.
2. **Parent reply threads** — opt-in `school_message_replies` table; manager moderation queue.
3. **Push / email / SMS notifications** — webhook to existing notification provider; respect owner decision (portal-only until approved).
4. **Bulk credential export** — CSV/PDF export for class roster with one-time PINs (encrypted download, audit logged).
5. **School secretary UI** — `school_secretary` role already in CHECK constraint; build UI on top of `requireSchoolStaffApiContext`.
6. **File attachments** — storage bucket + virus scan; keep URL-only fallback.
7. **Student messaging** — separate product decision; not in Phase 1–3 scope.

## Metrics to collect before building

- % of schools using grade/class targeting vs all_parents/all_teachers only
- Average read rate at 24h / 72h (parent vs teacher)
- Count of `must_change_pin` completions vs revocations
- Homeroom teacher send volume vs manager send volume

## Acceptance gates

- Each feature needs owner-approved Hebrew copy delta (Section 16.2 addendum).
- No regression to private teacher/parent flows.
- Migrations remain owner-applied in Supabase SQL editor.
