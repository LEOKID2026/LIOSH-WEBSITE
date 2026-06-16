#!/usr/bin/env node
import fs from "fs";

const FILE = "utils/math-explanations.js";
let s = fs.readFileSync(FILE, "utf8");

s = s.replace(/\$\{M\(`([\s\S]*?)`\n\s*\)\}/g, "${M(`$1`)}");

fs.writeFileSync(FILE, s);
console.log("fixed broken M() splits");
