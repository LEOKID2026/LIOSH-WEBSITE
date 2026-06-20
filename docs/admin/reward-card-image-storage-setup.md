# Supabase Storage — reward card images (Admin upload)

Manual setup in **Supabase Dashboard** (no SQL migration required).

## 1. Create bucket

| Setting | Value |
|---------|--------|
| **Name** | `reward-cards` |
| **Public bucket** | **Yes** — card images are public assets (same as `/public/rewards/cards/`) |
| **File size limit** | 8 MB (optional; API also validates) |
| **Allowed MIME types** | `image/webp`, `image/png`, `image/jpeg` (optional) |

## 2. Storage policies

Use **Policies** on bucket `reward-cards`.

### Policy A — public read (required)

Allows browsers and the student app to load images via public URL.

- **Policy name:** `reward_cards_public_read`
- **Allowed operation:** `SELECT` (read)
- **Target roles:** `public` (anonymous) **or** `authenticated` — for a public bucket, enable **public read** in bucket settings; if using RLS policies instead:

```sql
create policy "reward_cards_public_read"
on storage.objects for select
to public
using ( bucket_id = 'reward-cards' );
```

### Policy B — service role upload (automatic)

The Admin API uses **service role** (`LEARNING_SUPABASE_SERVICE_ROLE_KEY`), which **bypasses RLS**.  
You do **not** need an insert policy for admin uploads if the API always uses service role.

Optional (only if you later upload from client with user JWT):

```sql
create policy "reward_cards_admin_write"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'reward-cards'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
```

## 3. What you must do manually

1. Create bucket `reward-cards` as **public**.
2. Confirm **public read** works (open a test object URL in browser after first upload).
3. No DB migration.
4. No migration of existing `/public/rewards/cards/` files.

## 4. Storage path layout (automatic)

| Card type | Path |
|-----------|------|
| shop | `shop/{series_slug}/{card_key}.webp` |
| achievement | `achievements/{series_slug}/{card_key}.webp` |
| event | `events/{card_key}.webp` |

## 5. Hybrid behavior

- Legacy cards keep `image_url` like `/rewards/cards/shop/...` → served from `public/`.
- Admin uploads set `image_url` to full Supabase public URL + `image_asset_key` = storage path.
