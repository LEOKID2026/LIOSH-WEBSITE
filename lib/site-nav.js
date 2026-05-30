/** Context-aware top HUD navigation by site area. */

export const NAV_AREAS = {
  public: "public",
  student: "student",
  parent: "parent",
  teacher: "teacher",
};

const ENGINE_REVIEW_LINK = {
  href: "/learning/dev/engine-review",
  label: "סקירת מנוע",
};

const PUBLIC_NAV = [
  { href: "/", label: "בית" },
  { href: "/student/home", label: "פורטל תלמידים" },
  { href: "/parent/login", label: "פורטל הורים" },
  { href: "/teacher/login", label: "פורטל מורים" },
  { href: "/about", label: "אודות" },
  { href: "/contact", label: "צור קשר" },
  { href: "/help", label: "מרכז העזרה" },
];

const STUDENT_NAV = [
  { href: "/", label: "בית" },
  { href: "/student/home", label: "פורטל תלמידים" },
  { href: "/offline", label: "משחקים לא מקוון" },
  { href: "/learning", label: "לימודים" },
  { href: "/about", label: "אודות" },
  { href: "/gallery", label: "גלריה" },
  { href: "/contact", label: "צור קשר" },
  { href: "/help", label: "מרכז העזרה" },
];

const PARENT_NAV = [
  { href: "/", label: "בית" },
  { href: "/parent/login", label: "פורטל הורים" },
  { href: "/about", label: "אודות" },
  { href: "/contact", label: "צור קשר" },
  { href: "/help", label: "מרכז העזרה" },
];

const TEACHER_NAV = [
  { href: "/", label: "בית" },
  { href: "/teacher/login", label: "פורטל מורים" },
  { href: "/about", label: "אודות" },
  { href: "/contact", label: "צור קשר" },
  { href: "/help", label: "מרכז העזרה" },
];

/**
 * @param {string} pathname - Next.js router.pathname
 * @returns {typeof NAV_AREAS[keyof typeof NAV_AREAS]}
 */
export function resolveNavArea(pathname) {
  const path = pathname || "";

  if (path.startsWith("/parent") || path.startsWith("/guardian")) {
    return NAV_AREAS.parent;
  }

  if (path.startsWith("/teacher") || path.startsWith("/school")) {
    return NAV_AREAS.teacher;
  }

  if (
    path.startsWith("/student") ||
    path === "/learning" ||
    path.startsWith("/learning/dev") ||
    path === "/game" ||
    path === "/offline" ||
    path.startsWith("/gallery")
  ) {
    return NAV_AREAS.student;
  }

  return NAV_AREAS.public;
}

/**
 * @param {string} pathname
 * @returns {{ area: string, links: { href: string, label: string }[], showEngineReview: boolean, showDevCoinTopup: boolean }}
 */
export function getContextNav(pathname) {
  const area = resolveNavArea(pathname);
  const showEngineReview =
    process.env.NEXT_PUBLIC_ENABLE_ENGINE_REVIEW_ADMIN === "true";

  let links;
  switch (area) {
    case NAV_AREAS.student:
      links = STUDENT_NAV;
      break;
    case NAV_AREAS.parent:
      links = PARENT_NAV;
      break;
    case NAV_AREAS.teacher:
      links = TEACHER_NAV;
      break;
    default:
      links = [
        ...PUBLIC_NAV,
        ...(showEngineReview ? [ENGINE_REVIEW_LINK] : []),
      ];
      break;
  }

  return {
    area,
    links,
    showEngineReview: area === NAV_AREAS.public && showEngineReview,
    showDevCoinTopup: area === NAV_AREAS.public,
  };
}
