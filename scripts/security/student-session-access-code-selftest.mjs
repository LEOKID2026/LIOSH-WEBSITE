#!/usr/bin/env node
/**
 * Unit selftest for student session access-code binding (fail-closed).
 * node scripts/security/student-session-access-code-selftest.mjs
 */
import assert from "node:assert/strict";
import { isStudentSessionAccessCodeBindingValid } from "../../lib/learning-supabase/student-session-access-code.server.js";

const CODE_ID = "11111111-1111-4111-8111-111111111111";

function testNullAccessCodeIdRejected() {
  assert.equal(
    isStudentSessionAccessCodeBindingValid({ access_code_id: null }, { id: CODE_ID, is_active: true }),
    false
  );
  assert.equal(
    isStudentSessionAccessCodeBindingValid({}, { id: CODE_ID, is_active: true }),
    false
  );
}

function testActiveAccessCodeAllowed() {
  assert.equal(
    isStudentSessionAccessCodeBindingValid(
      { access_code_id: CODE_ID },
      { id: CODE_ID, is_active: true, revoked_at: null }
    ),
    true
  );
}

function testRevokedAccessCodeRejected() {
  assert.equal(
    isStudentSessionAccessCodeBindingValid(
      { access_code_id: CODE_ID },
      { id: CODE_ID, is_active: true, revoked_at: "2026-01-01T00:00:00.000Z" }
    ),
    false
  );
}

function testInactiveAccessCodeRejected() {
  assert.equal(
    isStudentSessionAccessCodeBindingValid(
      { access_code_id: CODE_ID },
      { id: CODE_ID, is_active: false, revoked_at: null }
    ),
    false
  );
}

function testMissingCodeRowRejected() {
  assert.equal(
    isStudentSessionAccessCodeBindingValid({ access_code_id: CODE_ID }, null),
    false
  );
  assert.equal(
    isStudentSessionAccessCodeBindingValid({ access_code_id: CODE_ID }, {}),
    false
  );
}

testNullAccessCodeIdRejected();
testActiveAccessCodeAllowed();
testRevokedAccessCodeRejected();
testInactiveAccessCodeRejected();
testMissingCodeRowRejected();

console.log("student-session-access-code-selftest: PASS (5/5)");
