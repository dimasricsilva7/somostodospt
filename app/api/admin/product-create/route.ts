import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { createCustomProduct, type ProductEdit } from "@/app/server/content";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["PP", "P", "M", "G", "GG", "XG", "XXG", "XXXG"]);

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as (ProductEdit & { name?: string }) | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length < 2) return NextResponse.json({ error: "Informe o nome do modelo." }, { status: 400 });

  const edit: ProductEdit = {
    description: typeof body?.description === "string" ? body.description.trim().slice(0, 500) || undefined : undefined,
    priceCents: Number.isFinite(body?.priceCents) ? Math.max(0, Math.round(body!.priceCents as number)) : null,
    compareAtPriceCents: Number.isFinite(body?.compareAtPriceCents) ? Math.max(0, Math.round(body!.compareAtPriceCents as number)) : null,
    sizes: Array.isArray(body?.sizes) ? body!.sizes!.map((s) => String(s).toUpperCase()).filter((s) => ALLOWED.has(s)) : undefined,
    active: typeof body?.active === "boolean" ? body!.active : false,
    mainImageId: typeof body?.mainImageId === "string" ? body!.mainImageId : null,
  };

  try {
    const { slug } = await createCustomProduct(name, edit);
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    log.error("admin", "falha ao criar modelo", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível criar o modelo." }, { status: 500 });
  }
}
