/**
 * Internal-only: build Expert Review Pack snapshot from existing artifacts; returns JSON/Markdown (no writes under reports/).
 * Requires ENGINE_REVIEW_ADMIN_TOKEN and NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=true.
 */
import { buildExpertReviewPackSnapshot } from "../../../utils/expert-review-pack-artifact-snapshot.js";
import { timingSafeCompareStrings } from "../../../lib/security/timing-safe-equal.js";

function deploymentInfo() {
  const vercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  const awsLambda = Boolean(process.env.AWS_EXECUTION_ENV || process.env.LAMBDA_TASK_ROOT);
  const serverless = vercel || awsLambda;
  let kind = "unknown";
  if (serverless) kind = "serverless";
  else if (process.env.NODE_ENV === "development") kind = "local_dev";
  else kind = "long_running";

  return {
    kind,
    filesystemEphemeral: serverless,
    vercel,
    awsLambda,
    nodeEnv: process.env.NODE_ENV || null,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ code: "method_not_allowed", error: "Method not allowed" });
  }

  if (process.env.NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN !== "true") {
    return res.status(403).json({
      code: "admin_disabled",
      error: "Engine review admin is disabled. Set NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=true",
    });
  }

  const expected = process.env.ENGINE_REVIEW_ADMIN_TOKEN;
  const headerToken = req.headers["x-engine-review-token"];
  const sent = typeof headerToken === "string" ? headerToken.trim() : "";

  if (!expected || String(expected).trim() === "") {
    return res.status(503).json({
      code: "missing_token",
      error: "ENGINE_REVIEW_ADMIN_TOKEN is not configured on the server",
      message: "ENGINE_REVIEW_ADMIN_TOKEN is not configured on the server",
    });
  }

  if (!sent) {
    return res.status(401).json({
      code: "missing_token",
      error: "Missing x-engine-review-token header",
      message: "Missing x-engine-review-token header",
    });
  }

  if (!timingSafeCompareStrings(sent, String(expected).trim())) {
    return res.status(401).json({
      code: "invalid_token",
      error: "x-engine-review-token does not match server configuration",
      message: "x-engine-review-token does not match server configuration",
    });
  }

  const deployment = deploymentInfo();

  try {
    const built = await buildExpertReviewPackSnapshot(process.cwd());

    return res.status(200).json({
      ok: true,
      code: "ok",
      delivery: "inline_json",
      generationMode: built.manifest?.generationMode || "artifact_snapshot_v1",
      generatedAt: built.manifest?.generatedAt,
      scenarioCount: built.manifest?.scenarioCount,
      requiresHumanExpertReview: built.manifest?.requiresHumanExpertReview !== false,
      deployment,
      manifest: built.manifest,
      summary: built.summary,
      indexMarkdown: built.indexMarkdown,
      summaryMarkdown: built.summaryMarkdown,
      manifestJson: built.manifestJson,
      summaryJson: built.summaryJson,
      scenarios: built.scenarios.map((s) => ({
        scenarioId: s.scenarioId,
        pass: s.pass,
        json: s.json,
        markdown: s.markdown,
      })),
      persistenceMessage:
        "Snapshot built in memory only - nothing written under reports/. Use the admin page downloads or run CLI locally to persist files.",
      cliFallback:
        "Persist a full tree under reports/ locally: npm run qa:learning-simulator:expert-review-pack (after validation PASS).",
    });
  } catch (e) {
    const msg = String(e?.message || e);
    const isAssert = msg.includes("Expert review pack (artifact mode) QA failed:");
    if (isAssert) {
      return res.status(422).json({
        ok: false,
        code: "validation_artifact_not_ready",
        message: msg.replace(/^Error:\s*/, ""),
        cliFallback: "Run npm run qa:learning-simulator:professional-engine (PASS), then retry.",
      });
    }
    return res.status(500).json({
      ok: false,
      code: "generation_failed",
      message:
        "Could not build snapshot from artifacts on this server. Ensure professional-engine-validation.json exists and passes.",
      cliFallback: "npm run qa:learning-simulator:expert-review-pack",
    });
  }
}
