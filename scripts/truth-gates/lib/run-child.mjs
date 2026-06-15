import { spawnSync } from "node:child_process";
import { TRUTH_GATES_ROOT } from "./env.mjs";

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ env?: Record<string, string> }} [opts]
 */
export function runChild(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    cwd: TRUTH_GATES_ROOT,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...opts.env },
  });
  return r.status ?? 1;
}

/**
 * @param {string} relScript under repo root
 */
export function runNodeScript(relScript, extraArgs = []) {
  return runChild("node", [relScript, ...extraArgs]);
}

/**
 * @param {string} relScript under repo root
 * @param {string[]} [extraArgs]
 * @param {{ env?: Record<string, string> }} [opts]
 */
export function runTsxScript(relScript, extraArgs = [], opts = {}) {
  return runChild("npx", ["tsx", relScript, ...extraArgs], opts);
}

/**
 * @param {string} testPath glob/path for node --test
 */
export function runNodeTest(testPath) {
  return runChild("node", ["--test", testPath]);
}
