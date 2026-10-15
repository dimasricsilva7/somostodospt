import Image from "next/image";
import type { ProductMedia as ProductMediaType } from "@/app/config/product";

type ProductMediaProps = {
  asset: ProductMediaType;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function ProductMedia({
  asset,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  className = "",
}: ProductMediaProps) {
  return (
    <div className={`product-media product-media--${asset.aspect} ${className}`}>
      <Image
        src={asset.src}
        alt={asset.alt}
        fill
        priority={priority}
        sizes={sizes}
        className="product-media__image"
      />
    </div>
  );
}
