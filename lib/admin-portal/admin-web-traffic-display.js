const FACEBOOK_REFERRER_HOSTS = new Set([
  "facebook.com",
  "m.facebook.com",
  "www.facebook.com",
  "l.facebook.com",
  "lm.facebook.com",
]);

export function isAdminWebTrafficPath(path) {
  const normalized = String(path || "").trim();
  return normalized === "/admin" || normalized.startsWith("/admin/");
}

export function normalizeReferrerHost(host) {
  return String(host || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}

export function isFacebookReferrer(host) {
  const normalized = normalizeReferrerHost(host);
  return FACEBOOK_REFERRER_HOSTS.has(normalized) || normalized.endsWith(".facebook.com");
}

export function safeTrafficNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function splitVisitorAndAdminPages(rows) {
  const visitorPages = [];
  const adminPages = [];
  for (const row of rows || []) {
    const path = row.rawLabel || row.label || "";
    if (isAdminWebTrafficPath(path)) adminPages.push(row);
    else visitorPages.push(row);
  }
  return { visitorPages, adminPages };
}

export function mergeFacebookReferrers(referrers) {
  const other = [];
  let facebookTotal = 0;
  for (const row of referrers || []) {
    const host = row.rawLabel || row.label || "";
    if (isFacebookReferrer(host)) {
      facebookTotal += safeTrafficNum(row.value ?? row.pageviews);
    } else {
      other.push(row);
    }
  }
  const merged =
    facebookTotal > 0
      ? [
          {
            rawLabel: "פייסבוק",
            label: "פייסבוק",
            dimension: "referrerHostname",
            value: facebookTotal,
            pageviews: facebookTotal,
          },
          ...other,
        ]
      : [...other];
  return { merged, facebookTotal };
}

export function pickUserActivityValue(cards, label) {
  const card = (cards || []).find((item) => item?.label === label);
  if (!card || card.value == null) return null;
  return card.value;
}

export function sumLearningAndGames(cards) {
  const learning = pickUserActivityValue(cards, "סשני למידה");
  const games = pickUserActivityValue(cards, "סשני משחקי Solo");
  if (learning == null && games == null) return null;
  return safeTrafficNum(learning) + safeTrafficNum(games);
}
