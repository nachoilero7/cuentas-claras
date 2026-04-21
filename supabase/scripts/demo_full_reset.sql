-- ╔═══════════════════════════════════════════════════════════════════════════╗
-- ║  CUENTAS CLARAS - RESET TOTAL                                           ║
-- ║                                                                         ║
-- ║  Qué hace:                                                              ║
-- ║    - Borra absolutamente TODOS los datos                                ║
-- ║    - Elimina TODOS los usuarios (incluidos los admins)                  ║
-- ║    - La base queda vacía como recién instalada                          ║
-- ║                                                                         ║
-- ║  Flujo después de correr esto:                                          ║
-- ║    1. El primer usuario que se registre → queda como ADMIN              ║
-- ║       (gracias al trigger handle_new_user actualizado)                  ║
-- ║    2. Los siguientes → quedan como VIEWER                               ║
-- ║    3. El admin puede promoverlos desde el panel de usuarios             ║
-- ║                                                                         ║
-- ║  Cómo ejecutar:                                                         ║
-- ║    Supabase Dashboard → SQL Editor → pegar y ejecutar                   ║
-- ║    URL: https://supabase.com/dashboard/project/uxejutfjoiepvnjmcddx/sql ║
-- ║                                                                         ║
-- ║  ⚠️  IRREVERSIBLE: perdés acceso hasta registrar un usuario nuevo       ║
-- ╚═══════════════════════════════════════════════════════════════════════════╝

BEGIN;

-- ============================================================
-- 1. BORRAR DATOS (orden respetando FK constraints)
--    Los triggers de auditoría van a generar entradas en
--    audit_log mientras corren estos DELETEs; se limpia al final.
-- ============================================================
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
-- 2. LIMPIAR AUDIT_LOG (incluye las entradas generadas arriba)
-- ============================================================
DELETE FROM audit_log;

-- ============================================================
-- 3. ELIMINAR TODOS LOS USUARIOS
--    ON DELETE CASCADE en profiles → se borran solos
-- ============================================================
DELETE FROM auth.users;

-- ============================================================
-- 5. VERIFICACIÓN FINAL (deberían dar 0 todos)
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM auth.users)              AS users,
  (SELECT COUNT(*) FROM profiles)                AS profiles,
  (SELECT COUNT(*) FROM seasons)                 AS seasons,
  (SELECT COUNT(*) FROM categories)              AS categories,
  (SELECT COUNT(*) FROM transactions)            AS transactions,
  (SELECT COUNT(*) FROM recurring_transactions)  AS recurring,
  (SELECT COUNT(*) FROM audit_log)               AS audit_entries;

COMMIT;
