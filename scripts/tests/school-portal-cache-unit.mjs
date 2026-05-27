#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  fetchSchoolJsonCached,
  invalidateSchoolCache,
  readSchoolCache,
  schoolCacheKey,
  writeSchoolCache,
  isSchoolCacheFresh,
  SCHOOL_CACHE_TTL_MS,
} from "../../lib/school-portal/school-portal-cache.js";

const schoolId = "school-test";
const path = "/api/school/classes";
writeSchoolCache(schoolId, path, { data: { classes: [{ id: "1" }] } });
const entry = readSchoolCache(schoolId, path);
assert.ok(entry);
assert.ok(isSchoolCacheFresh(entry, SCHOOL_CACHE_TTL_MS.list));
assert.equal(schoolCacheKey(schoolId, path), `${schoolId}::${path}`);

let calls = 0;
async function mockFetch(_token, p) {
  calls += 1;
  return {
    status: 200,
    json: async () => ({ data: { classes: [{ id: "2" }] } }),
  };
}

const first = await fetchSchoolJsonCached({
  accessToken: "tok",
  schoolId,
  path,
  fetchFn: mockFetch,
});
assert.equal(first.fromCache, true);
assert.equal(calls, 0);

invalidateSchoolCache(schoolId);
assert.equal(readSchoolCache(schoolId, path), null);

console.log("school-portal-cache-unit: PASS");
