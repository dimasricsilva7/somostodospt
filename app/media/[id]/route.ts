import { NextResponse, type NextRequest } from "next/server";
import { getMediaAsset } from "@/app/server/content";

export const dynamic = "force-dynamic";

/** Serve as imagens enviadas pelo admin (bytes guardados no banco). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]+$/i.test(id)) return new NextResponse(null, { status: 400 });
  const asset = await getMediaAsset(id);
  if (!asset) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(asset.data), {
    status: 200,
    headers: {
      "Content-Type": asset.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
