# Grade 1 Hebrew Learning Book — Drafts

**Book:** ספר עברית — כיתה א׳  
**Subject key:** `hebrew` (child-facing: עברית)  
**Pages:** 32 (one per `skills.json` Grade 1 Hebrew row)  
**Status:** All drafts `approval_status: draft`

## Structure

Each file has:

1. Metadata table (`learning_page_id`, `skill_id`, `approval_status: draft`, …)
2. Seven child-facing sections (Hebrew):
   - מה לומדים?
   - הסבר
   - דוגמה
   - בואו נפתור
   - נסו בעצמכם
   - שימו לב!
   - בואו נתרגל!

## Regenerate / verify

```bash
node scripts/write-hebrew-g1-draft-files.mjs
node scripts/verify-hebrew-g1-book-content.mjs
node scripts/build-hebrew-g1-hebrew-review-pack.mjs
```

## Plan

See `docs/learning-book/HEBREW_GRADE_1_LEARNING_BOOK_PLAN.md`.

**Not in this folder:** runtime registry, routes, practice mappings, SQL.
