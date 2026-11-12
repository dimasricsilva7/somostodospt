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
    <main className="doar-shell">
      <div className="doar-card">
        <Link href="/" className="doar-logo" aria-label="Página inicial"><BrandMark compact /></Link>
        <span className="doar-eyebrow">VAQUINHA DO PT</span>
        <h1>Ajude a fechar as contas da campanha</h1>

        <div className="doar-lead">
          <p>Ainda dá tempo de participar da vaquinha do PT para fechar as contas da campanha que elegeu Lula pela quarta vez à Presidência da República. A mobilização segue até <strong>quarta-feira, 25 de novembro</strong>, e toda contribuição é bem-vinda.</p>
          <p>Nessa reta final, o partido conta com a força da militância e de quem esteve nas ruas e nas redes pela reeleição de Lula. Com muita gente participando, o que cada um pode doar faz diferença.</p>
        </div>

        <DoarForm />

        <p className="doar-secure"><ShieldCheck size={14} aria-hidden="true" /> Doação segura · pagamento via PIX</p>
      </div>
    </main>
  );
}
