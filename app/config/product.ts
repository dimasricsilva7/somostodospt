export type ProductMediaId =
  | "frente"
  | "verso"
  | "modelo-masculino"
  | "modelo-feminino"
  | "close-estampa"
  | "detalhe-acabamento"
  | "lifestyle";

export type ProductMedia = {
  id: ProductMediaId;
  label: string;
  alt: string;
  src: string;
  aspect: "square" | "portrait" | "landscape";
};

export type SizeGuideRow = {
  size: string;
  widthCm: number;
  lengthCm: number;
};

export const product = {
  brand: "Somos Todos PT",
  name: "Camiseta Somos Todos PT",
  shortName: "Camiseta vermelha — edição visual Lula",
  currency: "BRL",
  // Preencha apenas com valores comerciais reais, em centavos. Ex.: 7990 para R$ 79,90.
  priceInCents: undefined as number | undefined,
  compareAtPriceInCents: undefined as number | undefined,
  availabilityNote: undefined as string | undefined,
  requiresSize: true,
  // Publique somente os tamanhos cuja disponibilidade tenha sido confirmada.
  availableSizes: [] as string[],
  // Publique somente medidas reais fornecidas pelo fabricante.
  sizeGuide: [] as SizeGuideRow[],
  media: [
    {
      id: "frente",
      label: "Frente",
      alt: "Vista frontal da camiseta vermelha Somos Todos PT com estampa Lula e a frase O Brasil de Novo com o Povo.",
      src: "/images/products/frente-principal.webp",
      aspect: "square",
    },
    {
      id: "verso",
      label: "Verso",
      alt: "Vista traseira da camiseta vermelha com estrela branca e a mensagem Mais Democracia, Mais Direitos, Mais Brasil.",
      src: "/images/products/verso.webp",
      aspect: "square",
    },
    {
      id: "modelo-masculino",
      label: "Modelo masculino",
      alt: "Modelo masculino usando a camiseta vermelha Somos Todos PT em ambiente externo.",
      src: "/images/products/modelo-masculino.webp",
      aspect: "portrait",
    },
    {
      id: "modelo-feminino",
      label: "Modelo feminino",
      alt: "Modelo feminino usando a camiseta vermelha Somos Todos PT em ambiente externo.",
      src: "/images/products/modelo-feminino.webp",
      aspect: "portrait",
    },
    {
      id: "close-estampa",
      label: "Estampa em detalhe",
      alt: "Close da estampa frontal Lula e dos elementos gráficos em verde e amarelo sobre o tecido vermelho.",
      src: "/images/products/close-estampa.webp",
      aspect: "square",
    },
    {
      id: "detalhe-acabamento",
      label: "Manga e costura",
      alt: "Detalhe visual da manga vermelha e da costura da camiseta.",
      src: "/images/products/detalhe-manga-costura.webp",
      aspect: "landscape",
    },
    {
      id: "lifestyle",
      label: "Lifestyle",
      alt: "Cena externa de lifestyle com modelo usando a camiseta vermelha Somos Todos PT.",
      src: "/images/products/lifestyle-externo.webp",
      aspect: "portrait",
    },
  ] satisfies ProductMedia[],
  designHighlights: [
    {
      title: "Frente expressiva",
      text: "Tipografia marcante, retrato ilustrado e uma mensagem em destaque no centro do visual.",
    },
    {
      title: "Cores em contraste",
      text: "Vermelho, branco, verde e amarelo compõem uma leitura gráfica de alto impacto.",
    },
    {
      title: "Mensagem no verso",
      text: "Uma estrela branca e a frase complementar ampliam a presença visual da peça.",
    },
  ],
  confirmedSpecs: [
    { label: "Cor", value: "Vermelha" },
    { label: "Modelagem", value: "Unissex" },
  ],
  pendingSpecLabels: [
    "Composição do tecido",
    "Tipo de impressão",
    "Instruções de lavagem",
  ],
  faq: [
    {
      question: "Quais tamanhos estão disponíveis?",
      answer:
        "Os tamanhos serão exibidos aqui assim que a disponibilidade for confirmada pelo responsável pela loja.",
    },
    {
      question: "Como escolho o tamanho correto?",
      answer:
        "A tabela de medidas será publicada nesta página quando as medidas reais do fabricante forem disponibilizadas.",
    },
    {
      question: "Como funciona a finalização da compra?",
      answer:
        "A compra é finalizada em um checkout externo da BravoPay. Antes do redirecionamento, a página mostra o tamanho selecionado. Caso o checkout ofereça variantes, confirme o mesmo tamanho lá.",
    },
    {
      question: "Quais formas de pagamento são aceitas?",
      answer:
        "As formas de pagamento serão informadas diretamente no checkout externo quando ele estiver configurado.",
    },
    {
      question: "Qual é o prazo de entrega?",
      answer:
        "O prazo de entrega será informado pelo vendedor assim que essa condição operacional estiver definida.",
    },
    {
      question: "Como funciona o frete?",
      answer:
        "As condições de frete serão apresentadas quando forem configuradas pelo responsável pela loja ou no checkout externo.",
    },
    {
      question: "Como faço para trocar ou devolver o produto?",
      answer:
        "A política de troca e devolução será publicada antes do lançamento comercial da loja.",
    },
    {
      question: "Como entro em contato com o atendimento?",
      answer:
        "O canal oficial de atendimento será incluído nesta página quando for disponibilizado pelo responsável pela loja.",
    },
  ],
} as const;

export function formatPrice(priceInCents?: number): string | undefined {
  if (typeof priceInCents !== "number") return undefined;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: product.currency,
  }).format(priceInCents / 100);
}
