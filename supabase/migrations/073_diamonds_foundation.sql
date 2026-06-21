-- Diamonds foundation: balances, ledger, idempotent RPC, admin settings.
-- FOR REVIEW ONLY — run manually after 072 and owner approval.
-- Separate from coins: does NOT alter student_coin_balances, coin_transactions, or arcade_coin_apply.
--
-- Rollback (manual):
--   drop trigger if exists trg_students_diamond_balance_created on public.students;
--   drop function if exists public.handle_student_diamond_balance_created();
--   drop function if exists public.diamond_apply(uuid, text, integer, text, text, text, jsonb, text);
--   drop table if exists public.diamond_transactions;
--   drop table if exists public.student_diamond_balances;
--   drop table if exists public.reward_economy_diamond_settings;

begin;

create table if not exists public.student_diamond_balances (
  student_id uuid primary key references public.students (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  lifetime_earned integer not null default 0 check (lifetime_earned >= 0),
  lifetime_spent integer not null default 0 check (lifetime_spent >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.student_diamond_balances is
  'Diamond balance per student. Separate ledger from student_coin_balances.';

create table if not exists public.diamond_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  direction text not null check (direction in ('earn', 'spend', 'adjust', 'reversal')),
  amount integer not null check (amount > 0),
  reason text not null check (char_length(reason) between 1 and 160),
  source_type text not null check (source_type in (
    'solo_game',
    'surprise_box',
    'admin_adjustment',
    'reversal'
  )),
  source_id text null check (source_id is null or char_length(source_id) <= 160),
  idempotency_key text null,
  metadata_json jsonb not null default '{}'::jsonb,
  balance_after integer not null check (balance_after >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists diamond_transactions_idempotency_uidx
  on public.diamond_transactions (student_id, idempotency_key)
  where idempotency_key is not null and length(trim(idempotency_key)) > 0;

create index if not exists diamond_transactions_student_created_idx
  on public.diamond_transactions (student_id, created_at desc);

create index if not exists diamond_transactions_source_idx
  on public.diamond_transactions (source_type, source_id);

comment on table public.diamond_transactions is
  'Immutable diamond ledger. Never writes to coin_transactions.';

create table if not exists public.reward_economy_diamond_settings (
  id uuid primary key default gen_random_uuid(),
  settings_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint reward_economy_diamond_settings_singleton_chk check (id = '00000000-0000-4000-8000-000000000001'::uuid)
);

comment on table public.reward_economy_diamond_settings is
  'Singleton diamond economy settings. Default daily_cap_mode=none (no daily cap enforced).';

insert into public.reward_economy_diamond_settings (id, settings_json)
values (
  '00000000-0000-4000-8000-000000000001'::uuid,
  '{
    "system_enabled": true,
    "daily_cap_mode": "none",
    "global_daily_cap": null,
    "solo_daily_cap": null,
    "surprise_box_daily_cap": null,
    "per_game_daily_cap": null
  }'::jsonb
)
on conflict (id) do nothing;

create or replace function public.handle_student_diamond_balance_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_diamond_balances (
    student_id,
    balance,
    lifetime_earned,
    lifetime_spent
  )
  values (new.id, 0, 0, 0)
  on conflict (student_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_student_diamond_balance_created() from public;
grant execute on function public.handle_student_diamond_balance_created() to service_role;

drop trigger if exists trg_students_diamond_balance_created on public.students;
create trigger trg_students_diamond_balance_created
after insert on public.students
for each row
execute function public.handle_student_diamond_balance_created();

insert into public.student_diamond_balances (
  student_id,
  balance,
  lifetime_earned,
  lifetime_spent
)
select
  s.id,
  0,
  0,
  0
from public.students s
left join public.student_diamond_balances b
  on b.student_id = s.id
where b.student_id is null;

create or replace function public.diamond_apply(
  p_student_id uuid,
  p_direction text,
  p_amount integer,
  p_idempotency_key text,
  p_source_type text,
  p_source_id text,
  p_metadata jsonb,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_existing_balance integer;
  v_balance integer;
  v_new_balance integer;
  v_tx_id uuid;
  v_amount integer := greatest(coalesce(p_amount, 0), 0);
  v_is_debit boolean := false;
begin
  if p_student_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing_student_id', 'code', 'bad_request');
  end if;

  if p_direction is null or p_direction not in ('earn', 'spend', 'adjust', 'reversal') then
    return jsonb_build_object('ok', false, 'error', 'invalid_direction', 'code', 'bad_request');
  end if;

  if v_amount <= 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_amount', 'code', 'bad_request');
  end if;

  if p_direction in ('spend', 'reversal') then
    v_is_debit := true;
  elsif p_direction = 'adjust' then
    v_is_debit := coalesce(p_metadata->>'adjust_kind', 'credit') = 'debit';
  end if;

  if p_idempotency_key is not null and length(trim(p_idempotency_key)) > 0 then
    select id into v_existing_id
    from public.diamond_transactions
    where student_id = p_student_id
      and idempotency_key = p_idempotency_key
    limit 1;

    if v_existing_id is not null then
      select balance into v_existing_balance
      from public.student_diamond_balances
      where student_id = p_student_id;

      return jsonb_build_object(
        'ok', true,
        'duplicate', true,
        'transaction_id', v_existing_id,
        'balance_after', coalesce(v_existing_balance, 0)
      );
    end if;
  end if;

  select balance into v_balance
  from public.student_diamond_balances
  where student_id = p_student_id
  for update;

  if v_balance is null then
    return jsonb_build_object('ok', false, 'error', 'balance_row_missing', 'code', 'not_found');
  end if;

  if v_is_debit then
    if v_balance < v_amount then
      return jsonb_build_object(
        'ok', false,
        'error', 'insufficient_diamonds',
        'code', 'insufficient_funds',
        'balance', v_balance
      );
    end if;
    v_new_balance := v_balance - v_amount;
  else
    v_new_balance := v_balance + v_amount;
  end if;

  update public.student_diamond_balances
  set
    balance = v_new_balance,
    lifetime_spent = case when v_is_debit then lifetime_spent + v_amount else lifetime_spent end,
    lifetime_earned = case when not v_is_debit then lifetime_earned + v_amount else lifetime_earned end,
    updated_at = now()
  where student_id = p_student_id;

  insert into public.diamond_transactions (
    student_id,
    direction,
    amount,
    reason,
    source_type,
    source_id,
    idempotency_key,
    metadata_json,
    balance_after
  )
  values (
    p_student_id,
    p_direction,
    v_amount,
    coalesce(nullif(trim(p_reason), ''), 'diamond'),
    coalesce(nullif(trim(p_source_type), ''), 'admin_adjustment'),
    nullif(trim(p_source_id), ''),
    nullif(trim(p_idempotency_key), ''),
    coalesce(p_metadata, '{}'::jsonb),
    v_new_balance
  )
  returning id into v_tx_id;

  return jsonb_build_object(
    'ok', true,
    'duplicate', false,
    'transaction_id', v_tx_id,
    'balance_after', v_new_balance
  );

exception
  when unique_violation then
    select id into v_existing_id
    from public.diamond_transactions
    where student_id = p_student_id
      and idempotency_key = nullif(trim(p_idempotency_key), '')
    limit 1;

    select balance into v_existing_balance
    from public.student_diamond_balances
    where student_id = p_student_id;

    return jsonb_build_object(
      'ok', true,
      'duplicate', true,
      'transaction_id', v_existing_id,
      'balance_after', coalesce(v_existing_balance, 0)
    );
end;
$$;

revoke all on function public.diamond_apply(uuid, text, integer, text, text, text, jsonb, text) from public;
grant execute on function public.diamond_apply(uuid, text, integer, text, text, text, jsonb, text) to service_role;

alter table public.student_diamond_balances enable row level security;
alter table public.diamond_transactions enable row level security;
alter table public.reward_economy_diamond_settings enable row level security;

drop policy if exists student_diamond_balances_parent_read_owned on public.student_diamond_balances;
create policy student_diamond_balances_parent_read_owned
on public.student_diamond_balances
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = student_diamond_balances.student_id
      and s.parent_id = auth.uid()
  )
);

drop policy if exists diamond_transactions_parent_read_owned on public.diamond_transactions;
create policy diamond_transactions_parent_read_owned
on public.diamond_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.students s
    where s.id = diamond_transactions.student_id
      and s.parent_id = auth.uid()
  )
);

commit;
