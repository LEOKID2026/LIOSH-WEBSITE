/**
 * Cache headers for sensitive report/diagnostic API responses.
 * @param {import('http').ServerResponse} res
 */
export function setSensitiveReportNoStoreHeaders(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
}
