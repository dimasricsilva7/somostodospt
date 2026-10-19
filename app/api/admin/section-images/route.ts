import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { saveSectionImage } from "@/app/server/content";
import { SECTION_SLOTS, type SectionKey } from "@/app/config/sections";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

const KEYS = SECTION_SLOTS.map((s) => s.key) as SectionKey[];

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { images?: Partial<Record<SectionKey, string | null>> } | null;
  if (!body?.images) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  try {
    for (const k of KEYS) {
      if (!(k in body.images)) continue;
      const v = body.images[k];
      await saveSectionImage(k, typeof v === "string" && v ? v : null);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("admin", "falha ao salvar imagens das seções", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível salvar. O banco de dados está configurado?" }, { status: 500 });
  }
}
