-- ============================================================
-- Cuentas Claras - Setup Inicial
-- ============================================================
-- INSTRUCCIONES:
-- 1. Primero desplegá las migraciones (00001 a 20260212)
-- 2. Registrate en la app con tu email
-- 3. Completá los valores marcados con TODO abajo
-- 4. Ejecutá este script en el SQL Editor de Supabase
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PASO 1: Promover usuarios fundadores a admin
-- ────────────────────────────────────────────────────────────
-- Reemplazá los emails con los del/los admin(s) reales.
-- Los usuarios YA deben haberse registrado en la app antes.

UPDATE profiles SET role = 'admin'
WHERE email IN (
  'admin@ejemplo.com'       -- TODO: reemplazar con email real
  -- 'otro-admin@ejemplo.com' -- descomentá si hay mas de un admin
);

-- Verificar que se aplicó:
-- SELECT id, email, full_name, role FROM profiles WHERE role = 'admin';

-- ────────────────────────────────────────────────────────────
-- PASO 2: Crear temporada inicial
-- ────────────────────────────────────────────────────────────

INSERT INTO seasons (name, start_date, end_date, is_current)
VALUES ('Temporada 2026', '2026-01-01', '2026-12-31', true)
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- PASO 3: Categorias por defecto (opcional)
-- ────────────────────────────────────────────────────────────
-- Descomentá y ajustá segun las necesidades de tu subcomision.

-- DO $$
-- DECLARE
--   v_admin_id UUID;
--   v_season_id UUID;
-- BEGIN
--   SELECT id INTO v_admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
--   SELECT id INTO v_season_id FROM seasons WHERE is_current = true;
--
--   INSERT INTO categories (name, description, icon, color, sort_order, season_id, created_by) VALUES
--     ('Cantina',         'Ingresos y gastos de la cantina',           'food',          '#10b981', 1, v_season_id, v_admin_id),
--     ('Viajes',          'Traslados a partidos y torneos',            'bus',           '#3b82f6', 2, v_season_id, v_admin_id),
--     ('Arbitros',        'Pagos a arbitros de partidos locales',      'whistle',       '#f59e0b', 3, v_season_id, v_admin_id),
--     ('Encuentros',      'Organizacion de encuentros deportivos',     'trophy',        '#8b5cf6', 4, v_season_id, v_admin_id),
--     ('Indumentaria',    'Camisetas, shorts y equipamiento',          'tshirt-crew',   '#ef4444', 5, v_season_id, v_admin_id),
--     ('Cuotas',          'Cobro de cuotas mensuales',                 'cash',          '#06b6d4', 6, v_season_id, v_admin_id),
--     ('Rifas y Eventos', 'Rifas, bonos y eventos especiales',         'ticket',        '#ec4899', 7, v_season_id, v_admin_id),
--     ('Mantenimiento',   'Mantenimiento de instalaciones',            'wrench',        '#6b7280', 8, v_season_id, v_admin_id);
-- END $$;

-- ────────────────────────────────────────────────────────────
-- PASO 4: Tipo de cambio inicial (opcional)
-- ────────────────────────────────────────────────────────────

-- INSERT INTO currency_rates (from_currency, to_currency, rate, effective_date)
-- VALUES ('USD', 'ARS', 1200.00, CURRENT_DATE);
