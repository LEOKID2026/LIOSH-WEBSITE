export const COPY_INVITE_SUCCESS_MESSAGE_HE =
  "ההודעה הועתקה! אפשר להדביק אותה בוואטסאפ, מייל או כל אפליקציית הודעות.";

export const COPY_INVITE_ERROR_MESSAGE_HE = "לא הצלחנו להעתיק את ההודעה. נסו שוב.";

export const COPY_LEO_NUMBER_SUCCESS_MESSAGE_HE =
  "מספר ליאו הועתק! אפשר להדביק אותו בוואטסאפ, מייל או כל אפליקציית הודעות.";

export const COPY_LEO_NUMBER_ERROR_MESSAGE_HE = "לא הצלחנו להעתיק את מספר ליאו. נסו שוב.";

/** @param {string} text @returns {Promise<boolean>} */
export async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
