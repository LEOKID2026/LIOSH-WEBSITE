/**
 * Client-side export: processed card (trim + rounded corners) with watermark.
 */
import { buildProcessedRewardCardDownloadBlob } from "./reward-card-image-process.client.js";

function safeDownloadFilename(cardNameHe, cardKey) {
  const base = String(cardKey || cardNameHe || "card")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .slice(0, 80);
  return `${base || "card"}.png`;
}

/**
 * @param {{ imageUrl: string, studentFullName: string, cardNameHe?: string, cardKey?: string }} opts
 */
export async function downloadStudentRewardCardImage({
  imageUrl,
  studentFullName,
  cardNameHe,
  cardKey,
}) {
  const blob = await buildProcessedRewardCardDownloadBlob({ imageUrl, studentFullName });
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = safeDownloadFilename(cardNameHe, cardKey);
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
