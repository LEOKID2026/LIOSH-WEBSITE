import fs from "fs";

const path = "utils/math-explanations.js";
let s = fs.readFileSync(path, "utf8");
s = s.replace(/toSpan\(\s*\n(\s*)`(?!mix)/g, "toSpan(\n$1mix`");
fs.writeFileSync(path, s);
console.log("fixed multiline toSpan -> mix");
