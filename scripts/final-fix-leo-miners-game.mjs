import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../components/leo-miners/LeoMinersGame.jsx");
let c = fs.readFileSync(file, "utf8");

const start = "      {/* נקודות quick modal";
const end = "      })()}\n\n\n    </div>";
const i = c.indexOf(start);
const j = c.indexOf(end, i);
if (i >= 0 && j > i) {
  c = c.slice(0, i) + "    </div>" + c.slice(j + end.length - "    </div>".length);
  console.log("removed broken modal block");
} else {
  console.log("modal block not found", i, j);
}

if (!c.includes("useMemo")) {
  c = c.replace(
    'import { useEffect, useRef, useState, useCallback } from "react";',
    'import { useEffect, useRef, useState, useCallback, useMemo } from "react";'
  );
}

if (!c.includes("const mining = useMemo")) {
  c = c.replace(
    "  useEffect(() => { setPendingPoints(serverPendingPoints); }, [serverPendingPoints]);\n",
    `  useEffect(() => { setPendingPoints(serverPendingPoints); }, [serverPendingPoints]);
  const mining = useMemo(
    () => ({
      balance: pendingPoints,
      minedToday: 0,
      vault: 0,
      minersVault: pendingPoints,
      claimedTotal: 0,
    }),
    [pendingPoints]
  );
`
  );
}

c = c.replace(/<h3 className="text-sm font-semibold opacity-80">Sound<\/h3>/, '<h3 className="text-sm font-semibold opacity-80">צלילים</h3>');
c = c.replace(/SFX: \{sfxMuted \? "Off" : "On"\}/, 'סאונד: {sfxMuted ? "כבוי" : "פועל"}');
c = c.replace(/Music: \{musicMuted \? "Off" : "On"\}/, 'מוזיקה: {musicMuted ? "כבוי" : "פועל"}');

fs.writeFileSync(file, c);
console.log("done", c.length);
