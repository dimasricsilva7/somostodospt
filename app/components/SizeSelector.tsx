"use client";

type SizeSelectorProps = {
  sizes: readonly string[];
  selectedSize: string | undefined;
  onSelect: (size: string) => void;
  hasSizeGuide: boolean;
  onOpenGuide: () => void;
};

export function SizeSelector({
  sizes,
  selectedSize,
  onSelect,
  hasSizeGuide,
  onOpenGuide,
}: SizeSelectorProps) {
  return (
    <div className="size-selector" id="tamanho">
      <div className="size-selector__header">
        <div>
          <p className="eyebrow">ESCOLHA DO TAMANHO</p>
          <h2>Escolha seu tamanho.</h2>
        </div>
        <button type="button" className="text-link" onClick={onOpenGuide}>
          Consultar tabela de medidas
        </button>
      </div>

      {sizes.length > 0 ? (
        <div className="size-selector__controls" role="radiogroup" aria-label="Tamanhos disponíveis">
          {sizes.map((size) => (
            <button
              key={size}
              type="button"
              className={`size-button ${selectedSize === size ? "is-selected" : ""}`}
              role="radio"
              aria-checked={selectedSize === size}
              onClick={() => onSelect(size)}
            >
              {size}
            </button>
          ))}
        </div>
      ) : (
        <p className="pending-copy" role="status">
          Os tamanhos disponíveis ainda estão em confirmação. Esta página não apresenta tamanhos como disponíveis antes desse cadastro.
        </p>
      )}

      {!hasSizeGuide && (
        <p className="form-note">A tabela de medidas será exibida quando as medidas reais forem fornecidas pelo fabricante.</p>
      )}
    </div>
  );
}
