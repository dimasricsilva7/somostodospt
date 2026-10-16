import "server-only";
import QRCode from "qrcode";

/** Gera o QR Code (data URL PNG) a partir do BR Code "copia e cola" do PIX. */
export async function pixQrDataUrl(copyPaste: string | null): Promise<string | null> {
  if (!copyPaste) return null;
  try {
    return await QRCode.toDataURL(copyPaste, { errorCorrectionLevel: "M", margin: 1, width: 320 });
  } catch {
    return null;
  }
}
