import { expect, type Locator } from "@playwright/test";

const FORBIDDEN_GEOMETRY = [
  /\d+\s+על\s+\d+/u,
  /מלבן\s+במישור/u,
  /שטח\s+הפנים/u,
];

const CHILD_FRIENDLY_GEOMETRY_HINTS = /אורך|רוחב|שטח\s+המלבן|היקף\s+המלבן|יחידות/u;

export async function assertStemNoHorizontalScroll(stem: Locator) {
  const metrics = await stem.evaluate((root) => {
    const offenders: string[] = [];
    root.querySelectorAll("*").forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.overflowX === "auto" || cs.overflowX === "scroll") {
        offenders.push(
          `${el.tagName}.${String(el.className || "").slice(0, 40)} overflow-x=${cs.overflowX}`
        );
      }
      if (el.classList.contains("overflow-x-auto") || el.classList.contains("overflow-x-scroll")) {
        offenders.push(`${el.tagName} has overflow-x utility class`);
      }
      if (cs.whiteSpace === "nowrap" && el.scrollWidth > el.clientWidth + 1) {
        offenders.push(`${el.tagName} nowrap overflow`);
      }
    });

    const stemWidth = root.getBoundingClientRect().width;
    let widestChild = 0;
    root.querySelectorAll("[data-testid='student-question-body'], [data-testid='student-question-lead']").forEach((el) => {
      widestChild = Math.max(widestChild, el.getBoundingClientRect().width);
    });

    const body = root.querySelector("[data-testid='student-question-body']");
    let bodyOverflow = false;
    let bodyScrollWidth = 0;
    let bodyClientWidth = 0;
    if (body) {
      bodyScrollWidth = body.scrollWidth;
      bodyClientWidth = body.clientWidth;
      bodyOverflow = body.scrollWidth > body.clientWidth + 1;
    }

    return {
      offenders,
      stemWidth,
      widestChild,
      bodyOverflow,
      bodyScrollWidth,
      bodyClientWidth,
    };
  });

  expect(metrics.offenders, `overflow-x in stem: ${metrics.offenders.join("; ")}`).toEqual([]);
  expect(metrics.bodyOverflow, "question body scrolls horizontally").toBe(false);
  if (metrics.stemWidth > 0 && metrics.widestChild > 0) {
    expect(metrics.widestChild).toBeLessThanOrEqual(metrics.stemWidth + 2);
  }
}

export function assertGeometryWording(text: string) {
  const t = String(text || "");
  for (const re of FORBIDDEN_GEOMETRY) {
    expect(t, `forbidden geometry phrase in: ${t.slice(0, 120)}`).not.toMatch(re);
  }
  if (/מלבן/u.test(t) && /שטח|היקף/u.test(t)) {
    expect(t).toMatch(CHILD_FRIENDLY_GEOMETRY_HINTS);
  }
}

export async function assertCompactMathSpacing(body: Locator) {
  const text = (await body.innerText()).replace(/\s+/g, " ").trim();
  expect(text).not.toMatch(/\s{3,}/);
  expect(text).not.toMatch(/(\d)\s{2,}([+×÷\-=])/);
}
