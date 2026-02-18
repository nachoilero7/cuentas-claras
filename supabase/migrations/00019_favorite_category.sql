-- ============================================================
-- Cuentas Claras - Rubro Favorito
-- Migration: 00019_favorite_category
-- Description: Permite marcar UN solo rubro como favorito
--              para mostrarlo destacado en el dashboard.
-- ============================================================

-- 1. Nueva columna
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- 2. Indice parcial unico: maximo un rubro favorito a la vez
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_single_favorite
  ON categories (is_favorite) WHERE is_favorite = true;

-- 3. RPC atomica: desactiva el favorito actual y activa el nuevo
CREATE OR REPLACE FUNCTION set_favorite_category(p_category_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Quitar favorito actual (si existe y es distinto)
  UPDATE categories
    SET is_favorite = false, updated_at = NOW()
    WHERE is_favorite = true AND id != p_category_id;

  -- Marcar el nuevo favorito
  UPDATE categories
    SET is_favorite = true, updated_at = NOW()
    WHERE id = p_category_id AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 4. RPC para quitar favorito
CREATE OR REPLACE FUNCTION unset_favorite_category(p_category_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE categories
    SET is_favorite = false, updated_at = NOW()
    WHERE id = p_category_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
