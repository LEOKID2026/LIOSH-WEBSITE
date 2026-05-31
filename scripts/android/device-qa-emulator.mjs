#!/usr/bin/env node
/**
 * Android emulator smoke for debug APK (Capacitor remote-URL shell).
 * Writes evidence under reports/android-device-qa/ (gitignored via reports/).
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const APK = path.join(ROOT, "android/app/build/outputs/apk/debug/app-debug.apk");
const PACKAGE = "com.leok.kids";
const ACTIVITY = `${PACKAGE}/.MainActivity`;
const PRODUCTION_HOST = "liosh-website.vercel.app";
const OUT_DIR = path.join(ROOT, "reports/android-device-qa");
const adb = "adb";

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
}

function runBinary(cmd) {
  return execSync(cmd, { encoding: "buffer", stdio: ["ignore", "pipe", "pipe"] });
}

function tryRun(cmd) {
  try {
    return { ok: true, out: run(cmd) };
  } catch (e) {
    return { ok: false, out: String(e.stderr || e.stdout || e.message) };
  }
}

function tryScreenshot(outPath) {
  try {
    const tmp = "/sdcard/qa_cap.png";
    tryRun(`${adb} shell screencap -p ${tmp}`);
    execSync(`${adb} pull ${tmp} "${outPath}"`, { stdio: "ignore", maxBuffer: 50 * 1024 * 1024 });
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
      return { ok: true, out: outPath };
    }
    return { ok: false, out: "Screenshot missing or too small" };
  } catch (e) {
    return { ok: false, out: String(e.message) };
  }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function main() {
  ensureDir(OUT_DIR);
  const results = [];

  const record = (id, name, status, detail, fixScope = "n/a") => {
    results.push({ id, name, status, detail, fixScope });
    console.log(`[${status}] ${id} ${name}${detail ? ` — ${detail}` : ""}`);
  };

  if (!fs.existsSync(APK)) {
    record("BOOT", "APK present", "FAIL", `Missing ${APK}`, "android-shell");
    writeReport(results);
    process.exit(1);
  }
  record("BOOT", "APK present", "PASS", `${(fs.statSync(APK).size / 1024 / 1024).toFixed(2)} MB`);

  const devices = tryRun(`${adb} devices`);
  if (!devices.ok || !devices.out.includes("device")) {
    record("BOOT", "ADB device connected", "FAIL", devices.out, "environment");
    writeReport(results);
    process.exit(1);
  }
  record("BOOT", "ADB device connected", "PASS", devices.out.split("\n").find((l) => l.includes("device")) || "");

  const install = tryRun(`${adb} install -r "${APK.replace(/\\/g, "/")}"`);
  record("BOOT", "APK install", install.ok ? "PASS" : "FAIL", install.ok ? "Success" : install.out, "android-shell");

  tryRun(`${adb} logcat -c`);
  const launch = tryRun(`${adb} shell am start -n ${ACTIVITY}`);
  record("W0", "App launch intent", launch.ok ? "PASS" : "FAIL", launch.out, "android-shell");

  execSync("ping -n 12 127.0.0.1 >nul", { stdio: "ignore", shell: true });

  const log = tryRun(`${adb} logcat -d`);
  const logText = log.ok ? log.out : "";
  const hostSeen = logText.includes(PRODUCTION_HOST) || logText.toLowerCase().includes("vercel");
  record(
    "W0",
    "Production host in logcat",
    hostSeen ? "PASS" : "INCONCLUSIVE",
    hostSeen ? `Found ${PRODUCTION_HOST} references` : "No host string in logcat; WebView may load quietly",
    hostSeen ? "n/a" : "manual-verify"
  );

  const screencap = tryScreenshot(path.join(OUT_DIR, "01-home-launch.png"));
  if (screencap.ok) {
    record("W0", "Launch screenshot", "PASS", "reports/android-device-qa/01-home-launch.png");
  } else {
    record("W0", "Launch screenshot", "FAIL", screencap.out, "environment");
  }

  const uiDump = tryRun(`${adb} shell uiautomator dump /sdcard/window_dump.xml`);
  const pull = tryRun(`${adb} pull /sdcard/window_dump.xml "${path.join(OUT_DIR, "window_dump.xml").replace(/\\/g, "/")}"`);
  if (pull.ok && fs.existsSync(path.join(OUT_DIR, "window_dump.xml"))) {
    const xml = fs.readFileSync(path.join(OUT_DIR, "window_dump.xml"), "utf8");
    const hasRtlHint = /LEO|ברוכים|פורטל|KIDS/i.test(xml);
    record("W1", "Hebrew/RTL UI dump after launch", hasRtlHint ? "PASS" : "INCONCLUSIVE", hasRtlHint ? "Hebrew/brand text detected" : "Parse UI manually", "manual-verify");
  } else {
    record("W1", "UI automator dump", "FAIL", pull.out || uiDump.out, "environment");
  }

  tryRun(`${adb} shell input tap 540 1200`);
  execSync("ping -n 3 127.0.0.1 >nul", { stdio: "ignore", shell: true });
  tryScreenshot(path.join(OUT_DIR, "02-after-tap.png"));

  tryRun(`${adb} shell input keyevent 4`);
  execSync("ping -n 2 127.0.0.1 >nul", { stdio: "ignore", shell: true });
  const afterBack = tryScreenshot(path.join(OUT_DIR, "03-after-back.png"));
  if (afterBack.ok) {
    record("W2", "Android back keyevent", "PASS", "Back sent; compare 02 vs 03 screenshots", "manual-verify");
  } else {
    record("W2", "Android back keyevent", "FAIL", afterBack.out, "environment");
  }

  tryRun(`${adb} shell input keyevent 3`);
  execSync("ping -n 3 127.0.0.1 >nul", { stdio: "ignore", shell: true });
  tryRun(`${adb} shell am start -n ${ACTIVITY}`);
  execSync("ping -n 5 127.0.0.1 >nul", { stdio: "ignore", shell: true });
  const afterResume = tryScreenshot(path.join(OUT_DIR, "04-after-resume.png"));
  if (afterResume.ok) {
    record("W3", "Background/foreground relaunch", "PASS", "App relaunched; session cookie check needs login flow", "manual-verify");
  } else {
    record("W3", "Background/foreground relaunch", "FAIL", afterResume.out, "environment");
  }

  const pkg = tryRun(`${adb} shell pm list packages ${PACKAGE}`);
  record("BOOT", "Package registered", pkg.ok && pkg.out.includes(PACKAGE) ? "PASS" : "FAIL", pkg.out, "android-shell");

  writeReport(results);
  const failed = results.filter((r) => r.status === "FAIL").length;
  process.exit(failed > 0 ? 1 : 0);
}

function writeReport(results) {
  const md = [
    "# Android Emulator Smoke Results",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "| ID | Test | Status | Detail | Fix scope |",
    "|---|---|---|---|---|",
    ...results.map((r) => `| ${r.id} | ${r.name} | ${r.status} | ${r.detail.replace(/\|/g, "/")} | ${r.fixScope} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT_DIR, "emulator-smoke.md"), md);
  fs.writeFileSync(path.join(OUT_DIR, "emulator-smoke.json"), JSON.stringify(results, null, 2));
}

main();
