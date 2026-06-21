/**

 * Client-side export: pre-baked download PNG + watermark, or full canvas fallback.

 */

import { buildProcessedRewardCardDownloadBlob } from "./reward-card-image-process.client.js";



function safeDownloadFilename(cardNameHe, cardKey) {

  const base = String(cardKey || cardNameHe || "card")

    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")

    .slice(0, 80);

  return `${base || "card"}.png`;

}



/**

 * @param {{

 *   imageUrl: string,

 *   downloadUrl?: string | null,

 *   imageVariantsReady?: boolean,

 *   studentFullName: string,

 *   cardNameHe?: string,

 *   cardKey?: string,

 * }} opts

 */

export async function downloadStudentRewardCardImage({

  imageUrl,

  downloadUrl,

  imageVariantsReady = false,

  studentFullName,

  cardNameHe,

  cardKey,

}) {

  const blob = await buildProcessedRewardCardDownloadBlob({

    imageUrl,

    downloadUrl,

    preBakedDownload: imageVariantsReady,

    studentFullName,

  });

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

