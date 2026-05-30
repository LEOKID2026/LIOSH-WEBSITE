#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  describeRecoveryUrlParams,
  parseRecoveryUrl,
  parseHashTokens,
} from "../../lib/auth/auth-recovery-session.client.js";

function record(id, ok, detail) {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${id}: ${detail}`);
  if (!ok) process.exitCode = 1;
}

const hash =
  "#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer&type=recovery";
const tokenHashSearch =
  "?portal=parent&token_hash=hashed-token-value&type=recovery";
const codeSearch = "?portal=parent&code=auth-code-value";

record(
  "describe_hash_recovery_link",
  (() => {
    const info = describeRecoveryUrlParams("?portal=parent", hash);
    return (
      !info.hasCode &&
      !info.hasTokenHash &&
      info.hasHashFragment &&
      info.hashType === "recovery" &&
      info.hasHashAccessToken &&
      info.hasHashRefreshToken &&
      info.isRecoveryHash
    );
  })(),
  "hash tokens detected without exposing values"
);

record(
  "describe_token_hash_recovery_link",
  (() => {
    const info = describeRecoveryUrlParams(tokenHashSearch, "");
    return info.hasTokenHash && info.isRecoveryQuery && !info.hasCode && !info.hasHashFragment;
  })(),
  "token_hash query params detected"
);

record(
  "parse_recovery_hash_link",
  (() => {
    const parsed = parseRecoveryUrl("?portal=parent", hash);
    return parsed.isRecoveryLink && parsed.hasRecoveryHash && !parsed.code && !parsed.tokenHash;
  })(),
  "parseRecoveryUrl marks hash recovery links"
);

record(
  "parse_recovery_token_hash_link",
  (() => {
    const parsed = parseRecoveryUrl(tokenHashSearch, "");
    return (
      parsed.isRecoveryLink &&
      parsed.tokenHash === "hashed-token-value" &&
      parsed.recoveryType === "recovery"
    );
  })(),
  "parseRecoveryUrl reads token_hash and type"
);

record(
  "parse_hash_tokens",
  (() => {
    const tokens = parseHashTokens(hash);
    return tokens?.access_token === "abc" && tokens?.refresh_token === "def" && tokens?.type === "recovery";
  })(),
  "parseHashTokens extracts hash session fields"
);

record(
  "parse_code_only_link",
  (() => {
    const parsed = parseRecoveryUrl(codeSearch, "");
    const info = describeRecoveryUrlParams(codeSearch, "");
    return parsed.isRecoveryLink && parsed.code && info.hasCode && !info.hasTokenHash;
  })(),
  "PKCE code links are recognized separately from token_hash"
);

const failed = process.exitCode === 1;
console.log(`\nAuth recovery session: ${failed ? "FAILED" : "ALL PASS"}`);
if (failed) process.exit(1);
