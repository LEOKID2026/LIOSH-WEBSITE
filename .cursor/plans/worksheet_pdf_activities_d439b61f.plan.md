---
name: Worksheet PDF Activities
overview: Design and plan a new standalone "Worksheet PDF Activity" (דף עבודה) feature for teachers and students, completely isolated from the existing automatic classroom activity system. Full plan document written to docs/teacher-portal/WORKSHEET_PDF_ACTIVITIES_PLAN.md — no code has been changed.
todos:
  - id: owner-review-plan
    content: Owner reviews and approves WORKSHEET_PDF_ACTIVITIES_PLAN.md before any coding
    status: completed
  - id: owner-approve-hebrew
    content: Owner approves proposed Hebrew UI copy list (Section 14 of plan)
    status: completed
  - id: owner-answer-oqs
    content: Owner answers 13 open questions in Section 16 of plan
    status: completed
  - id: create-migration-029
    content: Write supabase/migrations/029_worksheet_activities.sql (SQL text ready in plan, owner applies manually)
    status: completed
  - id: phase1-lib
    content: "Phase 1: implement lib/worksheet-activities/ server modules"
    status: completed
  - id: phase1-api
    content: "Phase 1: implement API routes (teacher create/upload/status/report, student open/mark-complete)"
    status: completed
  - id: phase1-ui
    content: "Phase 1: implement teacher worksheet pages and student worksheet page"
    status: completed
  - id: phase2-digital-answers
    content: "Phase 2: teacher question builder, student answer sheet, submit API"
    status: completed
  - id: phase3-manual-grading
    content: "Phase 3: teacher grading screen, per-question grade/comment, mark-checked"
    status: completed
  - id: phase4-autograde
    content: "Phase 4: answer key, auto-grading logic, teacher override, publish"
    status: completed
  - id: phase5-reports
    content: "Phase 5: student report integration, school manager summary"
    status: completed
isProject: false
---

# Worksheet PDF Activities — Plan Summary

## Core Architecture Decision

New tables, routes, and components that are **entirely separate** from `classroom_activities`. Zero changes to existing activity logic.

## What Was Inspected

- All 28 SQL migrations (schema fully mapped)
- All `pages/api/teacher/activities/` and `pages/api/student/activities/` patterns
- `lib/classroom-activities/classroom-activities-shared.server.js` — shared constants/mappers
- `lib/teacher-server/teacher-activities.server.js` — existing activity CRUD pattern
- All existing RLS patterns: RLS ON, no client policies, service-role only
- Storage: Supabase Storage SDK is present as dep but **not used anywhere in app today**
- PDF tools: `html2pdf.js`/`jspdf` used only for parent report export (not file upload/serve)
- Docs folder structure: `docs/teacher-portal/` confirmed as correct home

## Key Findings

- Next.js **Pages Router** (not App Router), JavaScript with JSDoc (no TypeScript types for activities)
- All activity tables use: JSONB `question_set` + separate per-student status table + per-question attempts table
- RLS pattern: all mutations service-role only, access controlled in API handlers
- **No file upload infrastructure exists today** — Supabase Storage must be initialized for the first time

## Proposed New Tables (migration 029, no SQL run)

- `worksheet_activities` — metadata (teacher, class, school, mode, status, due date)
- `worksheet_files` — PDF file metadata (path in Supabase Storage, soft-delete only)
- `worksheet_questions` — optional digital answer sheet question definitions
- `worksheet_student_status` — per-student lifecycle (opened, completed, submitted, grading status)
- `worksheet_student_answers` — per-question student answers + teacher grading + auto-grade results

## New File Structure (abbreviated)

- `lib/worksheet-activities/*.server.js` — all server logic (shared, teacher, student, storage, grading, report)
- `pages/api/teacher/worksheet-activities/[worksheetId]/...` — all teacher API routes
- `pages/api/student/worksheet-activities/[worksheetId]/...` — all student API routes
- `pages/teacher/class/[classId]/worksheets/...` — teacher UI pages
- `pages/student/worksheet/[worksheetId].js` — student worksheet page
- `components/worksheet-activities/*.jsx` — all new components
- `supabase/migrations/029_worksheet_activities.sql` — complete SQL (prepared, not run)

## Plan Document Location

[docs/teacher-portal/WORKSHEET_PDF_ACTIVITIES_PLAN.md](docs/teacher-portal/WORKSHEET_PDF_ACTIVITIES_PLAN.md)

Includes: product summary, all decisions, non-goals, data model with full SQL, storage model, all API routes, all UI/UX flows, permissions matrix, reporting plan, migration 029 full SQL text, 5-phase implementation plan, Hebrew copy list for owner approval, 37-item QA checklist, 13 open questions, 10 risk mitigations.