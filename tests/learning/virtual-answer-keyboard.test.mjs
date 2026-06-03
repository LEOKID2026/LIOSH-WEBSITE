import test from "node:test";
import assert from "node:assert/strict";

import {
  insertVirtualAnswerChar,
  backspaceVirtualAnswer,
  clearVirtualAnswer,
} from "../../lib/learning/virtual-answer-keyboard-insert.js";
import {
  resolveVirtualAnswerKeyboard,
  isVirtualAnswerKeyboardSubject,
} from "../../lib/learning/virtual-answer-keyboard-policy.js";
import { getVirtualAnswerKeyboardRows } from "../../lib/learning/virtual-answer-keyboard-layouts.js";

test("insertVirtualAnswerChar — digits and decimal", () => {
  assert.equal(insertVirtualAnswerChar("", "7"), "7");
  assert.equal(insertVirtualAnswerChar("7", "3"), "73");
  assert.equal(insertVirtualAnswerChar("7", "."), "7.");
  assert.equal(insertVirtualAnswerChar("7.", "5"), "7.5");
  assert.equal(insertVirtualAnswerChar("7.5", ","), "7.5");
  assert.equal(insertVirtualAnswerChar("", ","), ",");
});

test("insertVirtualAnswerChar — minus only at start", () => {
  assert.equal(insertVirtualAnswerChar("", "-"), "-");
  assert.equal(insertVirtualAnswerChar("-", "3"), "-3");
  assert.equal(insertVirtualAnswerChar("3", "-"), "3");
});

test("backspace and clear", () => {
  assert.equal(backspaceVirtualAnswer("123"), "12");
  assert.equal(backspaceVirtualAnswer(""), "");
  assert.equal(clearVirtualAnswer(), "");
});

test("resolveVirtualAnswerKeyboard — subject gate", () => {
  assert.equal(resolveVirtualAnswerKeyboard({ subject: "math", isTouch: true }).enabled, true);
  assert.equal(resolveVirtualAnswerKeyboard({ subject: "geometry", isTouch: false }).enabled, true);
  assert.equal(resolveVirtualAnswerKeyboard({ subject: "hebrew" }).enabled, false);
  assert.equal(isVirtualAnswerKeyboardSubject("math"), true);
  assert.equal(isVirtualAnswerKeyboardSubject("science"), false);
});

test("numeric keyboard layout has expected keys", () => {
  const rows = getVirtualAnswerKeyboardRows("numeric");
  assert.ok(rows.length >= 4);
  const ids = rows.flatMap((r) => r.keys.map((k) => k.id));
  assert.ok(ids.includes("0"));
  assert.ok(ids.includes("backspace"));
  assert.ok(ids.includes("clear"));
});
