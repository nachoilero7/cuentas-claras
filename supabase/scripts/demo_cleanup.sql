-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  CUENTAS CLARAS - LIMPIEZA PARA DEMO                                    ║
-- ║                                                                         ║
-- ║  Qué hace:                                                              ║
-- ║    - Borra TODOS los datos (transacciones, rubros, temporadas, etc.)    ║
-- ║    - Elimina todos los usuarios EXCEPTO los admins listados abajo       ║
-- ║    - Garantiza que los admins tengan role = 'admin'                     ║
-- ║                                                                         ║
-- ║  Cómo ejecutar:                                                         ║
-- ║    Supabase Dashboard → SQL Editor → pegar y ejecutar                   ║
-- ║    URL: https://supabase.com/dashboard/project/uxejutfjoiepvnjmcddx/sql ║
-- ║                                                                         ║
-- ║  ⚠️  IRREVERSIBLE: hacer backup antes si hay datos que quieras guardar  ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ============================================================
-- 1. DESHABILITAR TRIGGERS DE AUDITORÍA DURANTE LA LIMPIEZA
--    Evita generar miles de entradas en audit_log al borrar
-- ============================================================
SET session_replication_role = replica;

-- ============================================================
-- 2. BORRAR DATOS (orden respetando FK constraints)
-- ============================================================

DELETE FROM audit_log;
DELETE FROM notifications;
DELETE FROM budget_alerts;
DELETE FROM recurring_transactions;
DELETE FROM approval_requests;
DELETE FROM attachments;
DELETE FROM transactions;
DELETE FROM user_category_permissions;
DELETE FROM currency_rates;
DELETE FROM categories;
DELETE FROM seasons;

-- ============================================================
-- 3. REACTIVAR TRIGGERS
-- ============================================================
SET session_replication_role = DEFAULT;

-- ============================================================
-- 4. ELIMINAR USUARIOS (excepto los admins de la demo)
--    ON DELETE CASCADE en profiles → se borran solos
-- ============================================================
DELETE FROM auth.users
WHERE email NOT IN (
  'nachoilero7@gmail.com',
  'kachilero@gmail.com'
);

-- ============================================================
-- 5. GARANTIZAR ROL ADMIN EN LOS USUARIOS QUE QUEDAN
--    (por si alguno quedó como viewer por algún motivo)
-- ============================================================
UPDATE profiles
SET
  role        = 'admin',
  is_active   = true,
  updated_at  = NOW()
WHERE email IN (
  'nachoilero7@gmail.com',
  'kachilero@gmail.com'
);

-- ============================================================
-- 6. VERIFICACIÓN FINAL
-- ============================================================
SELECT
  email,
  full_name,
  role,
  is_active,
  has_completed_onboarding
FROM profiles
ORDER BY email;

COMMIT;
