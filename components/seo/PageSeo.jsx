import Head from "next/head";
import { CANONICAL_PUBLIC_SITE_ORIGIN } from "../../lib/site/canonical-public-site-origin.js";

/** Default share image — 512×512 brand icon (suitable for og:image). */
export const DEFAULT_SHARE_IMAGE_PATH = "/icons/child/android-chrome-512x512.png";

function toAbsoluteUrl(pathOrUrl) {
  if (!pathOrUrl) return `${CANONICAL_PUBLIC_SITE_ORIGIN}${DEFAULT_SHARE_IMAGE_PATH}`;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${CANONICAL_PUBLIC_SITE_ORIGIN}${path}`;
}

function toCanonicalPath(path) {
  if (!path || path === "/") return "/";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized.endsWith("/") && normalized.length > 1
    ? normalized.slice(0, -1)
    : normalized;
}

/**
 * Shared page metadata: title, description, canonical, Open Graph, Twitter cards.
 *
 * @param {{
 *   title: string;
 *   description: string;
 *   canonicalPath: string;
 *   shareTitle?: string;
 *   shareDescription?: string;
 *   shareImagePath?: string;
 *   noindex?: boolean;
 * }} props
 */
export default function PageSeo({
  title,
  description,
  canonicalPath,
  shareTitle,
  shareDescription,
  shareImagePath = DEFAULT_SHARE_IMAGE_PATH,
  noindex = false,
}) {
  const canonicalUrl = toAbsoluteUrl(toCanonicalPath(canonicalPath));
  const ogTitle = shareTitle || title;
  const ogDescription = shareDescription || description;
  const ogImage = toAbsoluteUrl(shareImagePath);

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="he_IL" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle} />
      <meta name="twitter:description" content={ogDescription} />
      <meta name="twitter:image" content={ogImage} />
    </Head>
  );
}
