import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStudentLoginUsername } from "../../lib/learning-supabase/student-login-username.server.js";

describe("validateStudentLoginUsername", () => {
  it("allows login when the access row has no login_username (legacy code-only)", () => {
    const result = validateStudentLoginUsername({
      usernameNormalized: "",
      storedLoginUsernameRaw: null,
    });
    assert.equal(result.ok, true);
  });

  it("allows correct username when login_username is set", () => {
    const result = validateStudentLoginUsername({
      usernameNormalized: "student.alice",
      storedLoginUsernameRaw: "Student.Alice",
    });
    assert.equal(result.ok, true);
  });

  it("rejects wrong username with correct code/PIN match path", () => {
    const result = validateStudentLoginUsername({
      usernameNormalized: "wrong.user",
      storedLoginUsernameRaw: "student.alice",
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "username_mismatch");
  });

  it("rejects partial username (prefix only)", () => {
    const result = validateStudentLoginUsername({
      usernameNormalized: "student",
      storedLoginUsernameRaw: "student.alice",
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "username_mismatch");
  });

  it("rejects empty username when login_username is required", () => {
    const result = validateStudentLoginUsername({
      usernameNormalized: "",
      storedLoginUsernameRaw: "student.alice",
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "username_required");
  });

  it("rejects whitespace-only username when login_username is required", () => {
    const result = validateStudentLoginUsername({
      usernameNormalized: "   ",
      storedLoginUsernameRaw: "student.alice",
    });
    assert.equal(result.ok, false);
    assert.equal(result.reason, "username_required");
  });
});
