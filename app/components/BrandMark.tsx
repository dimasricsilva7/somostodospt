import { Star } from "lucide-react";

type BrandMarkProps = {
  inverse?: boolean;
  compact?: boolean;
};

export function BrandMark({ inverse = false, compact = false }: BrandMarkProps) {
  return (
    <span className={`brand-mark ${inverse ? "brand-mark--inverse" : ""}`}>
      <span className="brand-mark__symbol" aria-hidden="true">
        <Star size={compact ? 16 : 19} fill="currentColor" strokeWidth={1.5} />
      </span>
      <span className="brand-mark__type">
        <strong>SOMOS</strong>
        <span>TODOS PT</span>
      </span>
    </span>
  );
}
