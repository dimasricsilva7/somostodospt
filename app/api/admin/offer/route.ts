import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { createOffer, deleteOffer, saveOffer, type OfferEdit } from "@/app/server/offers";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as (Partial<OfferEdit> & { type?: string; id?: string; action?: string }) | null;
  const type = body?.type === "bump" || body?.type === "upsell" ? body.type : null;
  if (!type) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });

  try {
    if (body?.action === "delete" && body.id) {
      await deleteOffer(type, body.id);
      return NextResponse.json({ ok: true });
    }

    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const priceCents = Number.isFinite(body?.priceCents) ? Math.max(0, Math.round(body!.priceCents as number)) : 0;
    if (!title) return NextResponse.json({ error: "Informe o título da oferta." }, { status: 400 });
    if (priceCents <= 0) return NextResponse.json({ error: "Informe um preço válido." }, { status: 400 });

    const edit: OfferEdit = {
      title,
      description: typeof body?.description === "string" ? body.description.trim().slice(0, 500) || null : null,
      priceCents,
      compareAtPriceCents: Number.isFinite(body?.compareAtPriceCents) ? Math.max(0, Math.round(body!.compareAtPriceCents as number)) : null,
      imageId: typeof body?.imageId === "string" ? body.imageId : null,
      active: typeof body?.active === "boolean" ? body.active : false,
    };

    if (body?.id) {
      await saveOffer(type, body.id, edit);
      return NextResponse.json({ ok: true, id: body.id });
    }
    const r = await createOffer(type, edit);
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, id: r.id });
  } catch (err) {
    log.error("admin", "falha na oferta", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível salvar. Banco configurado?" }, { status: 500 });
  }
}
