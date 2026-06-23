import fs from "fs";
const files = [
  "data/hebrew-literacy-g1/literacy-pool-builder.js",
  "data/hebrew-literacy-g2/literacy-pool-builder.js",
];
files.forEach((f) => {
  const content = fs.readFileSync(f, "utf8");
  const lines = content.split("\n");
  const hebrewLines = lines.filter((l) => /[\u05d0-\u05ea]/.test(l));
  const niqqudLines = lines.filter((l) => /[\u0591-\u05C7]/.test(l));
  console.log(
    f.split("/").pop() +
      ": total=" + lines.length +
      " hebrew=" + hebrewLines.length +
      " with-niqqud=" + niqqudLines.length +
      " without=" + (hebrewLines.length - niqqudLines.length)
  );
});
