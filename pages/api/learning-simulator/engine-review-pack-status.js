/**
 * Internal-only: read expert-review / engine gate JSON artifacts from disk.
 * Gate: NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN=true and ENGINE_REVIEW_ADMIN_TOKEN header.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isProductionRuntime } from "../../../lib/security/production-guard.js";
import { validateEngineReviewAdminToken } from "../../../lib/security/admin-token.js";

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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ code: "method_not_allowed", error: "Method not allowed" });
  }
  if (process.env.NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN !== "true") {
    return res.status(403).json({ code: "admin_disabled", error: "NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN is not true" });
  }

  const auth = validateEngineReviewAdminToken(req, ["x-engine-review-token", "x-admin-token"]);
  if (!auth.ok) {
    return res.status(auth.status).json({ code: auth.code, error: auth.error });
  }

  const maskInternals = isProductionRuntime();
  const deployment = maskInternals ? { kind: "masked" } : deploymentInfo();
  const base = join(process.cwd(), "reports/learning-simulator/engine-professionalization");
  const readJson = async (rel) => {
    try {
      return JSON.parse(await readFile(join(base, rel), "utf8"));
    } catch {
      return null;
    }
  };

  const packMeta = await readJson("expert-review-pack/manifest.json");
  const engineFinal = await readJson("engine-final-summary.json");
  const profVal = await readJson("professional-engine-validation.json");

  return res.status(200).json({
    ok: true,
    code: "ok",
    deployment,
    artifactBaseRelative: maskInternals
      ? null
      : "reports/learning-simulator/engine-professionalization",
    expertReviewIndexRelative: maskInternals
      ? null
      : "reports/learning-simulator/engine-professionalization/expert-review-pack/index.md",
    packMeta,
    engineFinal,
    profVal,
    hasPack: Boolean(packMeta?.generatedAt),
  });
}
