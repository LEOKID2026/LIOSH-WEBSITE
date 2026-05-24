/**
 * DOM highlight pickers shared across student-video-pilot workflows.
 */
export function pickHighlight(key, studentName = "ישראל ישראלי") {
  switch (key) {
    case "login-form":
      return document.querySelector("form");
    case "username-field":
      return document.querySelector('input[placeholder="שם משתמש"]');
    case "pin-field":
      return document.querySelector('input[placeholder="PIN"]');
    case "login-submit":
      return document.querySelector('form button[type="submit"]');
    case "home-greeting": {
      const h1 = [...document.querySelectorAll("h1")].find((h) => h.textContent?.includes(studentName));
      return h1 || document.querySelector("h1");
    }
    case "home-coins":
      return [...document.querySelectorAll("p, span")].find((el) => el.textContent?.includes("מטבעות"));
    case "home-stats":
      return [...document.querySelectorAll("h2")].find((el) => el.textContent?.includes("הנתונים שלי"));
    case "home-subjects":
      return [...document.querySelectorAll("h2")].find((el) => el.textContent?.includes("הנושאים שלי"));
    case "home-learn-cta":
      return [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("התחל ללמוד"));
    case "daily-missions":
      return document.getElementById("daily-missions-heading")?.closest("section") ||
        [...document.querySelectorAll("h2")].find((el) => el.textContent?.includes("המשימות"));
    case "monthly-journey":
      return [...document.querySelectorAll("h2")].find((el) =>
        el.textContent?.includes("מסע חודשי") || el.textContent?.includes("התמדה")
      )?.closest("section");
    case "learning-hub":
      return document.querySelector("main") || document.body;
    case "subject-math":
      return [...document.querySelectorAll("a")].find((a) => a.textContent?.includes("חשבון"));
    case "subject-grid":
      return document.querySelector("main") || [...document.querySelectorAll("a")].find((a) => a.href?.includes("math-master"));
    case "math-lobby":
      return document.querySelector('[data-testid="math-start-game"]')?.closest("div");
    case "math-start-btn":
      return document.querySelector('[data-testid="math-start-game"]');
    case "math-question":
      return document.querySelector('[data-testid="math-question-surface"]');
    case "math-answer-input":
      return document.querySelector('[data-testid="math-text-answer"]');
    case "math-feedback":
      return [...document.querySelectorAll("div")].find((el) => {
        const t = el.textContent || "";
        return (t.includes("נכון") || t.includes("לא נכון")) && t.length < 120;
      });
    case "math-step-btn":
      return [...document.querySelectorAll("button")].find((b) => /צעד-צעד/.test(b.textContent || ""));
    case "explanation-modal":
      return document.querySelector('[role="dialog"]') ||
        [...document.querySelectorAll("div")].find((el) => {
          const t = el.textContent || "";
          return /צעד\s+\d+\s+מתוך/i.test(t) && el.getBoundingClientRect().height > 120;
        });
    case "geometry-stem":
      return document.querySelector('[data-testid="geometry-question-stem"]');
    case "geometry-diagram":
      return document.querySelector("svg, canvas") ||
        document.querySelector('[data-testid="geometry-question-stem"]');
    case "geometry-step-btn":
      return [...document.querySelectorAll("button")].find((b) => /צעד-צעד/.test(b.textContent || ""));
    case "streak-hud":
      return (
        [...document.querySelectorAll("span, div, p")].find((el) => /🔥|רצף|נקודות|score/i.test(el.textContent || "")) ||
        document.querySelector('[data-testid="math-question-surface"]')
      );
    case "arcade-header":
      return document.querySelector("h1");
    case "arcade-game-card":
      return [...document.querySelectorAll("h3, h2")].find((el) =>
        /Fourline|לudo|נחשים|דמקה/i.test(el.textContent || "")
      )?.closest("div");
    case "arcade-balance":
      return [...document.querySelectorAll("span")].find((el) => el.textContent?.includes("מטבעות"));
    default:
      return null;
  }
}
