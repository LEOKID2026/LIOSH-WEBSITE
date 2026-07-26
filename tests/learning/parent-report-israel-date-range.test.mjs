/**
 * Focused tests: parent report date range uses Asia/Jerusalem civil days.
 * Run: node --test tests/learning/parent-report-israel-date-range.test.mjs
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  getIsraelInclusiveDateRangeUtcBounds,
  getIsraelMidnightUtc,
  addIsraelCalendarDays,
} from "../../lib/learning-supabase/israel-calendar.server.js";
import { reportRangeBoundsMs } from "../../lib/learning-supabase/parent-report-activity-time.js";
import {
  parseIsoDateParam,
  resolveParentReportRangeUtcBounds,
} from "../../lib/parent-server/report-data-aggregate.server.js";

function inRange(iso, fromIso, toIsoExclusive) {
  return iso >= fromIso && iso < toIsoExclusive;
}

describe("Asia/Jerusalem parent report date bounds", () => {
  test("summer: post-Israel-midnight activity on prior UTC day is included", () => {
    // 2026-07-20 Israel midnight is 2026-07-19T21:00:00.000Z (DST UTC+3)
    const bounds = getIsraelInclusiveDateRangeUtcBounds("2026-07-20", "2026-07-20");
    assert.equal(bounds.fromIso, getIsraelMidnightUtc("2026-07-20").toISOString());
    assert.equal(bounds.toIsoExclusive, getIsraelMidnightUtc("2026-07-21").toISOString());
    assert.equal(bounds.fromIso, "2026-07-19T21:00:00.000Z");
    assert.equal(bounds.toIsoExclusive, "2026-07-20T21:00:00.000Z");

    const afterIsraelMidnightStillUtcPrevDay = "2026-07-19T22:30:00.000Z";
    assert.equal(afterIsraelMidnightStillUtcPrevDay.slice(0, 10), "2026-07-19");
    assert.equal(inRange(afterIsraelMidnightStillUtcPrevDay, bounds.fromIso, bounds.toIsoExclusive), true);

    // Old UTC-midnight filter would wrongly exclude this
    const utcFrom = "2026-07-20T00:00:00.000Z";
    const utcToEx = "2026-07-21T00:00:00.000Z";
    assert.equal(inRange(afterIsraelMidnightStillUtcPrevDay, utcFrom, utcToEx), false);
  });

  test("winter: Israel standard time offset is UTC+2", () => {
    const bounds = getIsraelInclusiveDateRangeUtcBounds("2026-01-15", "2026-01-15");
    assert.equal(bounds.fromIso, "2026-01-14T22:00:00.000Z");
    assert.equal(bounds.toIsoExclusive, "2026-01-15T22:00:00.000Z");

    const afterIsraelMidnightStillUtcPrevDay = "2026-01-14T23:15:00.000Z";
    assert.equal(afterIsraelMidnightStillUtcPrevDay.slice(0, 10), "2026-01-14");
    assert.equal(inRange(afterIsraelMidnightStillUtcPrevDay, bounds.fromIso, bounds.toIsoExclusive), true);
  });

  test("end day is fully included; next local midnight is excluded", () => {
    const bounds = getIsraelInclusiveDateRangeUtcBounds("2026-07-20", "2026-07-22");
    assert.equal(bounds.endExclusiveYmd, "2026-07-23");
    assert.equal(bounds.toIsoExclusive, getIsraelMidnightUtc("2026-07-23").toISOString());

    const lastMomentInside = new Date(Date.parse(bounds.toIsoExclusive) - 1).toISOString();
    const firstMomentOutside = bounds.toIsoExclusive;
    assert.equal(inRange(lastMomentInside, bounds.fromIso, bounds.toIsoExclusive), true);
    assert.equal(inRange(firstMomentOutside, bounds.fromIso, bounds.toIsoExclusive), false);
  });

  test("start boundary is inclusive; instant before local midnight is excluded", () => {
    const bounds = getIsraelInclusiveDateRangeUtcBounds("2026-07-20", "2026-07-20");
    const exactlyStart = bounds.fromIso;
    const justBefore = new Date(Date.parse(bounds.fromIso) - 1).toISOString();
    assert.equal(inRange(exactlyStart, bounds.fromIso, bounds.toIsoExclusive), true);
    assert.equal(inRange(justBefore, bounds.fromIso, bounds.toIsoExclusive), false);
  });

  test("sessions and answers use the same bounds helper", () => {
    const fromDate = parseIsoDateParam("2026-07-20");
    const toDate = parseIsoDateParam("2026-07-24");
    const a = resolveParentReportRangeUtcBounds(fromDate, toDate);
    const b = getIsraelInclusiveDateRangeUtcBounds("2026-07-20", "2026-07-24");
    const c = reportRangeBoundsMs(fromDate, toDate);
    assert.equal(a.fromIso, b.fromIso);
    assert.equal(a.toIsoExclusive, b.toIsoExclusive);
    assert.equal(a.timeZone, "Asia/Jerusalem");
    assert.equal(c.fromMs, Date.parse(a.fromIso));
    assert.equal(c.toMsExclusive, Date.parse(a.toIsoExclusive));
  });

  test("overnight Israel hours stay on the selected local day", () => {
    // 01:30 Israel on 2026-07-21 summer = 2026-07-20T22:30:00.000Z
    const iso = "2026-07-20T22:30:00.000Z";
    const day21 = getIsraelInclusiveDateRangeUtcBounds("2026-07-21", "2026-07-21");
    const day20 = getIsraelInclusiveDateRangeUtcBounds("2026-07-20", "2026-07-20");
    assert.equal(inRange(iso, day21.fromIso, day21.toIsoExclusive), true);
    assert.equal(inRange(iso, day20.fromIso, day20.toIsoExclusive), false);
  });

  test("multi-day custom range includes start and end civil days", () => {
    const bounds = getIsraelInclusiveDateRangeUtcBounds("2026-07-20", "2026-07-24");
    assert.equal(addIsraelCalendarDays("2026-07-20", 4), "2026-07-24");
    assert.equal(bounds.fromIso, getIsraelMidnightUtc("2026-07-20").toISOString());
    assert.equal(bounds.toIsoExclusive, getIsraelMidnightUtc("2026-07-25").toISOString());

    const startInstant = bounds.fromIso;
    const endDayMid = "2026-07-24T12:00:00.000Z"; // still inside Jul 24 Israel (until 21:00Z)
    const afterEnd = bounds.toIsoExclusive;
    assert.equal(inRange(startInstant, bounds.fromIso, bounds.toIsoExclusive), true);
    assert.equal(inRange(endDayMid, bounds.fromIso, bounds.toIsoExclusive), true);
    assert.equal(inRange(afterEnd, bounds.fromIso, bounds.toIsoExclusive), false);
  });

  test("mid-day fixture range does not invent engine-side date shifts", () => {
    // Non day-boundary activity: both old UTC and new Israel filters include it for same YMD window
    const fromDate = parseIsoDateParam("2026-07-20");
    const toDate = parseIsoDateParam("2026-07-20");
    const bounds = resolveParentReportRangeUtcBounds(fromDate, toDate);
    const midday = "2026-07-20T10:00:00.000Z";
    assert.equal(inRange(midday, bounds.fromIso, bounds.toIsoExclusive), true);
    assert.equal(inRange(midday, "2026-07-20T00:00:00.000Z", "2026-07-21T00:00:00.000Z"), true);
  });

  test("aggregateParentReportPayload applies identical Israel bounds to sessions and answers", async () => {
    const { aggregateParentReportPayload } = await import(
      "../../lib/parent-server/report-data-aggregate.server.js"
    );
    const expected = resolveParentReportRangeUtcBounds(
      parseIsoDateParam("2026-07-20"),
      parseIsoDateParam("2026-07-22")
    );
    /** @type {Array<{table:string, gte:string, lt:string}>} */
    const filters = [];
    function chain(table) {
      const state = { table, gte: null, lt: null };
      const api = new Proxy(
        {},
        {
          get(_t, prop) {
            if (prop === "then") {
              return (resolve) => {
                filters.push({ table: state.table, gte: state.gte, lt: state.lt });
                resolve({ data: [], error: null });
              };
            }
            if (prop === "gte") {
              return (_col, v) => {
                state.gte = v;
                return api;
              };
            }
            if (prop === "lt") {
              return (_col, v) => {
                state.lt = v;
                return api;
              };
            }
            return () => api;
          },
        }
      );
      return api;
    }
    const client = {
      from(table) {
        return chain(table);
      },
    };
    await aggregateParentReportPayload(
      client,
      { id: "00000000-0000-4000-8000-000000000001", full_name: "Kid", grade_level: "grade_4" },
      parseIsoDateParam("2026-07-20"),
      parseIsoDateParam("2026-07-22"),
      { includeParentActivities: false, includePrivateTeacherActivities: false }
    );
    const sessionFilter = filters.find((f) => f.table === "learning_sessions");
    const answerFilter = filters.find((f) => f.table === "answers");
    assert.ok(sessionFilter);
    assert.ok(answerFilter);
    assert.equal(sessionFilter.gte, expected.fromIso);
    assert.equal(sessionFilter.lt, expected.toIsoExclusive);
    assert.equal(answerFilter.gte, expected.fromIso);
    assert.equal(answerFilter.lt, expected.toIsoExclusive);
    assert.equal(sessionFilter.gte, answerFilter.gte);
    assert.equal(sessionFilter.lt, answerFilter.lt);
    assert.notEqual(sessionFilter.gte, "2026-07-20T00:00:00.000Z");
  });
});
