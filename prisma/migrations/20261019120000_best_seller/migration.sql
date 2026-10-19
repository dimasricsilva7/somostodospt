-- Destaque "Mais vendido" por produto (curadoria manual pelo painel)
ALTER TABLE "ProductContent" ADD COLUMN IF NOT EXISTS "bestSeller" BOOLEAN;
ALTER TABLE "CustomProduct" ADD COLUMN IF NOT EXISTS "bestSeller" BOOLEAN NOT NULL DEFAULT false;
