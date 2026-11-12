import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/app/components/BrandMark";
import { ShieldCheck } from "lucide-react";
import { DoarForm } from "./DoarForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Doar — Vaquinha do PT",
  description: "Contribua com a vaquinha do PT para fechar as contas da campanha. Sugestão de R$ 13 via PIX.",
};

export default function DoarPage() {
  return (
    <main className="checkout-shell">
      <header className="checkout-top">
        <Link href="/" className="brand-mark-link" aria-label="Página inicial"><BrandMark compact /></Link>
        <span className="checkout-top__secure"><ShieldCheck size={14} aria-hidden="true" /> Doação segura via PIX</span>
      </header>

      <div className="order-page">
        <div className="order-summary-head">
          <span className="eyebrow">VAQUINHA DO PT</span>
          <h1>Ajude a fechar as contas da campanha</h1>
        </div>

        <div className="doar-text">
          <p>Ainda dá tempo de participar da vaquinha do PT para fechar as contas da campanha que elegeu Lula pela quarta vez à Presidência da República. A mobilização segue até esta quarta-feira, 25 de novembro, e toda contribuição é bem-vinda.</p>
          <p>Nessa reta final, o partido conta mais uma vez com a força da militância e de quem esteve nas ruas e nas redes pela reeleição de Lula. A sugestão é contribuir com <strong>R$ 13</strong>. Com muita gente participando, o que cada um pode doar faz diferença.</p>
        </div>

        <DoarForm />
      </div>
    </main>
  );
}
