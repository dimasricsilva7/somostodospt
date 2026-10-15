import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Política de privacidade", robots: { index: false, follow: false } };

export default function PrivacyPage() {
  return <main className="legal-page"><Link href="/" className="text-link">← Voltar para o produto</Link><p className="eyebrow">DOCUMENTO PENDENTE</p><h1>Política de privacidade</h1><p>Esta página está reservada para a política de privacidade oficial da loja. O texto final deve ser fornecido pelo responsável pela operação antes do lançamento comercial.</p></main>;
}
