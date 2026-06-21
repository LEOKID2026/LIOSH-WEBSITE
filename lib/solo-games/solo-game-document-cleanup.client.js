/** Clear inline document styles/classes solo game shells may leave behind. */
export function resetSoloGameDocumentShell() {
  if (typeof document === "undefined") return;

  const { body, documentElement: root } = document;

  body.style.removeProperty("overflow");
  body.style.removeProperty("background");
  body.style.removeProperty("background-color");
  body.style.removeProperty("color");
  body.style.removeProperty("position");
  body.style.removeProperty("touch-action");
  root.style.removeProperty("overflow");
  root.style.removeProperty("background");
  root.style.removeProperty("background-color");
  body.classList.remove("game-page-mobile");
  root.classList.remove("game-page-mobile");
}
