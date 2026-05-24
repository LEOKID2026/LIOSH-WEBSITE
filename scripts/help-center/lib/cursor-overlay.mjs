/**
 * Synthetic cursor (desktop) / tap ripple (mobile) for help video capture.
 */

const CURSOR_CSS = `
#help-capture-cursor {
  position: fixed;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  border-radius: 50%;
  border: 2px solid rgba(251, 191, 36, 0.95);
  background: rgba(0, 0, 0, 0.35);
  box-shadow: 0 2px 8px rgba(0,0,0,0.6);
  pointer-events: none;
  z-index: 2147483646;
  transition: left 0.08s linear, top 0.08s linear;
}
#help-capture-tap {
  position: fixed;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border-radius: 50%;
  border: 2px solid rgba(251, 191, 36, 0.9);
  pointer-events: none;
  z-index: 2147483645;
  opacity: 0;
  transform: scale(0.5);
}
`;

export async function installCursorOverlay(page, { mobile = false } = {}) {
  await page.addStyleTag({ content: CURSOR_CSS });
  await page.evaluate((isMobile) => {
    if (!document.getElementById("help-capture-cursor") && !isMobile) {
      const c = document.createElement("div");
      c.id = "help-capture-cursor";
      c.style.left = "40px";
      c.style.top = "40px";
      document.body.appendChild(c);
    }
    if (!document.getElementById("help-capture-tap") && isMobile) {
      const t = document.createElement("div");
      t.id = "help-capture-tap";
      document.body.appendChild(t);
    }
  }, mobile);
}

export async function moveCursor(page, x, y, { mobile = false } = {}) {
  if (mobile) return;
  await page.mouse.move(x, y, { steps: 8 });
  await page.evaluate(
    ({ px, py }) => {
      const c = document.getElementById("help-capture-cursor");
      if (c) {
        c.style.left = `${px}px`;
        c.style.top = `${py}px`;
      }
    },
    { px: x, py: y }
  );
}

export async function showTapRipple(page, x, y) {
  await page.evaluate(
    ({ px, py }) => {
      const t = document.getElementById("help-capture-tap");
      if (!t) return;
      t.style.left = `${px}px`;
      t.style.top = `${py}px`;
      t.style.opacity = "1";
      t.style.transform = "scale(1)";
      t.style.transition = "opacity 0.35s ease, transform 0.35s ease";
      setTimeout(() => {
        t.style.opacity = "0";
        t.style.transform = "scale(0.5)";
      }, 350);
    },
    { px: x, py: y }
  );
}

export async function clickAt(page, x, y, { mobile = false } = {}) {
  if (mobile) {
    await showTapRipple(page, x, y);
    await page.touchscreen.tap(x, y).catch(() => page.mouse.click(x, y));
  } else {
    await moveCursor(page, x, y, { mobile });
    await page.waitForTimeout(600);
    await page.mouse.click(x, y);
  }
  await page.waitForTimeout(250);
}
