# Geometry Assigned-Activity Diagram Support — Implementation Plan

**Status:** Plan only — do not implement without approval  
**Related audit:** `docs/qa/ASSIGNED_ACTIVITY_TOPIC_AVAILABILITY_AUDIT.md`  
**Product decision:** Do **not** hide `parallel_perpendicular`, `diagonal`, `symmetry`, `heights`, `tiling` — fix diagram support instead.

---

## 1. Root cause

Assigned geometry activities require every frozen question to pass `frozenGeometryItemHasDiagram()` in `lib/classroom-activities/generate-activity-questions-client.js`. That function calls `getGeometryDiagramSpec()` from `utils/geometry-diagram-spec.js`.

The geometry **question generator** (`utils/geometry-question-generator.js`) produces valid MCQ items for these topics with `params.kind` values such as:

| Topic | Example `params.kind` values |
|-------|------------------------------|
| `parallel_perpendicular` | `parallel_perpendicular`, `concept_lines` |
| `diagonal` | `diagonal_square`, `diagonal_rectangle`, `diagonal_parallelogram` |
| `symmetry` | `symmetry`, `concept_symmetry` |
| `heights` | `heights_triangle`, `heights_parallelogram`, `heights_trapezoid` |
| `tiling` | `tiling`, `concept_tiling` |

**`getGeometryDiagramSpec()` has no branches for these topics.** It returns `null` → assigned generation rejects 100% of samples → parent/teacher preview fails even though learning master works.

This is a **diagram/rendering-gap**, not missing curriculum or thin banks.

### Affected grade/topic pairs (8)

| Grade | Topic |
|-------|-------|
| g3 | `parallel_perpendicular` |
| g4 | `parallel_perpendicular`, `diagonal`, `symmetry` |
| g5 | `parallel_perpendicular`, `diagonal`, `heights`, `tiling` |

---

## 2. Files involved

| Layer | File | Role |
|-------|------|------|
| Assigned gate | `lib/classroom-activities/generate-activity-questions-client.js` | `frozenGeometryItemHasDiagram`, `DIAGRAM_OPTIONAL_KINDS`, geometry generation loop |
| Diagram spec (runtime) | `utils/geometry-diagram-spec.js` | **`getGeometryDiagramSpec`** — primary fix target |
| Diagram layout | `utils/geometry-diagram-layout.js` | Template resolution for shapes |
| Generator | `utils/geometry-question-generator.js` | Emits `params.kind` / numeric fields per topic |
| Learning master | `pages/learning/geometry-master.js` | Uses same `getGeometryDiagramSpec` for explanation modal (may also lack diagrams today) |
| Learning book map | `lib/learning-book/geometry-diagram-page-map.js` | **Authoritative book diagram types** (`parallel_lines`, etc.) — reference for spec design |
| Book renderer | `components/learning-book/GeometryDiagram.js` | SVG for book pages |
| Assigned display | `components/classroom-activities/AssignedActivityQuestionDisplay.jsx` | Renders frozen questions to child/parent/teacher |
| Student play | `pages/student/activity/[activityId].js` | Child MCQ + feedback |
| Tests | `tests/classroom-activities/generate-math-activity-questions.test.mjs` (pattern) | Add geometry diagram matrix test |

---

## 3. How learning master/book diagrams differ from assigned activities

### Learning book

- Diagram type comes from **`GEOMETRY_PAGE_DIAGRAM_BY_GRADE`** in `geometry-diagram-page-map.js` (page-id keyed, e.g. `parallel_perpendicular` → `parallel_lines`).
- Rendered by **`GeometryDiagram.js`** from markdown frontmatter / page map — **independent** of `getGeometryDiagramSpec()`.
- Book pages can show diagrams even when runtime spec is missing.

### Learning master

- Uses **`getGeometryDiagramSpec()`** for the explanation modal diagram (same function as assigned activities).
- MCQ play can proceed **without** a diagram; explanation modal may simply omit the figure.
- No hard gate — questions appear even when spec is null.

### Assigned activities (frozen)

