-- Unidades restantes (estoque) por produto — exibe "Restam apenas X unidades" no card
ALTER TABLE "ProductContent" ADD COLUMN IF NOT EXISTS "stockLeft" INTEGER;
ALTER TABLE "CustomProduct" ADD COLUMN IF NOT EXISTS "stockLeft" INTEGER;
