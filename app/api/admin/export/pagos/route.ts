import { isAuthed } from "@/app/lib/auth";
import { listPaidOrdersForExport } from "@/app/server/admin-orders";
import { formatPrice } from "@/app/config/product";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

export async function GET() {
  if (!(await isAuthed())) return new Response("Não autorizado.", { status: 401 });

  const orders = await listPaidOrdersForExport();
  const money = (c: number) => formatPrice(c) ?? `R$ ${(c / 100).toFixed(2)}`;

  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const lines: string[] = [
    "CLIENTES — PEDIDOS PAGOS (Somos Todos PT)",
    `Gerado em ${now} · Total: ${orders.length} pedido(s) pago(s)`,
    "=".repeat(60),
    "",
  ];

  for (const o of orders) {
    const snap = (o.customerSnapshot ?? {}) as { name?: string; email?: string; phone?: string; cpf?: string };
    const addr = (o.shippingAddress ?? {}) as Record<string, string>;
    const name = snap.name || "—";
    const phone = snap.phone || o.customer?.phone || "—";
    const email = snap.email || o.customer?.email || "—";
    const produtos =
      o.items.length > 0
        ? o.items.map((it) => `${it.quantity}× ${it.productName}${it.size && it.size !== "-" ? ` (${it.size})` : ""}`).join(" · ")
        : `${o.quantity}× ${o.productName}${o.size ? ` (${o.size})` : ""}`;
    const endereco = [
      [addr.street, addr.number].filter(Boolean).join(", "),
      addr.complement,
      addr.district,
      [addr.city, addr.state].filter(Boolean).join("/"),
      addr.cep ? `CEP ${addr.cep}` : "",
    ]
      .filter(Boolean)
      .join(" · ");

    lines.push(
      `PEDIDO ${o.orderNumber ?? "—"} · pago em ${fmtDate(o.paidAt)}`,
      `Cliente: ${name}`,
      `Telefone: ${phone}`,
      `E-mail: ${email}`,
      ...(snap.cpf ? [`CPF: ${snap.cpf}`] : []),
      `Endereço: ${endereco || "—"}`,
      `Produtos: ${produtos}`,
      `Valor pago: ${money(o.paidAmountCents ?? o.totalCents)}`,
      "-".repeat(60),
      "",
    );
  }

  const body = "﻿" + lines.join("\r\n"); // BOM + CRLF para abrir certo no Windows
  const filename = `clientes-pagos-${new Date().toISOString().slice(0, 10)}.txt`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
