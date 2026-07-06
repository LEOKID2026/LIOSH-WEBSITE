/**
 * Transform MLEO mleo-miners.js → LeoMinersGame.jsx (line-safe)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.resolve(root, "../../MLEO-GAME/game/mleo-miners.js");
const out = path.resolve(root, "components/leo-miners/LeoMinersGame.jsx");

const lines = fs.readFileSync(src, "utf8").split(/\r?\n/);
const outLines = [];

const header = `import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

`;

let i = 0;
// skip old imports (lines 0-19 approx)
while (i < lines.length && !lines[i].includes('// --- iOS 100vh fix')) i++;
outLines.push(header.trimEnd(), "");

function skipUntil(marker) {
  while (i < lines.length && !lines[i].includes(marker)) i++;
}

function copyUntil(endMarker, includeEnd = false) {
  while (i < lines.length) {
    const line = lines[i];
    if (line.includes(endMarker)) {
      if (includeEnd) outLines.push(line);
      break;
    }
    outLines.push(line);
    i++;
  }
}

// Copy from iOS fix through S_GIFT
copyUntil("// ==== On-chain Claim");
// skip on-chain block
skipUntil("// ===== Debug helpers");
copyUntil("// ===== Mining Economy Layer");
// skip mining economy through END PART 1
skipUntil("// === END PART 1 ===");
outLines.push("// === END PART 1 ===", "");
i++;

// Copy rest until export default function MleoMiners
while (i < lines.length && !lines[i].includes("export default function MleoMiners")) {
  outLines.push(lines[i]);
  i++;
}

// Replace component signature
if (i < lines.length) {
  outLines.push(`export default function LeoMinersGame({
  economy = null,
  dbReady = false,
  rewardsEnabled = false,
  serverPendingPoints = 0,
  studentLabel = "",
  backHref = "/game",
  statusMessage = "",
}) {`);
  i++;
}

// Copy rest of file
while (i < lines.length) {
  outLines.push(lines[i]);
  i++;
}

let code = outLines.join("\n");

// --- string replacements ---
const reps = [
  [/import Layout from "\.\.\/components\/Layout";\n/g, ""],
  [/import \{ useConnectModal[\s\S]*?from "\.\.\/lib\/minersEconomyClient";\n/g, ""],
  [/const LS_KEY = "mleoMiners_v5_85"/, 'const LS_KEY = "liosh_miners_board_v1"'],
  [/const TERMS_VERSION[\s\S]*?const TERMS_KEY = `[^`]+`;\n/, ""],
  [/const IMG_BG\s+=\s+"\/images\/bg-cave\.png"/, 'const IMG_BG    = "/images/leo-miners/bg-cave.png"'],
  [/const IMG_MINER = "\/images\/leo-miner-4x\.png"/, 'const IMG_MINER = "/images/leo-miners/leo-miner-4x.png"'],
  [/const IMG_ROCK  = "\/images\/rock\.png"/, 'const IMG_ROCK  = "/images/leo-miners/rock.png"'],
  [/const IMG_COIN  = "\/images\/silver\.png"/, 'const IMG_COIN  = "/images/leo-miners/silver.png"'],
  [/const IMG_SPAWN_ICON = "\/images\/coin4\.png"/, 'const IMG_SPAWN_ICON = "/images/leo-miners/spawn-icon.png"'],
  [/const IMG_TOKEN = "\/images\/coin3\.png";\n/, ""],
  [/IMG_TOKEN/g, "IMG_SPAWN_ICON"],
  [/\/images\/bg-cave\$\{/g, "/images/leo-miners/bg-cave${"],
  [/`\/images\/rock\$\{/g, "`/images/leo-miners/rock${"],
  [/const S_CLICK = "\/sounds\//, 'const S_CLICK = "/sounds/leo-miners/'],
  [/const S_MERGE = "\/sounds\//, 'const S_MERGE = "/sounds/leo-miners/'],
  [/const S_ROCK  = "\/sounds\//, 'const S_ROCK  = "/sounds/leo-miners/'],
  [/const S_GIFT  = "\/sounds\//, 'const S_GIFT  = "/sounds/leo-miners/'],
  [/src="\/sounds\/bg-music\.mp3"/g, 'src="/sounds/leo-miners/bg-music.mp3"'],
  [/const router = useRouter\(\);\n/, ""],
  [/  const \{ openConnectModal \} = useConnectModal\(\);\n[\s\S]*?const \{ disconnect \} = useDisconnect\(\);\n\n/, ""],
  [/  const \[showTerms, setShowTerms\] = useState\(false\);\n/, ""],
  [/  const \[firstTimeNeedsTerms, setFirstTimeNeedsTerms\] = useState\(false\);\n/, ""],
  [/  const \[adCooldownUntil, setAdCooldownUntil\] = useState\(0\);\n/, ""],
  [/  const \[showAdModal, setShowAdModal\] = useState\(false\);\n/, ""],
  [/  const \[adVideoEnded, setAdVideoEnded\] = useState\(false\);\n/, ""],
  [/  const \[showMleoModal, setShowMleoModal\] = useState\(false\);\n/, ""],
  [
    /const \[mining, setMining\] = useState\([\s\S]*?\}\);\n/,
    `const [pendingPoints, setPendingPoints] = useState(serverPendingPoints);
  useEffect(() => { setPendingPoints(serverPendingPoints); }, [serverPendingPoints]);
`,
  ],
  [/queueMinerBreakAccrual\(/g, "__QACCRUE__("],
  [
    /__QACCRUE__\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g,
    "(dbReady && rewardsEnabled && economy ? economy.queueRockBreak($1, $2, $3) : undefined)",
  ],
  [/flushMinerBreakAccrual\(\)/g, "economy?.flushPendingAccrual?.()"],
  [/fetchMinersState\(\)/g, "economy?.fetchState?.()"],
  [/registerMinersStateSync\([^)]*\)/g, "undefined"],
  [/claimMinerBalanceToVault\([^)]*\)/g, "Promise.resolve(null)"],
  [/claimMinerToWallet\([^)]*\)/g, "Promise.resolve(null)"],
  [/claimMinerHourlyGift\([^)]*\)/g, "Promise.resolve(null)"],
  [/<Layout>/g, "<>"],
  [/<\/Layout>/g, "</>"],
  [/function backSafe\(\)\{[\s\S]*?\}/, "function backSafe(){ window.location.href = backHref; }"],
  [/formatMleoShort/g, "formatPointsShort"],
  [/formatMleo2/g, "formatPoints2"],
  [/formatMleo\(/g, "formatPoints("],
  [/formatMleoVault/g, "formatPointsShort"],
  [/mleoBaseForStage/g, "pointsBaseForStage"],
  [/MLEO_TABLE/g, "POINTS_TABLE"],
  [/pendingOfflineMleo/g, "pendingOfflinePoints"],
  [/offlineAddedMleo/g, "offlineAddedPoints"],
  [/addMleo/g, "addPoints"],
  [/mleoTxt/g, "pointsTxt"],
  [/baseForBreak/g, "pointsForBreak"],
  [/ "mleo_/g, ' "liosh_miners_'],
  [/localStorage\.getItem\("mleo_/g, 'localStorage.getItem("liosh_miners_'],
  [/localStorage\.setItem\("mleo_/g, 'localStorage.setItem("liosh_miners_'],
  [/ MLEO/g, " נקודות"],
  [/MLEO/g, "נקודות"],
  [/\+\$\{formatPointsShort\(eff \|\| 0\)\} נקודות/g, "+${formatPointsShort(eff || 0)} נקודות כרייה"],
];

for (const [re, rep] of reps) code = code.replace(re, rep);

// Remove wallet menu block
code = code.replace(/\{\/\* Wallet \*\/\}[\s\S]*?\{\/\* SFX \*\/\}/, "{/* SFX */}");

