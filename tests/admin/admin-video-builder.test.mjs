/**
 * Admin video builder — MVP contract + storage tests.
 * Run: node --test tests/admin/admin-video-builder.test.mjs
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  VB_FFMPEG_UNAVAILABLE_HE,
  checkFfmpegAvailable,
  createEmptyProjectPayload,
  createVideoProject,
  defaultScene,
  deleteVideoProject,
  exportVideoProjectMp4,
  getVideoProject,
  listVideoProjects,
  parseVideoProjectBody,
  saveMediaAsset,
  updateVideoProject,
} from "../../lib/admin-server/admin-video-builder.server.js";
import { computePreviewTotalDurationSec } from "../../lib/admin-portal/admin-video-builder-utils.js";
import { VB_FFMPEG_UNAVAILABLE } from "../../lib/admin-portal/admin-video-builder-ui.he.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("admin video builder — page & auth contract", () => {
  test("list page uses useAdminSession", () => {
    const src = readSrc("pages/admin/video-builder/index.js");
    assert.match(src, /useAdminSession/);
    assert.match(src, /AdminVideoBuilderList/);
  });

  test("edit page uses useAdminSession", () => {
    const src = readSrc("pages/admin/video-builder/[id].js");
    assert.match(src, /useAdminSession/);
  });

  test("all API routes require admin context", () => {
    for (const route of [
      "pages/api/admin/video-builder/index.js",
      "pages/api/admin/video-builder/[id].js",
      "pages/api/admin/video-builder/media.js",
      "pages/api/admin/video-builder/[id]/export.js",
      "pages/api/admin/video-builder/ffmpeg-status.js",
    ]) {
      const src = readSrc(route);
      assert.match(src, /requireAdminApiContext/, route);
    }
  });

  test("AdminShell nav includes video builder", () => {
    const src = readSrc("components/admin/AdminShell.jsx");
    assert.match(src, /\/admin\/video-builder/);
    assert.match(src, /ADMIN_NAV_VIDEO_BUILDER/);
  });

  test("Hebrew ffmpeg unavailable message is consistent", () => {
    assert.equal(VB_FFMPEG_UNAVAILABLE_HE, VB_FFMPEG_UNAVAILABLE);
  });
});

describe("parseVideoProjectBody", () => {
  test("accepts valid project with scenes", () => {
    const parsed = parseVideoProjectBody(createEmptyProjectPayload("בדיקה"));
    assert.equal(parsed.ok, true);
    assert.equal(parsed.payload.name, "בדיקה");
    assert.equal(parsed.payload.aspectRatio, "16:9");
    assert.equal(parsed.payload.scenes.length, 1);
  });

  test("rejects missing name", () => {
    assert.equal(parseVideoProjectBody({ name: "", scenes: [] }).ok, false);
  });

  test("rejects invalid duration", () => {
    const parsed = parseVideoProjectBody({
      name: "x",
      aspectRatio: "16:9",
      scenes: [{ ...defaultScene(), durationSec: 0 }],
    });
    assert.equal(parsed.ok, false);
  });
});

describe("computePreviewTotalDurationSec", () => {
  test("sums scene durations", () => {
    assert.equal(
      computePreviewTotalDurationSec([
        { durationSec: 3 },
        { durationSec: 5 },
      ]),
      8
    );
  });
});

describe("local storage CRUD", () => {
  /** @type {string | null} */
  let projectId = null;

  test("create draft project", async () => {
    const created = await createVideoProject(createEmptyProjectPayload("טיוטת בדיקה"));
    assert.equal(created.ok, true);
    projectId = created.project.id;
    assert.ok(projectId);
    const list = await listVideoProjects();
    assert.ok(list.some((p) => p.id === projectId));
  });

  test("add scene via update", async () => {
    assert.ok(projectId);
    const existing = await getVideoProject(projectId);
    assert.equal(existing.ok, true);
    const scenes = [...existing.project.scenes, defaultScene()];
    const updated = await updateVideoProject(projectId, {
      ...createEmptyProjectPayload(existing.project.name),
      scenes,
    });
    assert.equal(updated.ok, true);
    assert.equal(updated.project.scenes.length, 2);
  });

  test("upload media asset", async () => {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const saved = await saveMediaAsset(png, "image/png", "test.png");
    assert.equal(saved.ok, true);
    assert.match(String(saved.asset.url), /^\/admin-video-assets\/uploads\//);
  });

  test("delete project cleans up", async () => {
    assert.ok(projectId);
    const deleted = await deleteVideoProject(projectId);
    assert.equal(deleted.ok, true);
    const after = await getVideoProject(projectId);
    assert.equal(after.ok, false);
  });
});

describe("MP4 export", () => {
  test("returns Hebrew error when ffmpeg unavailable", async () => {
    const available = await checkFfmpegAvailable();
    if (available) {
      assert.ok(true, "ffmpeg available locally — skip unavailable test");
      return;
    }
    const created = await createVideoProject(createEmptyProjectPayload("export-test"));
    const result = await exportVideoProjectMp4(created.project);
    assert.equal(result.ok, false);
    assert.equal(result.code, "ffmpeg_unavailable");
    assert.match(result.message, /ffmpeg/);
    await deleteVideoProject(created.project.id);
  });

  test("creates MP4 file when ffmpeg available", async () => {
    const available = await checkFfmpegAvailable();
    if (!available) {
      assert.ok(true, "ffmpeg not installed — skip export test");
      return;
    }

    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const media = await saveMediaAsset(png, "image/png", "export-scene.png");
    assert.equal(media.ok, true);

    const payload = createEmptyProjectPayload("ייצוא בדיקה");
    payload.scenes[0] = {
      ...payload.scenes[0],
      title: "שלום",
      subtitle: "עולם",
      mediaAssetId: media.asset.id,
      durationSec: 2,
      bgType: "colorful",
      animation: "fade",
    };

    const created = await createVideoProject(payload);
    const result = await exportVideoProjectMp4(created.project);
    assert.equal(result.ok, true, result.message || "export failed");
    const outputPath = join(ROOT, "public", result.outputMp4Path.replace(/^\//, ""));
    assert.ok(existsSync(outputPath), "MP4 file should exist on disk");
    await deleteVideoProject(created.project.id);
  });
});

describe("preview component contract", () => {
  test("preview player component exists with play control", () => {
    const src = readSrc("components/admin/video-builder/AdminVideoPreviewPlayer.jsx");
    assert.match(src, /AdminVideoScenePreview/);
    assert.match(src, /VB_PREVIEW_PLAY/);
    assert.match(src, /computePreviewTotalDurationSec/);
  });
});
