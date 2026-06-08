# Learning Book Audio Infrastructure — Audit

**Date:** 2026-06-08 (updated)  
**Scope:** Pilots only — Hebrew G1 (complete) + Math G1 (second/final pilot)  
**Status:** Section-level architecture approved; pageId-level audio **rejected**. **Stop after Math G1** until books are final.

---

## Architecture decision (critical)

| Approach | Status | Reason |
|----------|--------|--------|
| **pageId-level** `page.mp3` (one file per topic) | **Rejected** | UI shows multiple visible internal pages per topic (`עמוד 1 מתוך 7`). Playing the whole topic from the start is incorrect. |
| **Section-level** `section-NN.mp3` (one file per visible internal page) | **Required** | Matches UI navigation. Child on page 2 hears only page 2 audio. |

Resolver inputs: `subject`, `grade`, `pageId`, `sectionNumber` (1-based, matches `section.number` / active section index + 1).

---

## 1. Learning book page definition

Learning books use a three-layer model:

| Layer | Role | Location |
|-------|------|----------|
| **Content** | Page copy (7 numbered sections + metadata table) | `docs/learning-book/{subject}/{grade}/drafts/{pageId}.md` |
| **Registry / catalog** | TOC, page order, routes, SSG loaders | `lib/learning-book/*-registry.js`, `learning-book-catalog.js` |
| **UI / routing** | Shell, markdown render, section swiper | `components/learning-book/`, `pages/learning/book/` |

Each **topic** (`pageId`) contains **7 visible internal pages** (sections). The audio player is wired per active section in `LearningPageBody.js`.

Hebrew Grade 1 is **authored** (`status: "authored"`) in `learning-book-catalog.js`:

- Index: `/learning/book/hebrew/g1`
- Page: `/learning/book/hebrew/g1/{pageId}` — section swiper shows `עמוד N מתוך 7`

---

## 2. Hebrew Grade 1 registration

| File | Purpose |
|------|---------|
| `lib/learning-book/hebrew-g1-registry.js` | 4 batches (a–d), `HEBREW_G1_PAGE_ORDER` (32 pages) |
| `lib/learning-book/learning-book-catalog.js` | Server catalog entry for `hebrew:g1` |
| `docs/learning-book/hebrew/g1/drafts/*.md` | 32 markdown draft files |

**Inventory:** 32 topics × 7 internal pages = **224 section audio files**.

---

## 3. Page ID / slug resolution

- **URL slug:** `{pageId}` from registry (e.g. `g1.letters`)
- **Canonical ID:** `hebrew:g1:{pageId}` in draft metadata
- **Section ID (stable):** `{pageId}:section:{NN}` where NN is zero-padded section number
- **Validation:** `isValidHebrewG1PageId(pageId)`

---

## 4. Hebrew Grade 1 page inventory (32 topics)

| Batch | Title (Hebrew) | Count |
|-------|----------------|-------|
| a | קריאה — צלילים, אותיות וניקוד | 10 |
| b | שפה — משפטים ודקדוק קל | 9 |
| c | הבנה, אוצר מילים וכתיבה | 11 |
| d | דיבור והבעה | 2 |

**Wiring:** `lib/learning-book/audio/learning-book-audio-manifest.js` — Hebrew G1 (32×7) + Math G1 (19×7).

### Math Grade 1 (pilot 2)

| File | Purpose |
|------|---------|
| `lib/learning-book/math-g1-registry.js` | 4 batches (a–d), `MATH_G1_PAGE_ORDER` (19 pages) |
| `docs/learning-book/math/g1/drafts/*.md` | 19 markdown draft files |
| `lib/learning-book/audio/prepare-math-book-audio-text.js` | Per-section spoken script + math→Hebrew TTS |

**Inventory:** 19 topics × 7 internal pages = **133 section audio files**.

Math TTS rules: `+`→ועוד, `-`→פחות, `=`→שווה, `<`/`>`→קטן מ/גדול מ, digits→Hebrew cardinals, `__`→מקום ריק.

---

## 5. Content source and spoken-script extraction

Parsed at build time by `parse-learning-page-markdown.js`:

```js
{
  pageId, displayTitle,
  sections: [{ number, title, body }]
}
```

**Text preparation** (`prepare-hebrew-book-audio-text.js`) runs **per section**, not per full topic:

- One `spokenScript` per visible internal page
- Excludes: book/topic/page titles, section nav titles (`מה לומדים?`, `הסבר`, …), hints, scaffolding labels, emojis, metadata
- Scaffolding labels (`שאלה:`, `שלב N:`, `תשובה:`) are unwrapped — content kept, label stripped
- Hyphen/maqaf normalized in spoken script only (`אלף־בית` → `אלף בית`); visible markdown unchanged

---

## 6. Audio player insertion point

**File:** `components/learning-book/LearningPageBody.js`

**Placement:** Inside `<article>`, below section header, above `<LearningMarkdown>`.

**Props to player:** `subject`, `grade`, `pageId`, `sectionNumber` (= `section.number`), `sectionIndex`.

**On internal page change (`עמוד הבא` / `עמוד קודם`):**

1. Stop current audio, reset `currentTime`
2. Clear stale `audio.src`, resolve new `section-NN.mp3`
3. Do not autoplay — child clicks `האזנה לעמוד` again
4. `<audio key={pageId:sectionNumber:playbackSrc}>` forces remount

---

## 7. File path structure

```
public/audio/learning-books/hebrew/g1/{pageId}/section-01.mp3
public/audio/learning-books/hebrew/g1/{pageId}/section-02.mp3
...
public/audio/learning-books/hebrew/g1/{pageId}/section-07.mp3
```

**Do not use** `page.mp3` as final narration for a whole topic. Legacy `page.mp3` files are deleted on generation.

Cache bust: `?v={LEARNING_BOOK_AUDIO_CACHE_VERSION}` on `playbackSrc`.

---

## 8. Existing Hebrew practice audio (separate system)

| Aspect | Practice audio | Learning-book audio |
|--------|----------------|---------------------|
| Content unit | Question stem | One visible internal page |
| Path | Hash-based `hebrew/gen/v1/{hash}.mp3` | `learning-books/hebrew/g1/{pageId}/section-NN.mp3` |
| Runtime TTS | Server ensure + browser fallback | **None** |
| UI | `HebrewAudioBuild1Panel` | `LearningBookAudioPlayer` |

**Reuse:** `node-edge-tts` / `he-IL-HilaNeural` in offline generation script only.

---

## 9. Systems explicitly out of scope

No changes to: diagnostics, rewards/coins, parent/teacher reports, practice flows, SQL/migrations, `LearningBookShell.js`, Hebrew G2–G6, English, Math, Geometry, Science, Moledet/Geography.

Visible markdown/book copy changes are out of scope for this audio pass (except approved player labels).

---

## 10. Acceptance criteria (Hebrew G1 full book)

1. Feature flags default **OFF**
2. All 32 topics × 7 sections wired in manifest (224 entries)
3. Resolver returns section-specific `src`; never full-topic `page.mp3`
4. Player stops/resets on section change; no stale audio
5. Generation report: one row per internal page with exact `spokenScript`
6. No runtime TTS in student UI
7. Missing audio / disabled flag → no player, no crash