// Remove ad modal
code = code.replace(/\{showAdModal && \([\s\S]*?\)\}\s*\n/, "");

// Status banner
code = code.replace(
  /(ref=\{wrapRef\}[\s\S]*?style=\{\{[\s\S]*?\}\}\s*>)/,
  `$1
        {statusMessage ? (
          <div className="absolute inset-x-0 top-0 z-[5000] bg-amber-600/95 text-white text-center text-sm font-bold py-2 px-3">
            {statusMessage}
          </div>
        ) : null}`
);

// Replace onClaimMined with onClaimRewards
code = code.replace(/async function onClaimMined\(\)[\s\S]*?\n\}/m, `async function onClaimRewards() {
  try { play?.(S_CLICK); } catch {}
  if (!dbReady || !rewardsEnabled || !economy) {
    setGiftToastWithTTL("שמירת פרסים בשרת לא פעילה עדיין");
    return;
  }
  try {
    await economy.flushPendingAccrual?.();
    const resp = await economy.claimCoins?.();
    if (!resp?.ok) {
      setGiftToastWithTTL(resp?.message || "לא ניתן לאסוף פרס כרגע");
      return;
    }
    if (resp.duplicate) return;
    if (resp.coinsGranted > 0) {
      setGiftToastWithTTL(\`קיבלת \${resp.coinsGranted} מטבעות ליאו!\`);
    } else {
      setGiftToastWithTTL("אין נקודות כרייה לאיסוף");
    }
  } catch (err) {
    console.error(err);
    setGiftToastWithTTL("שגיאה באיסוף פרס");
  }
}`);

code = code.replace(/onClaimMined/g, "onClaimRewards");
code = code.replace(/onClaimMinedToWallet/g, "onClaimRewards");

// Remove wallet helper functions
code = code.replace(/function openWalletModalUnified\(\)[\s\S]*?\n\}/m, "");
code = code.replace(/function toggleWallet\(\)[\s\S]*?\n\}/m, "");
code = code.replace(/function hardDisconnect\(\)[\s\S]*?\n\}/m, "");
code = code.replace(/async function claimBalanceToVaultDemo\(\)[\s\S]*?\n\}/m, "");

// Stub mining state helpers that may remain
code = code.replace(/function loadMiningState\(\)[\s\S]*?return getDefaultMiningState\(\);\n\}/m, "function loadMiningState(){ return { balance: pendingPoints }; }");
code = code.replace(/function saveMiningState\(\)[\s\S]*?\n\}/m, "function saveMiningState(){}");
code = code.replace(/function getDefaultMiningState\(\)[\s\S]*?\n\}/m, "");
code = code.replace(/function normalizeMiningState\([\s\S]*?\n\}/m, "");
code = code.replace(/function mergeMiningState\([\s\S]*?\n\}/m, "function mergeMiningState(prev,patch){ return { ...prev, ...patch }; }");
code = code.replace(/function applyMiningServerSnapshot\([\s\S]*?\n\}/m, "function applyMiningServerSnapshot(patch){ if(patch?.balance!=null)setPendingPoints(Number(patch.balance)); return patch; }");
code = code.replace(/setMining\(/g, "setPendingPointsWrapper(");
code = code.replace(/function setPendingPointsWrapper\(v\)\{[\s\S]*?\}/, "");
code = code.replace(/setPendingPointsWrapper\(/g, "(");

// Hebrew UI
code = code.replace(/Settings/g, "הגדרות");
code = code.replace(/title="Back"/g, 'title="חזרה"');
code = code.replace(/aria-label="Back"/g, 'aria-label="חזרה"');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, code, "utf8");
console.log("OK", out, code.length);
