/** Wait until student login form is ready or already on home. */
export async function waitStudentLoginReady(page, timeout = 60_000) {
  await page.waitForFunction(
    () => {
      if (window.location.pathname.includes("/student/home")) return true;
      const t = document.body?.innerText || "";
      if (t.includes("בודקים חיבור")) return false;
      return !!document.querySelector('input[placeholder="שם משתמש"]');
    },
    undefined,
    { timeout }
  );
}
