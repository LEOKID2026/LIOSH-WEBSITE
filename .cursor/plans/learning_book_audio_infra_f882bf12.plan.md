---
name: Learning Book Audio Infra
overview: Section-level pre-generated audio for learning books. pageId-level page.mp3 rejected. Hebrew Grade 1 full book (32 topics × 7 internal pages = 224 MP3s). No runtime TTS in student UI.
todos:
  - id: audit-doc
    content: Update LEARNING_BOOK_AUDIO_INFRA_AUDIT.md (section-level architecture)
    status: completed
  - id: rollout-doc
    content: Update LEARNING_BOOK_AUDIO_FULL_ROLLOUT_PLAN.md (Hebrew G1 full book)
    status: completed
  - id: feature-flags
    content: NEXT_PUBLIC_LEARNING_BOOK_AUDIO_ENABLED + LEARNING_BOOK_AUDIO_ENABLED in .env.example
    status: completed
  - id: manifest
    content: Section-level manifest for all 32 Hebrew G1 topics (224 entries)
    status: completed
  - id: resolver
    content: resolveLearningBookAudio(subject, grade, pageId, sectionNumber)
    status: completed
  - id: text-prep
    content: Per-section spokenScript in prepare-hebrew-book-audio-text.js
    status: completed
  - id: player
    content: LearningBookAudioPlayer — stop/reset on section change
    status: completed
  - id: wire-player
    content: LearningPageBody passes sectionNumber + sectionIndex
    status: completed
  - id: gen-script
    content: generate-learning-book-audio.mjs — full Hebrew G1 + master report
    status: completed
  - id: qa-script
    content: verify-learning-book-audio.mjs — full Hebrew G1 checks
    status: completed
  - id: generate-mp3s
    content: Generate 224 section MP3s for Hebrew G1
    status: in_progress
  - id: run-qa-build
    content: Tests, verify, npm run build, final report
    status: pending
isProject: false
---

# Learning Book Audio — Section-Level Plan

## Architecture correction (approved)

| Rejected | Required |
|----------|----------|
| `public/audio/learning-books/hebrew/g1/{pageId}/page.mp3` | `public/audio/learning-books/hebrew/g1/{pageId}/section-NN.mp3` |
| One audio per topic | One audio per visible internal page (`עמוד N מתוך 7`) |
| Full-topic spokenScript | Per-section spokenScript only |

Resolver: `subject + grade + pageId + sectionNumber` (1-based).

Player on section change: stop, reset `currentTime`, new `src`, no autoplay, remount via `key`.

## Hebrew G1 scope (approved)

- **32 topics** from `HEBREW_G1_PAGE_ORDER`
- **7 sections** per topic (all pages confirmed)
- **224 MP3 files** total
- **Not in scope:** Hebrew G2–G6, English, Math, Geometry, Science, Moledet/Geography

## Key files

| File | Role |
|------|------|
| `lib/learning-book/audio/learning-book-audio-manifest.js` | 224 manifest entries |
| `lib/learning-book/audio/resolve-learning-book-audio.js` | Section resolver |
| `lib/learning-book/audio/prepare-hebrew-book-audio-text.js` | Per-section text prep |
| `components/learning-book/LearningBookAudioPlayer.jsx` | Section-aware player |
| `components/learning-book/LearningPageBody.js` | Wires `sectionNumber` |
| `scripts/generate-learning-book-audio.mjs` | Offline TTS generation |
| `scripts/verify-learning-book-audio.mjs` | Full-book QA |
| `tests/learning/learning-book-audio.test.mjs` | Unit tests |

## Implementation order

1. ~~Update docs (audit + rollout + this plan)~~
2. ~~Expand manifest/resolver from g1.letters pilot to full Hebrew G1~~
3. ~~Verify g1.letters section isolation~~
4. Generate all 224 section MP3s
5. Run tests + verify + build
6. Owner manual review

## Out of scope

Visible markdown changes, diagnostics, rewards, practice audio, SQL, registries, shell, other subjects/grades.
