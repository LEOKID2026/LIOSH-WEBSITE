# Render regression Phase 1 QA

Base URL: http://127.0.0.1:3004
Date: 2026-06-03T20:10:55.483Z

## Screenshots
- tmp\render-regression-phase1\book-g4-ns_place_hundreds-s3-360px.png
- tmp\render-regression-phase1\book-g5-ns_place_hundreds-s3-360px.png
- tmp\render-regression-phase1\book-g5-add_two-s3-360px.png
- tmp\render-regression-phase1\step-s1-g2-addition-question-360px.png
- tmp\render-regression-phase1\step-s2-g2-addition-modal-360px.png
- tmp\render-regression-phase1\step-s3-g2-subtraction-question-360px.png
- tmp\render-regression-phase1\step-s4-g4-addition-question-360px.png
- tmp\render-regression-phase1\step-s5-g5-fractions-question-360px.png

## Status
FAIL (14)
- book-g2-add_two-s3: decomposition lines not vertically separate
- book-g2-add_two-s3: missing example title renderer
- book-g2-add_two-s3: locator.screenshot: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('article').first()

- book-g2-sub_two-s3: missing example title renderer
- book-g2-sub_two-s3: locator.screenshot: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('article').first()

- book-g2-sub_vertical-s3: missing vertical arithmetic component
- book-g2-sub_vertical-s3: locator.screenshot: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('article').first()

- book-g2-add_vertical-s3: missing vertical arithmetic component
- book-g2-add_vertical-s3: locator.screenshot: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('article').first()

- step-s1-g2-addition-question: math-master start failed (page.waitForFunction: Timeout 120000ms exceeded.)
- step-s2-g2-addition-modal: math-master start failed (page.waitForFunction: Timeout 120000ms exceeded.)
- step-s3-g2-subtraction-question: math-master start failed (page.waitForFunction: Timeout 120000ms exceeded.)
- step-s4-g4-addition-question: math-master start failed (page.waitForFunction: Timeout 120000ms exceeded.)
- step-s5-g5-fractions-question: math-master start failed (page.waitForFunction: Timeout 120000ms exceeded.)
