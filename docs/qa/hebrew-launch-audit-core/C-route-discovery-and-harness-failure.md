# C-RECOVERY: Route Discovery & Harness Report

> **Generated:** 2026-06-15T13:01:45.132Z
> **Conclusion:** PARTIAL_SUCCESS — some routes valid, proceed to screenshot capture

---

## 1. Servers Probed

| Port | Label | Alive | HTTP Status | Title |
|------|-------|-------|-------------|-------|
| 3001 | dev (old, running since yesterday) | ✅ | 500 | - |
| 3020 | prod (new build, started today) | ✅ | 500 | 500: Internal Server Error |
| 3014 | prod (env E2E, started today 11:29) | ❌ | -1 | - |
| 3013 | prod (env E2E) | ❌ | -1 | - |
| 3012 | prod (env E2E) | ❌ | -1 | - |
| 3011 | prod (earlier) | ❌ | -1 | - |
| 3005 | prod (earlier) | ✅ | 200 | LEO K - Kids Games & Learning |
| 3004 | prod (earlier) | ✅ | 200 | LEO K - Kids Games & Learning |
| 3003 | prod (earlier) | ❌ | -1 | - |

---

## 2. Auth Attempts

| Port | Username | Source | Success | Note |
|------|----------|--------|---------|------|
| 3001 | ADMIN | VIRTUAL_STUDENT_ACCOUNTS in .env.e2e.loc | ❌ | login form not visible — page:  |
| 3001 | leo-s01 | E2E_STUDENT_USERNAME — failed 401 in pre | ❌ | login form not visible — page:  |
| 3001 | eran | capture-student-bright-pilot-screenshots | ❌ | login form not visible — page:  |
| 3020 | ADMIN | VIRTUAL_STUDENT_ACCOUNTS in .env.e2e.loc | ❌ | login form not visible — page: 404: This page could not be found |
| 3020 | leo-s01 | E2E_STUDENT_USERNAME — failed 401 in pre | ❌ | login form not visible — page: 404: This page could not be found |
| 3020 | eran | capture-student-bright-pilot-screenshots | ❌ | login form not visible — page: 404: This page could not be found |
| 3005 | ADMIN | VIRTUAL_STUDENT_ACCOUNTS in .env.e2e.loc | ✅ | login succeeded → /student/home |
| 3004 | ADMIN | VIRTUAL_STUDENT_ACCOUNTS in .env.e2e.loc | ❌ | login form not visible — page: LEO K - Kids Games & Learning |
| 3004 | leo-s01 | E2E_STUDENT_USERNAME — failed 401 in pre | ❌ | login form not visible — page: LEO K - Kids Games & Learning |
| 3004 | eran | capture-student-bright-pilot-screenshots | ❌ | login form not visible — page: LEO K - Kids Games & Learning |

---

## 3. Route Probe Results

| Subject | Grade | PageId | Port | Auth | HTTP | Real Content | Reason |
|---------|-------|--------|------|------|------|-------------|--------|
| math | g1 | add_two | 3005 | ADMIN | 200 | ✅ YES | OK |
| math | g2 | frac_half | 3005 | ADMIN | 200 | ✅ YES | OK |
| math | g3 | cmp | 3005 | ADMIN | 200 | ✅ YES | OK |
| math | g4 | mul_vertical | 3005 | ADMIN | 200 | ✅ YES | OK |
| math | g5 | frac_add_sub | 3005 | ADMIN | 200 | ✅ YES | OK |
| math | g6 | perc_part_of | 3005 | ADMIN | 200 | ✅ YES | OK |
| geometry | g1 | shapes_basic_square | 3005 | ADMIN | 200 | ✅ YES | OK |
| geometry | g3 | triangle_angles | 3005 | ADMIN | 200 | ✅ YES | OK |
| geometry | g4 | shapes_basic_properties_angles | 3005 | ADMIN | 200 | ✅ YES | OK |
| geometry | g5 | triangle_area | 3005 | ADMIN | 200 | ✅ YES | OK |
| geometry | g6 | circle_area | 3005 | ADMIN | 200 | ✅ YES | OK |

---

## 4. Valid Routes (Real Book Content Confirmed)

- `http://localhost:3005/learning/book/math/g1/add_two` — math g1/add_two
- `http://localhost:3005/learning/book/math/g2/frac_half` — math g2/frac_half
- `http://localhost:3005/learning/book/math/g3/cmp` — math g3/cmp
- `http://localhost:3005/learning/book/math/g4/mul_vertical` — math g4/mul_vertical
- `http://localhost:3005/learning/book/math/g5/frac_add_sub` — math g5/frac_add_sub
- `http://localhost:3005/learning/book/math/g6/perc_part_of` — math g6/perc_part_of
- `http://localhost:3005/learning/book/geometry/g1/shapes_basic_square` — geometry g1/shapes_basic_square
- `http://localhost:3005/learning/book/geometry/g3/triangle_angles` — geometry g3/triangle_angles
- `http://localhost:3005/learning/book/geometry/g4/shapes_basic_properties_angles` — geometry g4/shapes_basic_properties_angles
- `http://localhost:3005/learning/book/geometry/g5/triangle_area` — geometry g5/triangle_area
- `http://localhost:3005/learning/book/geometry/g6/circle_area` — geometry g6/circle_area

---

## 5. Harness Failures

_None_

---

## 6. Root Cause Analysis

### Auth: SUCCESS on port(s) 3005
- Working credentials: ADMIN

### Server Status
- Dev server (port 3001): **started 2026-06-14 20:44 — running 19+ hours** → corrupted .next (chunk mismatch)
- Prod servers (3020, 3014, etc.): **return HTTP 500 for all pages** including /student/login
- Root cause: server-side rendering fails → HTML body contains loading spinner only → StudentAccessGate cannot verify session → book content never renders

### Route Source (confirmed from code)
- Math book routes: defined in `lib/learning-book/math-g{N}-registry.js`, pattern `/learning/book/math/g{N}/{pageId}`
- Geometry book routes: defined in `lib/learning-book/geometry-g{N}-registry.js`, pattern `/learning/book/geometry/g{N}/{pageId}`
- Pages are SSG (getStaticProps) — HTML files exist in `.next/server/pages/learning/book/math|geometry/`
- Auth gate is client-side only (StudentAccessGate component) — server sends full SSG HTML

### Why Screenshots Show Auth Gate
The Next.js SSG HTML contains a **loading spinner** as initial server-rendered HTML (not the book content). Book content is injected by React after client-side auth check. When auth fails → content never appears.

---

## 7. Required Next Steps to Unblock

1. Start a **fresh dev server**: stop port 3001, delete .next, run `npm run dev`
2. Use **ADMIN/1234** credentials (confirmed working in audit 2026-06-15 00:10)
3. Re-run route discovery to confirm book content loads
4. Only then proceed to screenshot capture