- **Hard gate:** `frozenGeometryItemHasDiagram()` must pass before a question is included in the frozen set.
- Questions are **snapshotted** at assign time; child sees the same stem + choices + diagram metadata in `params`.
- Preview (parent modal, teacher create page), child play, and teacher answer review all use the frozen payload.
- **`DIAGRAM_OPTIONAL_KINDS`** allows text-only for `transformations`, `rotation`, `solids`, etc. — the failing topics are **not** in this set.

**Gap summary:** Book has diagram definitions; generator produces questions; **`geometry-diagram-spec.js` was never extended** for concept/visual topics when the assigned-activity diagram gate was added.

---

## 4. Proposed fix — support topics safely in frozen assigned activities

### Phase A — Extend `getGeometryDiagramSpec()` (preferred)

Add topic/kind branches mirroring book diagram types where safe:

| Topic / kind | Proposed spec `kind` | Source reference |
|--------------|---------------------|------------------|
| `parallel_perpendicular` | `parallel_lines` | `geometry-diagram-page-map.js` g3–g5 |
| `diagonal_*` | `diagonal` with shape template | book pages `diagonal_square`, etc. |
| `symmetry` | `symmetry_axis` or shape mirror spec | book g4 `symmetry` |
| `heights_*` | height on triangle / parallelogram / trapezoid | book g5 height pages |
| `tiling` | `tiling_grid` | book g5 `tiling` |

Requirements per branch:

1. Read numeric/shape fields already emitted by generator (`params.kind`, sides, labels).
2. Return a spec object compatible with existing SVG renderer used in assigned + master flows.
3. If generator lacks numeric params for a kind, either:
   - extend generator to emit minimal diagram params, **or**
   - add kind to `DIAGRAM_OPTIONAL_KINDS` **only** when stem is fully self-contained (avoid for core visual topics — product wants diagrams).

### Phase B — Assigned-activity renderer parity

Verify `AssignedActivityQuestionDisplay` / geometry diagram component used in student activity can render new spec kinds (may need to reuse or extract logic from `GeometryDiagram.js`).

### Phase C — Frozen item shape

Ensure `frozenGeometryItemFromGenerated()` preserves all fields `getGeometryDiagramSpec` needs (`topic`, `shape`, `params`).

### Phase D — Do NOT

- Remove the diagram gate globally (product requires visual fidelity for geometry activities).
- Add unrelated fallback questions.
- Hide failing topics from selectors.

### Optional interim (not recommended as final)

- Lower assigned default difficulty for geometry only — **does not fix** these topics (they fail at all difficulties).

---

## 5. QA plan

### Automated

- New test file: `tests/classroom-activities/generate-geometry-activity-questions.test.mjs`
  - For each of 8 grade/topic pairs × easy/medium/hard × count=5:
    - `generateActivityQuestionSetClient` succeeds
    - Every item passes `frozenGeometryItemHasDiagram` equivalent
    - `getGeometryDiagramSpec(item)` returns non-null `kind`
    - Stored `topic` matches selected topic (no fallback)
- Extend audit script spot-check for diagram coverage % > 0.

### Manual — surfaces

| Surface | Desktop | Mobile |
|---------|---------|--------|
| Parent assign modal preview | ✓ | ✓ |
| Teacher class activity create preview | ✓ | ✓ |
| Teacher private student activity create | ✓ | ✓ |
| Child activity play (MCQ + diagram if shown) | ✓ | ✓ |
| Teacher student answers modal / review | ✓ | — |
| RTL Hebrew stems with diagram labels | ✓ | ✓ |

### Per-topic checklist

- [ ] Question generates at easy, medium, hard
- [ ] Diagram visible where expected (not blank box)
- [ ] Correct answer unchanged by diagram addition
- [ ] Frozen replay: refresh child page — same diagram
- [ ] No regression on already-supported geometry topics (area, perimeter, triangles, …)

---

## 6. Effort estimate

| Phase | Estimate |
|-------|----------|
| Spec branches + generator param audit | 1–2 days |
| Renderer wiring for assigned activity | 0.5–1 day |
| Tests + manual QA | 0.5–1 day |

**Total:** ~2–4 days depending on SVG reuse from learning book.

---

## 7. Approval checklist

- [ ] Product confirms diagram types per topic match book/curriculum intent  
- [ ] Engineering approves extending `getGeometryDiagramSpec` vs shared book renderer  
- [ ] QA sign-off on 8 pairs before merge  
