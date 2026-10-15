import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Trocas e devoluções", robots: { index: false, follow: false } };

export default function ReturnsPage() {
  return <main className="legal-page"><Link href="/" className="text-link">← Voltar para o produto</Link><p className="eyebrow">DOCUMENTO PENDENTE</p><h1>Trocas e devoluções</h1><p>Esta página está reservada para a política oficial de troca e devolução da loja. Não há condições publicadas enquanto o responsável não fornecer o texto aplicável.</p></main>;
}
