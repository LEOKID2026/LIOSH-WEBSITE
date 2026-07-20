/**
 * Server validation for public writing demo generation.
 * @module lib/writing/writing-public-demo-allowlist.server
 */

import {
  PUBLIC_WRITING_DEMO_LIMITS,
  PUBLIC_WRITING_DEMO_PRESETS,
  getPublicWritingDemoPreset,
} from "../../data/writing/public-demo-allowlist.js";
import { validatePublicWritingDemo as validatePublicWritingDemoRequest } from "./writing-validate.server.js";

/**
 * @param {Partial<{
 *   presetId: string,
 *   demoPresetId: string,
 *   writingCategory: string,
 *   seed?: number,
 *   inkSave?: boolean,
 * }> & Record<string, unknown>} params
 * @returns {{ ok: true, normalized: Record<string, unknown>, presetId?: string } | { ok: false, error: string }}
 */
export function validatePublicWritingDemoGenerationParams(params) {
  const validated = validatePublicWritingDemoRequest(params || {});
  if (!validated.ok) {
    return { ok: false, error: validated.code };
  }

  return {
    ok: true,
    normalized: {
      ...validated.request,
      worksheetType: "writing",
      lineCount: Math.min(validated.request.lineCount, PUBLIC_WRITING_DEMO_LIMITS.maxLines),
      itemsPerLine: Math.min(
        validated.request.itemsPerLine,
        PUBLIC_WRITING_DEMO_LIMITS.maxCharsPerLine
      ),
      seed: validated.request.seed,
      inkSave: validated.request.inkSave === true,
    },
    ...(validated.presetId ? { presetId: validated.presetId } : {}),
  };
}

export {
  PUBLIC_WRITING_DEMO_PRESETS,
  PUBLIC_WRITING_DEMO_LIMITS,
  getPublicWritingDemoPreset,
};
