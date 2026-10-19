import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { saveTexts, type SiteTexts } from "@/app/server/content";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

const KEYS: (keyof SiteTexts)[] = ["heroEyebrow", "heroTitle", "heroLead", "heroStatement", "collectionTitle", "collectionSubtitle", "paymentProcessorName", "announcementText", "urgencyMessage"];

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Partial<SiteTexts> | null;
  if (!body) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const partial: Partial<SiteTexts> = {};
  for (const k of KEYS) {
    if (typeof body[k] === "string") partial[k] = body[k]!.trim().slice(0, 600);
  }

  try {
    await saveTexts(partial);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("admin", "falha ao salvar textos", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível salvar. O banco de dados está configurado?" }, { status: 500 });
  }
}
