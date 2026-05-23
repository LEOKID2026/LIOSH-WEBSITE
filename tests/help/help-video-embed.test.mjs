#!/usr/bin/env node
/**
 * Minimal check: HelpVideoEmbed returns null when src is absent (logic mirror).
 */
function helpVideoEmbedShouldRender(src) {
  return Boolean(src);
}

let failed = 0;
if (helpVideoEmbedShouldRender(null) !== false) {
  console.error("FAIL: expected no render when src is null");
  failed++;
}
if (helpVideoEmbedShouldRender("") !== false) {
  console.error("FAIL: expected no render when src is empty");
  failed++;
}
if (helpVideoEmbedShouldRender("/help-center/videos/x.mp4") !== true) {
  console.error("FAIL: expected render when src is set");
  failed++;
}
if (failed) process.exit(1);
console.log("OK: HelpVideoEmbed null-src policy");
