---
name: Learning Book Audio Infra
overview: Section-level pre-generated audio. Pilots only — Hebrew G1 (complete) + Math G1 (complete). Stop after Math G1 until books final + owner approves.
todos:
  - id: hebrew-g1
    content: Hebrew G1 section audio (32×7 = 224 MP3s)
    status: completed
  - id: math-g1
    content: Math G1 section audio (19×7 = 133 MP3s) + math TTS prep
    status: completed
  - id: manual-review
    content: Owner manual review — both pilots only
    status: pending
isProject: false
---

# Learning Book Audio — Pilots Only (Hebrew G1 + Math G1)

## Stopped — no broader rollout

After Math G1 manual review, **stop**. No Math G2+, Hebrew G2+, or other subjects until learning books are final.

## Architecture (both pilots)

- Section-level `section-NN.mp3` — **no** `page.mp3`
- Resolver: `subject + grade + pageId + sectionNumber`
- Player: stop/reset on section change, no autoplay

## Math G1 specifics

- `prepare-math-book-audio-text.js` — equations → spoken Hebrew
- Registry: `math-g1-registry.js` — 19 topics, 7 sections each
- Report: `reports/learning-book-audio/math-g1-full-section-audio-report.json`
