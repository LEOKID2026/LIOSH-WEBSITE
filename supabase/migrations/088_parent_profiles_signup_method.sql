-- Track how a parent account was created (email signup vs Google OAuth).
alter table public.parent_profiles
  add column if not exists signup_method text
  check (signup_method is null or signup_method in ('email', 'google'));

comment on column public.parent_profiles.signup_method is
  'How the parent account was first created: email (password signup) or google (OAuth).';
