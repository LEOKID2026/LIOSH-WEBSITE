-- 032_school_messaging.sql
-- School messaging: parents (guardian access + optional auth parent) and teachers.
-- Owner applies manually in Supabase SQL editor. Agent does not execute.
--
-- ACCESS MODEL (service role only):
--   RLS is enabled with NO policies for authenticated/anon → default deny.
--   All reads/writes go through Next.js API routes using the teacher portal
--   service role (lib/school-server/school-messaging.server.js). Browser clients
--   never call supabase.from('school_messages'|...) directly.

BEGIN;

CREATE TABLE IF NOT EXISTS public.school_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid        NOT NULL
                                REFERENCES public.school_accounts(id) ON DELETE CASCADE,
  author_id       uuid        NOT NULL
                                REFERENCES public.teacher_profiles(id) ON DELETE RESTRICT,
  audience_type   text        NOT NULL
    CHECK (audience_type IN (
      'all_parents',
      'grade_parents',
      'class_parents',
      'specific_parent',
      'all_teachers',
      'grade_teachers',
      'subject_teachers',
      'class_teachers',
      'specific_teacher',
      'homeroom_class_parents',
      'homeroom_student_parent'
    )),
  audience_scope  jsonb       NOT NULL DEFAULT '{}',
  message_type    text        NOT NULL DEFAULT 'regular'
    CHECK (message_type IN (
      'regular',
      'important',
      'urgent',
      'requires_confirmation',
      'requires_response',
      'pinned',
      'archived'
    )),
  subject         text        NULL
    CHECK (subject IS NULL OR char_length(trim(subject)) BETWEEN 1 AND 200),
  body            text        NOT NULL
    CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  has_attachment  boolean     NOT NULL DEFAULT false,
  attachment_url  text        NULL
    CHECK (attachment_url IS NULL OR char_length(attachment_url) <= 2000),
  is_hidden       boolean     NOT NULL DEFAULT false,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS school_messages_school_sent_idx
  ON public.school_messages (school_id, sent_at DESC)
  WHERE is_hidden = false;

CREATE INDEX IF NOT EXISTS school_messages_author_idx
  ON public.school_messages (author_id, sent_at DESC);

ALTER TABLE public.school_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.school_message_recipients (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid        NOT NULL
                                REFERENCES public.school_messages(id) ON DELETE CASCADE,
  recipient_user_id uuid      NULL,
  guardian_access_id uuid     NULL
                                REFERENCES public.student_guardian_access(id) ON DELETE CASCADE,
  recipient_type  text        NOT NULL
    CHECK (recipient_type IN ('parent', 'teacher')),
  recipient_display_name text NULL,
  student_id      uuid        NULL
                                REFERENCES public.students(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_message_recipients_target_chk CHECK (
    (recipient_type = 'teacher' AND recipient_user_id IS NOT NULL AND guardian_access_id IS NULL)
    OR (
      recipient_type = 'parent'
      AND (
        (recipient_user_id IS NOT NULL AND guardian_access_id IS NULL)
        OR (recipient_user_id IS NULL AND guardian_access_id IS NOT NULL)
      )
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS school_message_recipients_msg_user_uq
  ON public.school_message_recipients (message_id, recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS school_message_recipients_msg_guardian_uq
  ON public.school_message_recipients (message_id, guardian_access_id)
  WHERE guardian_access_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS school_message_recipients_user_msg_idx
  ON public.school_message_recipients (recipient_user_id, message_id)
  WHERE recipient_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS school_message_recipients_guardian_msg_idx
  ON public.school_message_recipients (guardian_access_id, message_id)
  WHERE guardian_access_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS school_message_recipients_msg_idx
  ON public.school_message_recipients (message_id);

ALTER TABLE public.school_message_recipients ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.school_message_read_receipts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      uuid        NOT NULL
                                REFERENCES public.school_messages(id) ON DELETE CASCADE,
  recipient_user_id uuid      NULL,
  guardian_access_id uuid     NULL
                                REFERENCES public.student_guardian_access(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_message_read_receipts_target_chk CHECK (
    (recipient_user_id IS NOT NULL AND guardian_access_id IS NULL)
    OR (recipient_user_id IS NULL AND guardian_access_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS school_message_read_receipts_user_uq
  ON public.school_message_read_receipts (message_id, recipient_user_id)
  WHERE recipient_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS school_message_read_receipts_guardian_uq
  ON public.school_message_read_receipts (message_id, guardian_access_id)
  WHERE guardian_access_id IS NOT NULL;

ALTER TABLE public.school_message_read_receipts ENABLE ROW LEVEL SECURITY;

COMMIT;
