/** @param {number} [attempt] */
export function scrollPublicWorksheetGeneratorIntoView(attempt = 0) {
  const el = document.getElementById("worksheet-generator");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (attempt >= 40) return;
  window.setTimeout(() => scrollPublicWorksheetGeneratorIntoView(attempt + 1), 50);
}

/** @param {import("next/router").NextRouter} router */
export function navigateParentDemoToPublicWorksheets(router) {
  const targetPath = "/practice/worksheets";
  const target = `${targetPath}#worksheet-generator`;

  if (router.pathname === targetPath) {
    const base = router.asPath.split("#")[0] || targetPath;
    if (window.location.hash !== "#worksheet-generator") {
      window.history.replaceState(null, "", `${base}#worksheet-generator`);
    }
    scrollPublicWorksheetGeneratorIntoView();
    return;
  }

  window.location.assign(target);
}
