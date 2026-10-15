import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Termos de compra", robots: { index: false, follow: false } };

export default function TermsPage() {
  return <main className="legal-page"><Link href="/" className="text-link">← Voltar para o produto</Link><p className="eyebrow">DOCUMENTO PENDENTE</p><h1>Termos de compra</h1><p>Esta página está reservada para os termos oficiais de compra da loja. O conteúdo final deve ser validado e fornecido pelo responsável pela operação antes do lançamento comercial.</p></main>;
}
