/**
 * Insert column H "דוגמה בהקשר בדוח" into owner-review chunk Excel files.
 * Run: node scripts/parent-report-hebrew-owner-review-add-context-column.mjs
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import XLSX from "xlsx-js-style";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FOLDER = join(ROOT, "parent-report-hebrew-owner-review-chunks-with-meaning");
const INSERT_AT = 7; // H (0-based)
const NEEDS_REVIEW = "צריך לבדוק בהקשר מלא";
const SHEET_NAME = "לאישור";

function substitutePlaceholders(text) {
  return String(text || "")
    .replace(/\$\{lab\}/g, "חשבון")
    .replace(/\$\{core\}/g, "חשבון")
    .replace(/\$\{label\}/g, "חשבון")
    .replace(/\$\{displayName\}/g, "שברים")
    .replace(/\$\{displayTopicPhraseHe\([^)]*\)\}/g, "שברים")
    .replace(/\$\{statsLine\}/g, "לפי 146 שאלות, דיוק כ־51%.")
    .replace(/\$\{domRc\}/g, "טעויות בקריאת המשימה")
    .replace(/\$\{opening\}/g, "בחשבון")
    .replace(/\$\{acc\}/g, "51")
    .replace(/\$\{q\}/g, "146")
    .replace(/\$\{[^}]+\}/g, "[ערך]")
    .replace(/\s+/g, " ")
    .trim();
}

function wherePrefix(where) {
  const w = String(where || "").trim();
  if (!w) return "";
  if (w.includes("דוח מפורט") && w.includes("מקצוע")) return "בדוח המפורט, בכרטיס מקצוע: ";
  if (w.includes("דוח מפורט") && w.includes("נושא")) return "בדוח המפורט, בכרטיס נושא: ";
  if (w.includes("דוח מפורט")) return "בדוח המפורט: ";
  if (w.includes("דוח קצר")) return "בדוח הקצר: ";
  if (w.includes("כרטיס נושא")) return "בכרטיס נושא: ";
  if (w.includes("מצב נתונים") || w.includes("נתונים דלים")) return "במצב הנתונים בדוח: ";
  if (w.includes("המלצות") || w.includes("בית")) return "בהמלצות לבית: ";
  if (w.includes("תובנות") || w.includes("מה חשוב")) return "במה חשוב לדעת: ";
  if (w.includes("AI") || w.includes("מסביר")) return "בהסבר AI בדוח: ";
  const tail = w.includes("—") ? w.split("—").pop().trim() : w;
  return `ב${tail}: `;
}

function isFullSentence(text) {
  const t = String(text || "").trim();
  if (t.length < 35) return false;
  if (/^[\u0590-\u05FF]{1,18}$/.test(t)) return false;
  return /[.!?…]$/.test(t) || t.includes(" — ") || t.includes("כדאי") || t.includes("מומלץ");
}

function buildContextExample(where, problematic, suggested) {
  const whereStr = String(where || "").trim();
  const prob = substitutePlaceholders(problematic);
  const sugg = substitutePlaceholders(suggested);
  const prefix = wherePrefix(whereStr);

  if (!prob && !sugg) return NEEDS_REVIEW;

  // Suggested column often has the parent-ready sentence
  if (sugg && isFullSentence(sugg) && !/^…$/.test(sugg)) {
    const body = sugg.replace(/^·\s*/, "");
    return prefix ? `${prefix}${body}` : body;
  }

  if (prob && isFullSentence(prob)) {
    return prob.replace(/^·\s*/, "");
  }

  if (/^·\s/.test(prob)) {
    const body = (sugg && sugg.length > 4 ? sugg : prob).replace(/^·\s*/, "").replace(/…$/, "…");
    return `${prefix}${body}`;
  }

  if (prob.length <= 20) {
    if (/בירידה|^ירידה/.test(prob)) {
      return `${prefix}מופיע: ${prob === "בירידה" ? "ירידה בדיוק לאחרונה" : prob}.`;
    }
    if (/מגמת|דיוק/.test(prob)) {
      return `${prefix}מופיע: ${prob === "מגמת הדיוק" ? "שינוי בדיוק לאורך זמן" : prob}.`;
    }
    return `${prefix}${prob}.`;
  }

  if (prob.includes("[ערך]") && !sugg) return NEEDS_REVIEW;
  if (prob) return prefix ? `${prefix}${prob}` : prob;
  return NEEDS_REVIEW;
}

