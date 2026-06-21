-- Pre-baked reward card image variants (thumb / display / download).

alter table public.reward_cards
  drop constraint if exists reward_cards_image_url_check;

alter table public.reward_cards
  add constraint reward_cards_image_url_check
  check (image_url is null or char_length(image_url) <= 2048);

alter table public.reward_cards
  add column if not exists image_thumb_url text null,
  add column if not exists image_thumb_asset_key text null,
  add column if not exists image_display_url text null,
  add column if not exists image_display_asset_key text null,
  add column if not exists image_download_url text null,
  add column if not exists image_download_asset_key text null,
  add column if not exists image_original_asset_key text null,
  add column if not exists image_variants_version integer not null default 0;

comment on column public.reward_cards.image_thumb_url is 'Pre-baked thumb WebP for grids (shop/collection/series).';
comment on column public.reward_cards.image_display_url is 'Pre-baked display WebP for enlarged modal view.';
comment on column public.reward_cards.image_download_url is 'Pre-baked download PNG (trim + rounded corners, no watermark).';
comment on column public.reward_cards.image_variants_version is 'Bumped when variants regenerate — cache-bust query ?v=';
