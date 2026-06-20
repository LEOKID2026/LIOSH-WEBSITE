-- Manual duplicate sellback (shop) — replaces bulk 10-duplicate conversion UX.

insert into public.reward_card_settings (setting_key, setting_value_json)
values ('duplicate_sellback_percent', '25'::jsonb)
on conflict (setting_key) do nothing;

alter table public.reward_card_transactions
  drop constraint if exists reward_card_transactions_transaction_type_check;

alter table public.reward_card_transactions
  add constraint reward_card_transactions_transaction_type_check
  check (
    transaction_type in (
      'earned_achievement',
      'shop_purchase',
      'surprise_box_reward',
      'duplicate_conversion',
      'card_sellback',
      'admin_grant'
    )
  );