function shiftSheetColumns(sheet, insertAt) {
  const out = {};
  const ref = sheet["!ref"];
  if (!ref) return sheet;

  const range = XLSX.utils.decode_range(ref);
  range.e.c += 1;
  const nextRef = XLSX.utils.encode_range(range);
  sheet["!ref"] = nextRef;
  out["!ref"] = nextRef;

  const moves = [];
  for (const addr of Object.keys(sheet)) {
    if (addr[0] === "!") continue;
    const cell = sheet[addr];
    const { r, c } = XLSX.utils.decode_cell(addr);
    if (c >= insertAt) moves.push({ r, c, cell });
    else out[addr] = cell;
  }

  for (const { r, c, cell } of moves) {
    out[XLSX.utils.encode_cell({ r, c: c + 1 })] = cell;
  }

  if (sheet["!cols"]) {
    const cols = [...sheet["!cols"]];
    const hWidth = cols[insertAt] || { width: 44 };
    cols.splice(insertAt, 0, { ...hWidth, width: Math.max(hWidth.width || 44, 44) });
    out["!cols"] = cols;
  }

  out["!rows"] = sheet["!rows"];
  out["!merges"] = sheet["!merges"];
  return out;
}

function headerStyle() {
  return {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "1D4ED8" } },
    alignment: { horizontal: "right", vertical: "center", wrapText: true },
  };
}

function bodyStyleFrom(cell) {
  const base = cell?.s ? JSON.parse(JSON.stringify(cell.s)) : { patternType: "solid", fgColor: { rgb: "FFF2CC" } };
  if (!base.alignment) base.alignment = {};
  base.alignment.wrapText = true;
  base.alignment.horizontal = "right";
  base.alignment.vertical = "top";
  return base;
}

function processWorkbook(filePath) {
  const wb = XLSX.readFile(filePath, { cellStyles: true });
  const sh = wb.Sheets[SHEET_NAME];
  if (!sh) return { skipped: true, reason: `no sheet ${SHEET_NAME}` };

  const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: "" });
  if (!rows.length || rows[0].length < 9) return { skipped: true, reason: "unexpected columns" };

  // Backup original bytes for dataValidation graft
  const originalBytes = readFileSync(filePath);

  let newSh = shiftSheetColumns(sh, INSERT_AT);

  // Header
  const hAddr = XLSX.utils.encode_cell({ r: 0, c: INSERT_AT });
  newSh[hAddr] = { t: "s", v: "דוגמה בהקשר בדוח", s: headerStyle() };

  let filled = 0;
  let needsReview = 0;

  for (let r = 1; r < rows.length; r++) {
    const where = rows[r][1];
    const problematic = rows[r][2];
    const suggested = rows[r][4];
    const example = buildContextExample(where, problematic, suggested);
    if (example === NEEDS_REVIEW) needsReview++;
    else filled++;

    const oldH = newSh[XLSX.utils.encode_cell({ r, c: INSERT_AT + 1 })];
    const addr = XLSX.utils.encode_cell({ r, c: INSERT_AT });
    newSh[addr] = {
      t: "s",
      v: example,
      s: bodyStyleFrom(oldH),
    };
  }

  wb.Sheets[SHEET_NAME] = newSh;
  if (!wb.Workbook) wb.Workbook = {};
  if (!wb.Workbook.Views) wb.Workbook.Views = [{ RTL: true }];
  else wb.Workbook.Views[0] = { ...wb.Workbook.Views[0], RTL: true };

  XLSX.writeFile(wb, filePath);

  graftDataValidations(originalBytes, filePath);

  return { filled, needsReview, rows: rows.length - 1 };
}

