/** Header title: "מתמטיקה — כיתה א׳" instead of "ספר מתמטיקה — כיתה א׳". */
export function formatBookShellTitleHe(bookTitleHe) {
  return String(bookTitleHe || "")
    .trim()
    .replace(/^ספר\s+/, "");
}
