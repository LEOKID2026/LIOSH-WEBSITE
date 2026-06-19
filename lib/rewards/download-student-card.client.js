/**
 * Client-side export: card image with in-image watermark "האוסף של [full_name]".
 */

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = url;
  });
}

function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("export_failed"));
    }, type, 0.92);
  });
}

function safeDownloadFilename(cardNameHe, cardKey) {
  const base = String(cardKey || cardNameHe || "card")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .slice(0, 80);
  return `${base || "card"}.png`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawInImageWatermark(ctx, width, height, studentFullName) {
  const title = `האוסף של ${studentFullName}`;
  const fontSize = Math.max(14, Math.round(width * 0.038));
  ctx.save();
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${fontSize}px "Segoe UI", "Arial Hebrew", Arial, sans-serif`;

  const textY = Math.round(height * 0.055);
  const metrics = ctx.measureText(title);
  const padX = Math.round(fontSize * 0.65);
  const padY = Math.round(fontSize * 0.45);
  const barWidth = Math.min(width * 0.9, metrics.width + padX * 2);
  const barHeight = fontSize + padY * 2;
  const barX = (width - barWidth) / 2;
  const barY = textY - barHeight / 2;

  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  roundRectPath(ctx, barX, barY, barWidth, barHeight, Math.round(fontSize * 0.25));
  ctx.fill();

  ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
  ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.18));
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = "#fff4cc";
  ctx.fillText(title, width / 2, textY);
  ctx.restore();
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
  const name = String(studentFullName ?? "");
  if (!name) throw new Error("missing_student_name");
  if (!imageUrl) throw new Error("missing_image");

  const img = await loadImage(imageUrl);
  const width = img.naturalWidth > 0 ? img.naturalWidth : 1024;
  const height = img.naturalHeight > 0 ? img.naturalHeight : 1536;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  ctx.drawImage(img, 0, 0, width, height);
  drawInImageWatermark(ctx, width, height, name);

  const blob = await canvasToBlob(canvas);
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
