/**
 * HTTP runtime verification for writing trace assets (simulates browser fetch).
 * Run: node tests/writing/writing-asset-http.test.mjs
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GLYPH_GROUPS } from "../../scripts/writing/lib/glyph-config.mjs";
import {
  resolveWritingTraceAssetUrl,
  resolveWritingStrokeOrderAssetUrl,
} from "../../lib/writing/writing-trace-asset-resolver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_ROOT = path.resolve(__dirname, "../../public");
const PORT = 4173;

/**
 * @param {string} root
 * @param {number} port
 */
function startStaticServer(root, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
        const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "");
        const filePath = path.normalize(path.join(root, rel));
        if (!filePath.startsWith(path.normalize(root))) {
          res.writeHead(403);
          res.end("Forbidden");
          return;
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          res.writeHead(404);
          res.end("Not Found");
          return;
        }
        const body = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const type =
          ext === ".svg"
            ? "image/svg+xml"
            : ext === ".json"
              ? "application/json"
              : "application/octet-stream";
        res.writeHead(200, { "Content-Type": type });
        res.end(body);
      } catch (err) {
        res.writeHead(500);
        res.end(String(err));
      }
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

/**
 * @param {string} url
 */
async function fetchAsset(url) {
  const res = await fetch(url);
  const contentType = res.headers.get("content-type") || "";
  const body = await res.text();
  return { status: res.status, contentType, body };
}

const server = await startStaticServer(PUBLIC_ROOT, PORT);
/** @type {string[]} */
const urls = [];

try {
  for (const group of GLYPH_GROUPS) {
    for (const glyph of group.glyphs) {
      const language = group.id.startsWith("he") ? "he" : "en";
      const scriptStyle = group.id === "he-script" ? "script" : "print";
      for (const traceRenderMode of ["full_trace", "outline", "stroke_path"]) {
        const assetUrl = resolveWritingTraceAssetUrl({
          language,
          scriptStyle,
          character: glyph,
          traceRenderMode,
        });
        assert.ok(assetUrl);
        urls.push(`http://127.0.0.1:${PORT}${assetUrl}`);
      }
      const orderUrl = resolveWritingStrokeOrderAssetUrl({
        language,
        scriptStyle,
        character: glyph,
        group: group.id,
      });
      urls.push(`http://127.0.0.1:${PORT}${orderUrl}`);
    }
  }

  assert.equal(urls.length, 116 * 3 + 116);

  for (const url of urls) {
    const { status, contentType, body } = await fetchAsset(url);
    assert.equal(status, 200, `expected HTTP 200 for ${url}, got ${status}`);
    const pathname = new URL(url).pathname;
    if (pathname.endsWith(".svg")) {
      assert.match(contentType, /svg/i, `expected image/svg+xml for ${url}, got ${contentType}`);
      assert.ok(body.includes("<svg"), `invalid SVG body for ${url}`);
      assert.ok(!body.includes("<text"), `SVG must not contain text fallback: ${url}`);
    } else {
      assert.match(contentType, /json/i, `expected JSON for ${url}`);
      const parsed = JSON.parse(body);
      assert.ok(parsed.strokeCount >= 1, `stroke-order invalid for ${url}`);
    }
    assert.ok(!url.includes("%"), `URL must not be percent-encoded: ${url}`);
  }

  console.log(`writing-asset-http.test.mjs OK (${urls.length} HTTP 200 assets)`);
} finally {
  server.close();
}
