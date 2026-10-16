import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { createMediaAsset } from "@/app/server/content";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png", "image/avif"]);
const MAX_BYTES = 6 * 1024 * 1024; // 6 MB

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Envie um arquivo de imagem." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Formato inválido. Use WEBP, JPG, PNG ou AVIF." }, { status: 415 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Imagem muito grande (máx. 6 MB)." }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = await createMediaAsset(file.name || "imagem", file.type, buffer);
    return NextResponse.json({ id, url: `/media/${id}` });
  } catch (err) {
    log.error("admin", "falha no upload", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível enviar a imagem. O banco de dados está configurado?" }, { status: 500 });
  }
}
