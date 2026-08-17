/**
 * Burns a visible "crossed" watermark onto an ID-card photo before it ever
 * leaves the device, so a leaked copy cannot be reused elsewhere.
 *
 * Text (Thai): "ใช้เพื่อรับค่าเดินทางในกิจกรรมของ SWING เท่านั้น"
 */
export const ID_WATERMARK_TEXT = "ใช้เพื่อรับค่าเดินทางในกิจกรรมของ SWING เท่านั้น";

export async function watermarkIdCard(
  dataUrl: string,
  text: string = ID_WATERMARK_TEXT,
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = dataUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const fontSize = Math.max(14, Math.round(canvas.width / 26));
  ctx.font = `bold ${fontSize}px "Noto Sans Thai", "Sarabun", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const stamp = `${text} · ${new Date().toLocaleDateString("th-TH")}`;
  const step = fontSize * 4;

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(-Math.PI / 7);
  ctx.globalAlpha = 0.45;
  const reach = Math.max(canvas.width, canvas.height);
  for (let y = -reach; y <= reach; y += step) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(stamp, 2, y + 2);
    ctx.fillStyle = "rgba(255,60,60,0.95)";
    ctx.fillText(stamp, 0, y);
  }
  ctx.restore();

  // Two crossing bars so the image reads as "voided for other uses".
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(220,38,38,1)";
  ctx.lineWidth = Math.max(3, canvas.width / 220);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.moveTo(canvas.width, 0);
  ctx.lineTo(0, canvas.height);
  ctx.stroke();
  ctx.restore();

  return canvas.toDataURL("image/jpeg", 0.8);
}
