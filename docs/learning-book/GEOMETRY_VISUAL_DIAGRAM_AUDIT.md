# Geometry / גאומטריה — Visual Diagram Audit

**Date:** June 2026  
**Status:** Generated from `geometry-diagram-page-map.js` + draft scan  
**Book title (UI):** ספר גאומטריה — כיתה X — all grades use **גאומטריה**

---

## Summary

| Metric | Count |
|--------|------:|
| Total Geometry pages (G1–G6) | 65 |
| Pages with required diagram | 54 |
| Pages intentionally without diagram | 11 |

---

## Rules applied

1. Triangle perimeter pages → `triangle_perimeter`, never generic rectangle.
2. Square perimeter / area pages → square-specific diagrams.
3. Height pages → shape with visible height line + labels **גובה** / **בסיס**.
4. Trapezoid / parallelogram area → matching shape with base + height.
5. Circle pages → `circle_radius`.
6. Transformations, rotation, tiling, advanced volume topics → no forced diagram.
7. Deprecated `perimeter_path` / generic `area_grid` replaced where mapped.
8. No unexplained arrows — perimeter uses dashed outline only.

---

## Page audit table

| Grade | Page ID | Page title | Topic/concept | Current diagram | Problem | Required diagram type | Action |
| ----- | ------- | ---------- | ------------- | --------------- | ------- | --------------------- | ------ |
| g1 | shapes_basic_square | הכרת הריבוע | ריבוע — צלעות שוות | square_sides | — | square_sides | keep |
| g1 | shapes_basic_rectangle | הכרת המלבן | מלבן — אורך ורוחב | rectangle_sides | — | rectangle_sides | keep |
| g1 | transformations | הזזה ושיקוף — היכרות | טרנספורמציה — אין דיאגרמה בטוחה עדיין | none | no safe diagram yet | — | no safe diagram yet |
| g2 | solids | גופים תלת־ממדיים — שמות והיכרות | קובייה / תיבה פשוטה | cube_basic | — | cube_basic | keep |
| g2 | square_area | שטח של ריבוע | ריבוע עם ריבועי יחידה | square_area_grid | — | square_area_grid | keep |
| g2 | transformations | הזזה ושיקוף — המשך | אין דיאגרמה בטוחה עדיין | none | no safe diagram yet | — | no safe diagram yet |
| g3 | triangles | סוגי משולשים | משולש — צלעות וקודקודים | triangle_parts | — | triangle_parts | keep |
| g3 | quadrilaterals | סוגי מרובעים | מרובע — צלעות וקודקודים | quadrilateral_parts | — | quadrilateral_parts | keep |
| g3 | parallel_perpendicular | מקבילות ומאונכות | קווים מקבילים | parallel_lines | — | parallel_lines | keep |
| g3 | square_area | שטח ריבוע — כיתה ג׳ | ריבוע עם ריבועי יחידה | square_area_grid | — | square_area_grid | keep |
| g3 | square_perimeter | היקף ריבוע | היקף — מסביב לריבוע | square_perimeter | — | square_perimeter | keep |
| g3 | triangle_perimeter | היקף משולש | היקף — מסביב למשולש | triangle_perimeter | — | triangle_perimeter | keep |
| g3 | triangle_angles | זוויות במשולש | זווית עם קרניים | angle_basic | — | angle_basic | keep |
| g3 | rotation | סיבוב במישור | סיבוב — אין דיאגרמה בטוחה עדיין | none | no safe diagram yet | — | no safe diagram yet |
| g3 | solids | גופים — פאות, קדקודים ומקצועות | קובייה / תיבה | cube_basic | — | cube_basic | keep |
| g4 | shapes_basic_properties_square | תכונות הריבוע — צלעות | ריבוע — צלעות | square_sides | — | square_sides | keep |
| g4 | shapes_basic_properties_rectangle | תכונות המלבן — זוגות צלעות | מלבן — אורך ורוחב | rectangle_sides | — | rectangle_sides | keep |
| g4 | shapes_basic_properties_angles | זוויות ישרות במרובע | זווית ישרה | right_angle | — | right_angle | keep |
| g4 | symmetry | סימטרייה במישור | קו סימטריה | symmetry_line | — | symmetry_line | keep |
| g4 | quadrilaterals | מרובעים — תכונות וסיווג | מרובע — סיווג | quadrilateral_parts | — | quadrilateral_parts | keep |
| g4 | parallel_perpendicular | מקבילות ומאונכות — במצולעים | קווים מקבילים | parallel_lines | — | parallel_lines | keep |
| g4 | square_perimeter | היקף ריבוע — כיתה ד׳ | היקף — ריבוע | square_perimeter | — | square_perimeter | keep |
| g4 | square_area | שטח ריבוע — כיתה ד׳ | ריבוע עם ריבועי יחידה | square_area_grid | — | square_area_grid | keep |
| g4 | triangle_perimeter | היקף משולש — כיתה ד׳ | היקף — משולש | triangle_perimeter | — | triangle_perimeter | keep |
| g4 | triangle_angles | זוויות במשולש — כיתה ד׳ | זווית | angle_basic | — | angle_basic | keep |
| g4 | diagonal_square | אלכסון בריבוע | ריבוע עם אלכסון | square_diagonal | — | square_diagonal | keep |
| g4 | diagonal_rectangle | אלכסון במלבן | מלבן עם אלכסון | rectangle_diagonal | — | rectangle_diagonal | keep |
| g4 | solids | גופים — פאות במישור | קובייה / תיבה | cube_basic | — | cube_basic | keep |
| g4 | rectangular_prism_volume | נפח תיבה | תיבה תלת־ממדית | box_basic | — | box_basic | keep |
| g5 | parallel_perpendicular | קווים מקבילים ומאונכים | קווים מקבילים | parallel_lines | — | parallel_lines | keep |
| g5 | quadrilaterals | סיווג מרובעים — כיתה ה׳ | מרובע | quadrilateral_parts | — | quadrilateral_parts | keep |
| g5 | triangle_angles | זוויות במשולש | זווית | angle_basic | — | angle_basic | keep |
| g5 | square_perimeter | היקף ריבוע | היקף — ריבוע | square_perimeter | — | square_perimeter | keep |
| g5 | triangle_perimeter | היקף משולש | היקף — משולש | triangle_perimeter | — | triangle_perimeter | keep |
| g5 | square_area | שטח ריבוע | ריבוע עם ריבועי יחידה | square_area_grid | — | square_area_grid | keep |
| g5 | parallelogram_area | שטח מקבילית | מקבילית — בסיס וגובה | parallelogram_area | — | parallelogram_area | keep |
| g5 | trapezoid_area | שטח טרפז | טרפז — בסיס וגובה | trapezoid_area | — | trapezoid_area | keep |
| g5 | heights_triangle | גובה במשולש | משולש עם קו גובה | triangle_height | — | triangle_height | keep |
| g5 | heights_parallelogram | גובה במקבילית | מקבילית עם קו גובה | parallelogram_height | — | parallelogram_height | keep |
| g5 | heights_trapezoid | גובה בטרפז | טרפז עם קו גובה | trapezoid_height | — | trapezoid_height | keep |
| g5 | diagonal_square | אלכסון בריבוע | ריבוע עם אלכסון | square_diagonal | — | square_diagonal | keep |
| g5 | diagonal_rectangle | אלכסון במלבן | מלבן עם אלכסון | rectangle_diagonal | — | rectangle_diagonal | keep |
| g5 | diagonal_parallelogram | אלכסון במקבילית | מקבילית עם אלכסון | parallelogram_diagonal | — | parallelogram_diagonal | keep |
| g5 | solids | גופים תלת-ממדיים — חזרה | קובייה / תיבה | cube_basic | — | cube_basic | keep |
| g5 | rectangular_prism_volume | נפח תיבה | תיבה | box_basic | — | box_basic | keep |
| g5 | tiling | ריצוף במישור | ריצוף — אין דיאגרמה בטוחה עדיין | none | no safe diagram yet | — | no safe diagram yet |
| g6 | square_perimeter | היקף ריבוע — כיתה ו׳ | היקף — ריבוע | square_perimeter | — | square_perimeter | keep |
| g6 | triangle_perimeter | היקף משולש — כיתה ו׳ | היקף — משולש | triangle_perimeter | — | triangle_perimeter | keep |
| g6 | square_area | שטח ריבוע — כיתה ו׳ | ריבוע עם ריבועי יחידה | square_area_grid | — | square_area_grid | keep |
| g6 | parallelogram_area | שטח מקבילית — כיתה ו׳ | מקבילית — בסיס וגובה | parallelogram_area | — | parallelogram_area | keep |
| g6 | trapezoid_area | שטח טרפז — כיתה ו׳ | טרפז — בסיס וגובה | trapezoid_area | — | trapezoid_area | keep |
| g6 | triangle_angles | זוויות במשולש — כיתה ו׳ | זווית | angle_basic | — | angle_basic | keep |
| g6 | circle_perimeter | היקף מעגל | מעגל — רדיוס והיקף | circle_radius | — | circle_radius | keep |
| g6 | circle_area | שטח עיגול | מעגל — רדיוס | circle_radius | — | circle_radius | keep |
| g6 | pythagoras_hyp | משפט פיתגורס — מציאת יתר | משולש ישר זווית | right_triangle | — | right_triangle | keep |
| g6 | pythagoras_leg | משפט פיתגורס — מציאת ניצב | משולש ישר זווית | right_triangle | — | right_triangle | keep |
| g6 | solids | גופים — גליל, פירמידה, חרוט, כדור | מגוון גופים — אין דיאגרמה אחת בטוחה | none | no safe diagram yet | — | no safe diagram yet |
| g6 | rectangular_prism_volume | נפח תיבה — כיתה ו׳ | תיבה | box_basic | — | box_basic | keep |
| g6 | prism_volume_rectangular | נפח מנסרה — בסיס מלבן | תיבה / מנסרה | box_basic | — | box_basic | keep |
| g6 | prism_volume_triangle | נפח מנסרה — בסיס משולש | אין דיאגרמה בטוחה עדיין | none | no safe diagram yet | — | no safe diagram yet |
| g6 | pyramid_volume_square | נפח פירמידה — בסיס ריבוע | אין דיאגרמה בטוחה עדיין | none | no safe diagram yet | — | no safe diagram yet |
| g6 | pyramid_volume_rectangular | נפח פירמידה — בסיס מלבן | אין דיאגרמה בטוחה עדיין | none | no safe diagram yet | — | no safe diagram yet |
| g6 | cylinder_volume | נפח גליל | אין דיאגרמה בטוחה עדיין | none | no safe diagram yet | — | no safe diagram yet |
| g6 | cone_volume | נפח חרוט | אין דיאגרמה בטוחה עדיין | none | no safe diagram yet | — | no safe diagram yet |
| g6 | sphere_volume | נפח כדור | אין דיאגרמה בטוחה עדיין | none | no safe diagram yet | — | no safe diagram yet |

---

## Intentionally text-only pages

These topics are too vague or lack a single safe visual:

- **transformations** (G1, G2) — הזזה / שיקוף
- **rotation** (G3)
- **tiling** (G5)
- **g6/solids** — multiple body types (גליל, חרוט, כדור…)
- **advanced volume** (pyramid, cylinder, cone, sphere, triangular prism base)

---

## Related files

- `lib/learning-book/geometry-diagram-page-map.js` — authoritative mapping
- `components/learning-book/GeometryDiagram.js` — SVG renderers
- `docs/learning-book/GEOMETRY_VISUAL_DIAGRAM_SYSTEM.md` — author guide
- `scripts/lib/sync-geometry-page-diagrams.mjs` — sync draft markers
