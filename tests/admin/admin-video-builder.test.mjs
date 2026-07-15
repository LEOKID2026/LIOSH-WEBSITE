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
  deleteMediaAsset,
  exportVideoProjectMp4,
  getMediaAssetById,
  getVideoProject,
  listVideoProjects,
  parseVideoProjectBody,
  saveMediaAsset,
  setVideoProjectArchived,
  updateVideoProject,
} from "../../lib/admin-server/admin-video-builder.server.js";
import { computePreviewTotalDurationSec } from "../../lib/admin-portal/admin-video-builder-utils.js";
import { getExportDimensions, VB_ASPECT_RATIOS } from "../../lib/admin-portal/admin-video-builder-catalog.js";
import { VB_FFMPEG_UNAVAILABLE } from "../../lib/admin-portal/admin-video-builder-ui.he.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("admin video builder - page & auth contract", () => {
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
      "pages/api/admin/video-builder/media/[id].js",
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

  test("accepts extended style fields", () => {
    const parsed = parseVideoProjectBody({
      name: "x",
      aspectRatio: "16:9",
      scenes: [
        {
          ...defaultScene(),
          bgType: "gradient_ocean",
          animation: "slide_up",
          titleColor: "#fbbf24",
          subtitleColor: "#ffffff",
          titleSize: "lg",
          textShadow: "strong",
          mediaOverlay: "dim",
          transitionOut: "fade_black",
          textBg: "soft",
          fontFamily: "arial",
          titleBold: true,
          mediaPosition: "top",
          mediaScale: "lg",
          mediaFit: "cover",
        },
      ],
      exportQuality: "720p",
      defaultTransition: "crossfade",
      voiceoverVolume: 90,
      backgroundMusicVolume: 25,
      watermarkPosition: "bottom_left",
    });
    assert.equal(parsed.ok, true);
    assert.equal(parsed.payload.scenes[0].bgType, "gradient_ocean");
    assert.equal(parsed.payload.scenes[0].titleColor, "#fbbf24");
    assert.equal(parsed.payload.scenes[0].transitionOut, "fade_black");
    assert.equal(parsed.payload.exportQuality, "720p");
    assert.equal(parsed.payload.voiceoverVolume, 90);
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

describe("aspect ratios", () => {
  test("accepts 4:5 and 4:3", () => {
    for (const ratio of ["4:5", "4:3"]) {
      const parsed = parseVideoProjectBody({
        name: "ratio",
        aspectRatio: ratio,
        scenes: [defaultScene()],
      });
      assert.equal(parsed.ok, true, ratio);
      assert.equal(parsed.payload.aspectRatio, ratio);
    }
  });

  test("export dimensions for portrait feed", () => {
    assert.deepEqual(getExportDimensions("4:5", "1080p"), { width: 1080, height: 1350 });
    assert.deepEqual(getExportDimensions("4:3", "720p"), { width: 960, height: 720 });
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
    const all = await listVideoProjects({ includeArchived: true });
    assert.ok(all.some((p) => p.id === projectId));
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

    const deleted = await deleteMediaAsset(saved.asset.id);
    assert.equal(deleted.ok, true);
    const after = await getMediaAssetById(saved.asset.id);
    assert.equal(after, null);
  });

  test("delete project cleans up", async () => {
    assert.ok(projectId);
    const deleted = await deleteVideoProject(projectId);
    assert.equal(deleted.ok, true);
    const after = await getVideoProject(projectId);
    assert.equal(after.ok, false);
  });

  test("archive hides project from default list", async () => {
    const created = await createVideoProject(createEmptyProjectPayload("ארכיון בדיקה"));
    assert.equal(created.ok, true);
    const id = created.project.id;
    const archived = await setVideoProjectArchived(id, true);
    assert.equal(archived.ok, true);
    assert.equal(archived.project.archived, true);
    const visible = await listVideoProjects();
    assert.ok(!visible.some((p) => p.id === id));
    const all = await listVideoProjects({ includeArchived: true });
    assert.ok(all.some((p) => p.id === id && p.archived));
    await deleteVideoProject(id);
  });
});

describe("MP4 export", () => {
  test("returns Hebrew error when ffmpeg unavailable", async () => {
    const available = await checkFfmpegAvailable();
    if (available) {
      assert.ok(true, "ffmpeg available locally - skip unavailable test");
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
      assert.ok(true, "ffmpeg not installed - skip export test");
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
    assert.match(src, /AdminVideoTimeline/);
  });

  test("editor includes project settings and auto-save", () => {
    const src = readSrc("components/admin/video-builder/AdminVideoBuilderEditor.jsx");
    assert.match(src, /AdminVideoInspector/);
    assert.match(src, /AdminVideoSceneRail/);
    assert.match(src, /backgroundMusicAssetId/);
    assert.match(src, /AUTO_SAVE_MS/);
    assert.match(src, /vb-editor-workspace/);
  });

  test("media library component has delete control", () => {
    const src = readSrc("components/admin/video-builder/AdminVideoMediaLibrary.jsx");
    assert.match(src, /VB_MEDIA_DELETE/);
    assert.match(src, /method: "DELETE"/);
  });
});
