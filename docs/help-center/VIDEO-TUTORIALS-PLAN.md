# Help Center — Video Tutorials Phase

## Scope

- 42 Help Center articles × 2 viewports (desktop + mobile) = **84 WebM** + **84 posters** (when fully captured)
- WebM only; **MP4 / ffmpeg deferred** until a future plan update
- Demo identity: student `ADMIN` / PIN `1234`, visible child `ישראל ישראלי`
- Capture: `localhost`, `127.0.0.1`, or `*.vercel.app` preview only

## Asset kinds

| `assetKind` | UI (`videoBlock`) | `public/` | `internalReview` |
|-------------|-------------------|-----------|------------------|
| `placeholder` | **hidden** | must be absent | must **not** be `passed` |
| `captured` | shown when files exist | required after publish | may be `passed` after real review |

`help:placeholders-videos` writes **audit-only** scaffold from `/help` hub templates. It is **not** a substitute for `help:capture-videos` and must **never** be published to `public/`.

## Pipeline (real capture — future)

```bash
npm run dev
npm run help:build-video-manifest
npm run help:capture-videos -- --base-url=http://127.0.0.1:3001
npm run help:video-data-safety-review
npm run help:publish-videos
npm run help:verify-videos
npm run build
```

Chained: `npm run help:videos` (capture → review → publish → verify).

## Verification gates

`help:verify-videos` fails when:

- Placeholder manifest entries have files under `public/`
- All desktop or mobile published clips share one checksum (global duplicate)
- Multiple captured clips share a checksum (unless whitelisted)
- Published bytes match `help:placeholders-videos` template/provenance hashes
- Placeholder entries have `internalReview.status === "passed"`

## Data

- Manifest: `data/help-center/videos-manifest.json`
- Raw: `qa-evidence-audit/help-center/videos/` (git-ignored)
- Published: `public/help-center/videos/` (**captured assets only**)

## UI

- `videoBlock(section, slug)` — dormant unless `assetKind === "captured"`
- `HelpVideoEmbed` — lazy-mount, no autoplay, dual viewport
