-- ============================================================
-- Cuentas Claras - Security Hardening
-- Migration: 00010_security_hardening
-- Description: Fix 5 security issues found in deep audit
-- ============================================================

-- ============================================================
-- FIX 1: handle_new_user() - Privilege escalation
-- ANTES: Leia el rol desde raw_user_meta_data, permitiendo
--        que un atacante se registre como admin.
-- AHORA: Siempre asigna 'viewer'. Un admin debe promover.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
    'viewer'  -- SIEMPRE viewer, nunca leer rol desde metadata
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FIX 2: get_user_role() - Usuarios desactivados
-- ANTES: Retornaba el rol sin importar is_active.
-- AHORA: Retorna NULL si el usuario esta desactivado,
--        lo que hace que todas las RLS policies fallen (deny).
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- FIX 3: set_current_season - Sin check de rol
-- ANTES: Cualquier usuario autenticado podia cambiar la
--        temporada actual (SECURITY DEFINER sin validacion).
-- AHORA: Solo admins pueden ejecutar esta operacion.
-- ============================================================

CREATE OR REPLACE FUNCTION set_current_season(p_season_id UUID)
RETURNS SETOF seasons AS $$
BEGIN
  -- Solo admins pueden cambiar la temporada actual
  IF (SELECT role FROM profiles WHERE id = auth.uid() AND is_active = true) != 'admin' THEN
    RAISE EXCEPTION 'Permisos insuficientes: solo administradores pueden cambiar la temporada actual';
  END IF;

  -- Desmarcar todas las temporadas como no actuales
  UPDATE seasons SET is_current = false WHERE is_current = true;

  -- Marcar la temporada indicada como actual
  UPDATE seasons SET is_current = true WHERE id = p_season_id;

  -- Retornar la temporada actualizada
  RETURN QUERY SELECT * FROM seasons WHERE id = p_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FIX 4: Transaction RLS - Validar rubro destino en transfers
-- ANTES: Solo se validaban permisos sobre category_id (origen),
--        permitiendo transferencias a rubros sin acceso.
-- AHORA: INSERT y UPDATE validan ambos rubros.
-- ============================================================

-- Reemplazar policy de INSERT
DROP POLICY IF EXISTS "transactions_insert_permitted" ON transactions;
CREATE POLICY "transactions_insert_permitted"
  ON transactions FOR INSERT
  WITH CHECK (
    get_user_role() = 'admin'
    OR (
      has_category_permission(category_id, 'create')
      AND (
        transfer_to_category_id IS NULL
        OR has_category_permission(transfer_to_category_id, 'create')
      )
    )
  );

-- Reemplazar policy de UPDATE
DROP POLICY IF EXISTS "transactions_update_permitted" ON transactions;
CREATE POLICY "transactions_update_permitted"
  ON transactions FOR UPDATE
  USING (
    get_user_role() = 'admin'
    OR (
      has_category_permission(category_id, 'edit')
      AND created_by = auth.uid()
      AND (
        transfer_to_category_id IS NULL
        OR has_category_permission(transfer_to_category_id, 'edit')
      )
    )
  );

-- ============================================================
-- FIX 5: Dashboard RPCs - Filtrar por permisos de categoria
-- ANTES: SECURITY DEFINER retornaba TODOS los datos.
-- AHORA: Admins ven todo, otros solo ven categorias permitidas.
-- ============================================================

-- 5a. get_dashboard_summary: filtrar transacciones por permisos
CREATE OR REPLACE FUNCTION get_dashboard_summary(p_season_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = true;

  SELECT json_build_object(
    'total_income_ars', COALESCE(SUM(CASE
      WHEN type = 'income' AND status = 'approved'
      THEN amount_in_ars ELSE 0
    END), 0),
    'total_expenses_ars', COALESCE(SUM(CASE
      WHEN type = 'expense' AND status = 'approved'
      THEN amount_in_ars ELSE 0
    END), 0),
    'net_balance_ars', COALESCE(SUM(CASE
      WHEN type = 'income' AND status = 'approved' THEN amount_in_ars
      WHEN type = 'expense' AND status = 'approved' THEN -amount_in_ars
      ELSE 0
    END), 0),
    'total_income_usd', COALESCE(SUM(CASE
      WHEN type = 'income' AND status = 'approved' AND currency = 'USD'
      THEN amount ELSE 0
    END), 0),
    'total_expenses_usd', COALESCE(SUM(CASE
      WHEN type = 'expense' AND status = 'approved' AND currency = 'USD'
      THEN amount ELSE 0
    END), 0),
    'net_balance_usd', COALESCE(SUM(CASE
      WHEN type = 'income' AND status = 'approved' AND currency = 'USD' THEN amount
      WHEN type = 'expense' AND status = 'approved' AND currency = 'USD' THEN -amount
      ELSE 0
    END), 0),
    'transaction_count', COUNT(*),
    'pending_approvals', COUNT(*) FILTER (WHERE status = 'pending')
  ) INTO result
  FROM transactions
  WHERE (p_season_id IS NULL OR season_id = p_season_id)
    AND (
      v_role = 'admin'
      OR has_category_permission(category_id, 'view')
    );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5b. get_monthly_breakdown: filtrar por permisos
CREATE OR REPLACE FUNCTION get_monthly_breakdown(
  p_season_id UUID DEFAULT NULL,
  p_months INTEGER DEFAULT 6
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = true;

  SELECT json_agg(row_data) INTO result
  FROM (
    SELECT
      TO_CHAR(DATE_TRUNC('month', transaction_date), 'YYYY-MM') AS month,
      TO_CHAR(DATE_TRUNC('month', transaction_date), 'Mon YYYY') AS label,
      COALESCE(SUM(CASE WHEN type = 'income' AND status = 'approved'
        THEN amount_in_ars ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'approved'
        THEN amount_in_ars ELSE 0 END), 0) AS expenses
    FROM transactions
    WHERE transaction_date >= DATE_TRUNC('month', CURRENT_DATE) - (p_months || ' months')::INTERVAL
      AND (p_season_id IS NULL OR season_id = p_season_id)
      AND (
        v_role = 'admin'
        OR has_category_permission(category_id, 'view')
      )
    GROUP BY DATE_TRUNC('month', transaction_date)
    ORDER BY DATE_TRUNC('month', transaction_date)
  ) AS row_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5c. get_category_breakdown: filtrar por permisos
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_season_id UUID DEFAULT NULL,
  p_type transaction_type DEFAULT 'expense',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid() AND is_active = true;

  SELECT json_agg(row_data) INTO result
  FROM (
    SELECT
      c.id AS category_id,
      c.name AS category_name,
      c.color,
      c.icon,
      COALESCE(SUM(t.amount_in_ars), 0) AS total_ars,
      COUNT(t.id) AS count
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id
      AND t.type = p_type
      AND t.status = 'approved'
      AND (p_start_date IS NULL OR t.transaction_date >= p_start_date)
      AND (p_end_date IS NULL OR t.transaction_date <= p_end_date)
    WHERE c.is_active = true
      AND (p_season_id IS NULL OR c.season_id = p_season_id)
      AND (
        v_role = 'admin'
        OR has_category_permission(c.id, 'view')
      )
    GROUP BY c.id, c.name, c.color, c.icon
    HAVING COALESCE(SUM(t.amount_in_ars), 0) > 0
    ORDER BY total_ars DESC
  ) AS row_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
