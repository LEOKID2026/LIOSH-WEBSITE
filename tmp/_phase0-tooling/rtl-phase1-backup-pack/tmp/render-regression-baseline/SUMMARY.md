# Render regression Phase 0 baseline

Base URL: http://127.0.0.1:3002
Date: 2026-06-03T19:52:42.402Z

## Screenshots
- tmp\render-regression-baseline\book-g4-ns_place_hundreds-s3-360px.png
- tmp\render-regression-baseline\book-g5-ns_place_hundreds-s3-360px.png
- tmp\render-regression-baseline\book-g5-add_two-s3-360px.png

## Status
FAIL (10)
- student-auth: E2E student login failed: HTTP 401 — {"ok":false,"error":"שם משתמש או PIN שגויים"}
- book-g2-add_two-s3: locator.screenshot: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('main').first()

- book-g2-sub_two-s3: locator.screenshot: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('main').first()

- book-g2-sub_vertical-s3: locator.screenshot: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('main').first()

- book-g2-add_vertical-s3: locator.screenshot: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('main').first()

- step-s1-g2-addition-question: page.waitForFunction: Timeout 120000ms exceeded.
- step-s2-g2-addition-modal: page.waitForFunction: Timeout 120000ms exceeded.
- step-s3-g2-subtraction-question: page.waitForFunction: Timeout 120000ms exceeded.
- step-s4-g4-addition-question: HTTP 500
- step-s5-g5-fractions-question: HTTP 500
