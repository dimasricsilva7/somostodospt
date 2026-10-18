import { NextResponse, type NextRequest } from "next/server";
import { isAuthed } from "@/app/lib/auth";
import { isSameOrigin } from "@/app/lib/request";
import { getCustomProduct, isConfigSlug, saveCustomProduct, saveProductContent, type ProductEdit } from "@/app/server/content";
import { log } from "@/app/lib/log";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["PP", "P", "M", "G", "GG", "XG", "XXG", "XXXG"]);

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  if (!(await isAuthed())) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as (ProductEdit & { slug?: string }) | null;
  if (!body?.slug) return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
  const custom = isConfigSlug(body.slug) ? null : await getCustomProduct(body.slug);
  if (!isConfigSlug(body.slug) && !custom) return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });

  const edit: ProductEdit = {
    name: typeof body.name === "string" ? body.name.trim().slice(0, 160) || undefined : undefined,
    description: typeof body.description === "string" ? body.description.trim().slice(0, 500) || undefined : undefined,
    priceCents: Number.isFinite(body.priceCents) ? Math.max(0, Math.round(body.priceCents as number)) : null,
    compareAtPriceCents: Number.isFinite(body.compareAtPriceCents) ? Math.max(0, Math.round(body.compareAtPriceCents as number)) : null,
    sizes: Array.isArray(body.sizes) ? body.sizes.map((s) => String(s).toUpperCase()).filter((s) => ALLOWED.has(s)) : undefined,
    active: typeof body.active === "boolean" ? body.active : undefined,
    mainImageId: typeof body.mainImageId === "string" ? body.mainImageId : body.mainImageId === null ? null : undefined,
    galleryIds: Array.isArray(body.galleryIds) ? body.galleryIds.map(String).slice(0, 8) : undefined,
    sortOrder: Number.isFinite(body.sortOrder) ? Math.round(body.sortOrder as number) : undefined,
  };

  try {
    if (custom) await saveCustomProduct(body.slug, edit);
    else await saveProductContent(body.slug, edit);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("admin", "falha ao salvar produto", { slug: body.slug, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Não foi possível salvar. O banco de dados está configurado?" }, { status: 500 });
  }
}
