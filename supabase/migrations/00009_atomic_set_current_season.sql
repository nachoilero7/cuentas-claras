-- ============================================================
-- Cuentas Claras - Atomic Set Current Season
-- Migration: 00009_atomic_set_current_season
-- ============================================================
-- Reemplaza la operacion de 2 queries (race condition) por una
-- sola funcion atomica que desmarca todas y marca la indicada.

CREATE OR REPLACE FUNCTION set_current_season(p_season_id UUID)
RETURNS SETOF seasons AS $$
BEGIN
  -- Desmarcar todas las temporadas como no actuales
  UPDATE seasons SET is_current = false WHERE is_current = true;

  -- Marcar la temporada indicada como actual
  UPDATE seasons SET is_current = true WHERE id = p_season_id;

  -- Retornar la temporada actualizada
  RETURN QUERY SELECT * FROM seasons WHERE id = p_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
