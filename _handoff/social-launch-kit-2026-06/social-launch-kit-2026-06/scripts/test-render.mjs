import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "source", "test-render.png");
const htmlPath = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "source", "test-render.html");

writeFileSync(
  htmlPath,
  `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
  html,body{margin:0;width:1080px;height:1080px;background:linear-gradient(145deg,#050816,#0b1020);color:#fff;font-family:'Segoe UI',Arial,sans-serif;}
  .wrap{padding:80px;display:flex;flex-direction:column;gap:24px;}
  h1{font-size:72px;margin:0;}
  p{font-size:36px;color:rgba(255,255,255,.8);}
  </style></head><body><div class="wrap"><h1>פיילוט קיץ חינמי</h1><p>לילדים בכיתות א׳–ו׳</p></div></body></html>`
);

const browser = await chromium.launch();
const page = await browser.newPage({ locale: "he-IL" });
await page.setViewportSize({ width: 1080, height: 1080 });
await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "load" });
await page.waitForTimeout(500);
await page.screenshot({ path: out, type: "png" });
await browser.close();
console.log("wrote", out);
