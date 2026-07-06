/**
 * Second-pass cleanup of LeoMinersGame.jsx — remove crypto/wallet/terms UI
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(__dirname, "../components/leo-miners/LeoMinersGame.jsx");
let code = fs.readFileSync(file, "utf8");

// Fix broken DEBUG key from global MLEO replace
code = code.replace(/const DEBUG_LS = "נקודות_DEBUG_UI"/, 'const DEBUG_LS = "liosh_miners_debug_ui"');

// Add formulas import after Link import
if (!code.includes("leo-miners-formulas.client")) {
  code = code.replace(
    'import Link from "next/link";\n',
    'import Link from "next/link";\nimport { pointsBaseForStage, OFFLINE_DPS_FACTOR, DAILY_CAP_DISPLAY } from "../../lib/leo-miners/leo-miners-formulas.client.js";\n'
  );
}

// Remove duplicate local definitions if any
code = code.replace(/const OFFLINE_DPS_FACTOR = 0\.35;\n/, "");
code = code.replace(/const DAILY_CAP = 2_500;\n/, "const DAILY_CAP = DAILY_CAP_DISPLAY;\n");

// Remove wallet address helper
code = code.replace(/\/\/ --- helper: shorten wallet address[\s\S]*?function shortAddr[\s\S]*?\}\n\n/, "");

// Remove wallet menu block (both occurrences)
code = code.replace(/\{\/\* Wallet \*\/\}[\s\S]*?\{\/\* SFX \*\/\}/g, "{/* SFX */}");
code = code.replace(/\{\/\* Wallet status[\s\S]*?<\/button>\s*\n/g, "");

// Remove terms modal blocks
code = code.replace(/\{showTerms && \([\s\S]*?\)\}\s*\n/g, "");
code = code.replace(/\{firstTimeNeedsTerms[\s\S]*?\)\}\s*\n/g, "");

// Remove mining modal with wallet/TGE
code = code.replace(/\{\/\* Mining modal[\s\S]*?\)\}\s*\n\s*\)\}\s*\n/g, "");

// Remove showMleoModal block
code = code.replace(/\{showMleoModal && \([\s\S]*?\)\}\s*\n/g, "");

// Remove legal terms content if any showTerms left
code = code.replace(/<h3 className="font-bold text-slate-900 mb-1">4\. Testnet[\s\S]*?<\/div>\s*\)\}\s*\n/g, "");

// Stub undefined wallet functions
code = code.replace(/onClick=\{openWalletModalUnified\}/g, "onClick={() => {}}");
code = code.replace(/onClick=\{toggleWallet\}/g, "onClick={() => {}}");

// Remove references to undefined vars
code = code.replace(/isConnected/g, "false");
code = code.replace(/address &&/g, "false &&");
code = code.replace(/openWalletModalUnified/g, "undefined");
code = code.replace(/toggleWallet/g, "undefined");
code = code.replace(/hardDisconnect/g, "undefined");
code = code.replace(/WalletReleaseBar/g, "null");
code = code.replace(/TgeCountdown/g, "null");
code = code.replace(/walletClaimEnabled\([^)]*\)/g, "false");
code = code.replace(/remainingWalletClaimRoom\(\)/g, "0");
code = code.replace(/TOKEN_LIVE/g, "false");
code = code.replace(/currentClaimPct\([^)]*\)/g, "0");
code = code.replace(/monthsSinceTGE\([^)]*\)/g, "-1");

// Remove syncMiningFromServer if broken
code = code.replace(/async function syncMiningFromServer\(\)[\s\S]*?\n\}/m, "async function syncMiningFromServer(){ return economy?.fetchState?.(); }");

// Hebrew diamond prizes
code = code.replace(/label: "Coins ×1000%/g, 'label: "מטבעות ×10');
code = code.replace(/label: "Dog \+3 levels"/g, 'label: "ליאו +3 רמות"');
code = code.replace(/label: "Coins ×10000%/g, 'label: "מטבעות ×100');
code = code.replace(/label: "Dog \+5 levels"/g, 'label: "ליאו +5 רמות"');
code = code.replace(/label: "Coins ×100000%/g, 'label: "מטבעות ×1000');
code = code.replace(/label: "Dog \+7 levels"/g, 'label: "ליאו +7 רמות"');

// Claim button disabled when no rewards
code = code.replace(/onClick=\{onClaimRewards\}/g, "onClick={onClaimRewards} disabled={!dbReady || !rewardsEnabled}");

fs.writeFileSync(file, code, "utf8");
console.log("cleanup done", code.length);
