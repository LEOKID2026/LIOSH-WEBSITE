-- Phase 3 — Timing Truth: explicit raw and credited time columns on all activity attempt tables.
-- Owner must apply manually. Agent must NOT run this migration.
--
-- Rationale:
--   rawTimeSpentMs and creditedTimeMs are ALREADY stored inside the question_snapshot JSONB
--   column (added in Phase 3 code changes; no schema change was needed for that path).
--   These explicit columns are added for query clarity and efficient aggregation:
--     - raw_time_spent_ms: actual elapsed wall time, never capped
--     - credited_time_ms:  policy-capped time used for coins / reports / progress
--     - timing_status:     enum string (see CHECK below)
--
-- Safe to run repeatedly: all DDL uses IF NOT EXISTS / IF EXISTS guards.
--
-- classroom_activity_attempts may not exist in all environments (pre-classroom-feature
-- deployments). The ALTER TABLE for that table is wrapped in a DO block that skips
-- gracefully if the table is absent.
--
-- Existing rows:
--   time_spent_ms=5000 rows are legacy_fabricated_timing (see backfill script).
--   raw_time_spent_ms and credited_time_ms will be null for all pre-Phase-3 rows.

begin;

-- ---------------------------------------------------------------------------
-- 1. student_activity_attempts  (always present)
-- ---------------------------------------------------------------------------

alter table public.student_activity_attempts
  add column if not exists raw_time_spent_ms  integer null,
  add column if not exists credited_time_ms   integer null,
  add column if not exists timing_status      text    null
    check (timing_status is null or timing_status in (
      'normal', 'long', 'very_long', 'over_credit_cap',
      'no_timer', 'hidden_tab', 'idle_suspected'
    ));

comment on column public.student_activity_attempts.raw_time_spent_ms is
  'Phase 3: actual elapsed wall time in milliseconds, never capped or replaced.';
comment on column public.student_activity_attempts.credited_time_ms is
  'Phase 3: policy-capped time in milliseconds used for coins, reports, and progress.';
comment on column public.student_activity_attempts.timing_status is
  'Phase 3: normal | long | very_long | over_credit_cap | no_timer | hidden_tab | idle_suspected';

-- ---------------------------------------------------------------------------
-- 2. classroom_activity_attempts  (may not exist in all environments)
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.classroom_activity_attempts') is not null then

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = 'classroom_activity_attempts'
        and column_name  = 'raw_time_spent_ms'
    ) then
      alter table public.classroom_activity_attempts
        add column raw_time_spent_ms integer null;
      comment on column public.classroom_activity_attempts.raw_time_spent_ms is
        'Phase 3: actual elapsed wall time in milliseconds, never capped or replaced.';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = 'classroom_activity_attempts'
        and column_name  = 'credited_time_ms'
    ) then
      alter table public.classroom_activity_attempts
        add column credited_time_ms integer null;
      comment on column public.classroom_activity_attempts.credited_time_ms is
        'Phase 3: policy-capped time in milliseconds used for coins, reports, and progress.';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = 'classroom_activity_attempts'
        and column_name  = 'timing_status'
    ) then
      alter table public.classroom_activity_attempts
        add column timing_status text null
          check (timing_status is null or timing_status in (
            'normal', 'long', 'very_long', 'over_credit_cap',
            'no_timer', 'hidden_tab', 'idle_suspected'
          ));
      comment on column public.classroom_activity_attempts.timing_status is
        'Phase 3: normal | long | very_long | over_credit_cap | no_timer | hidden_tab | idle_suspected';
    end if;

  else
    raise notice 'classroom_activity_attempts does not exist — skipping Phase 3 timing columns for that table.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. parent_activity_attempts  (always present when parent activities enabled)
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.parent_activity_attempts') is not null then

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = 'parent_activity_attempts'
        and column_name  = 'raw_time_spent_ms'
    ) then
      alter table public.parent_activity_attempts
        add column raw_time_spent_ms integer null;
      comment on column public.parent_activity_attempts.raw_time_spent_ms is
        'Phase 3: actual elapsed wall time in milliseconds, never capped or replaced.';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = 'parent_activity_attempts'
        and column_name  = 'credited_time_ms'
    ) then
      alter table public.parent_activity_attempts
        add column credited_time_ms integer null;
      comment on column public.parent_activity_attempts.credited_time_ms is
        'Phase 3: policy-capped time in milliseconds used for coins, reports, and progress.';
    end if;

    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name   = 'parent_activity_attempts'
        and column_name  = 'timing_status'
    ) then
      alter table public.parent_activity_attempts
        add column timing_status text null
          check (timing_status is null or timing_status in (
            'normal', 'long', 'very_long', 'over_credit_cap',
            'no_timer', 'hidden_tab', 'idle_suspected'
          ));
      comment on column public.parent_activity_attempts.timing_status is
        'Phase 3: normal | long | very_long | over_credit_cap | no_timer | hidden_tab | idle_suspected';
    end if;

  else
    raise notice 'parent_activity_attempts does not exist — skipping Phase 3 timing columns for that table.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Indexes for aggregation queries (skipped gracefully if table absent)
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.student_activity_attempts') is not null then
    execute $idx$
      create index if not exists idx_student_activity_attempts_timing_status
        on public.student_activity_attempts (timing_status)
        where timing_status is not null
    $idx$;
  end if;

  if to_regclass('public.classroom_activity_attempts') is not null then
    execute $idx$
      create index if not exists idx_classroom_activity_attempts_timing_status
        on public.classroom_activity_attempts (timing_status)
        where timing_status is not null
    $idx$;
  end if;

  if to_regclass('public.parent_activity_attempts') is not null then
    execute $idx$
      create index if not exists idx_parent_activity_attempts_timing_status
        on public.parent_activity_attempts (timing_status)
        where timing_status is not null
    $idx$;
  end if;
end;
$$;

commit;