function graftDataValidations(originalBytes, targetPath) {
  const tmp = join(ROOT, ".tmp-xlsx-graft");
  const origPath = join(tmp, "orig.xlsx");
  const ps1Path = join(tmp, "graft-data-validations.ps1");
  try {
    rmSync(tmp, { recursive: true, force: true });
    mkdirSync(tmp, { recursive: true });
    writeFileSync(origPath, originalBytes);
    writeFileSync(
      ps1Path,
      `param([string]$OrigPath, [string]$TargetPath)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$origZip = [System.IO.Compression.ZipFile]::OpenRead($OrigPath)
$origEntry = $origZip.GetEntry('xl/worksheets/sheet1.xml')
if ($null -eq $origEntry) { $origZip.Dispose(); exit 0 }
$origReader = New-Object System.IO.StreamReader($origEntry.Open())
$origXml = $origReader.ReadToEnd()
$origReader.Close()
$origZip.Dispose()
$dvMatch = [regex]::Match($origXml, '<dataValidations[\\s\\S]*?</dataValidations>')
if (-not $dvMatch.Success) { exit 0 }
$zip = [System.IO.Compression.ZipFile]::Open($TargetPath, [System.IO.Compression.ZipArchiveMode]::Update)
$entry = $zip.GetEntry('xl/worksheets/sheet1.xml')
if ($null -eq $entry) { $zip.Dispose(); exit 0 }
$newReader = New-Object System.IO.StreamReader($entry.Open())
$newXml = $newReader.ReadToEnd()
$newReader.Close()
$entry.Delete()
if ($newXml -match '<dataValidations') {
  $newXml = [regex]::Replace($newXml, '<dataValidations[\\s\\S]*?</dataValidations>', $dvMatch.Value)
} else {
  $newXml = $newXml.Replace('</worksheet>', ($dvMatch.Value + '</worksheet>'))
}
$newEntry = $zip.CreateEntry('xl/worksheets/sheet1.xml')
$newWriter = New-Object System.IO.StreamWriter($newEntry.Open())
$newWriter.Write($newXml)
$newWriter.Close()
$zip.Dispose()
`,
      "utf8"
    );
    execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${ps1Path}" -OrigPath "${origPath}" -TargetPath "${targetPath}"`,
      { stdio: "pipe" }
    );
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const files = readdirSync(FOLDER)
  .filter((f) => /^parent-report-hebrew-owner-review-\d+-rows-.*\.xlsx$/i.test(f))
  .sort();

let totalFilled = 0;
let totalNeedsReview = 0;
let totalRows = 0;
const updated = [];

for (const file of files) {
  const path = join(FOLDER, file);
  const result = processWorkbook(path);
  if (result.skipped) {
    console.warn("skipped", file, result.reason);
    continue;
  }
  updated.push(file);
  totalFilled += result.filled;
  totalNeedsReview += result.needsReview;
  totalRows += result.rows;
}

// Update README.txt
const readmePath = join(FOLDER, "README.txt");
const readme = readFileSync(readmePath, "utf8");
if (!readme.includes("דוגמה בהקשר בדוח")) {
  writeFileSync(
    readmePath,
    readme
      .replace(
        "G נוסח שלך\nH למה זה בעייתי\nI מקור טכני / ID",
        "G נוסח שלך\nH דוגמה בהקשר בדוח\nI למה זה בעייתי\nJ מקור טכני / ID"
      )
      .replace(
        "H למה זה בעייתי",
        "H דוגמה בהקשר בדוח\nI למה זה בעייתי"
      ),
    "utf8"
  );
}

const reportPath = join(FOLDER, "UPDATE-REPORT-context-column.txt");
writeFileSync(
  reportPath,
  [
    `Updated: ${new Date().toISOString()}`,
    `Files updated: ${updated.length}`,
    `Total data rows: ${totalRows}`,
    `Example context filled: ${totalFilled}`,
    `Needs full context review: ${totalNeedsReview}`,
    "",
    ...updated.map((f) => `- ${f}`),
  ].join("\n"),
  "utf8"
);

console.log(
  JSON.stringify(
    {
      filesUpdated: updated.length,
      totalRows,
      exampleFilled: totalFilled,
      needsReview: totalNeedsReview,
      folder: FOLDER,
    },
    null,
    2
  )
);
