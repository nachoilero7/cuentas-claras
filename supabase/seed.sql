-- ============================================================
-- Cuentas Claras - Seed Data
-- Description: Default categories and initial configuration
-- Note: Run this after creating the first admin user manually
-- ============================================================

-- Insert default categories (requires a valid created_by user ID)
-- Replace 'YOUR_ADMIN_USER_ID' with the actual admin user UUID after first signup

-- Example categories for basketball sub-commission:
-- INSERT INTO categories (name, description, icon, color, sort_order, created_by) VALUES
--   ('Cantina', 'Ingresos y gastos de la cantina del club', 'food', '#10b981', 1, 'YOUR_ADMIN_USER_ID'),
--   ('Viajes', 'Gastos de traslados a partidos y torneos', 'bus', '#3b82f6', 2, 'YOUR_ADMIN_USER_ID'),
--   ('Arbitros', 'Pagos a arbitros de partidos locales', 'whistle', '#f59e0b', 3, 'YOUR_ADMIN_USER_ID'),
--   ('Encuentros', 'Organizacion de encuentros deportivos', 'trophy', '#8b5cf6', 4, 'YOUR_ADMIN_USER_ID'),
--   ('Indumentaria', 'Compra de camisetas, shorts y equipamiento', 'tshirt-crew', '#ef4444', 5, 'YOUR_ADMIN_USER_ID'),
--   ('Cuotas', 'Cobro de cuotas mensuales de jugadores', 'cash', '#06b6d4', 6, 'YOUR_ADMIN_USER_ID'),
--   ('Rifas y Eventos', 'Ingresos por rifas, bonos y eventos especiales', 'ticket', '#ec4899', 7, 'YOUR_ADMIN_USER_ID'),
--   ('Mantenimiento', 'Gastos de mantenimiento de instalaciones', 'wrench', '#6b7280', 8, 'YOUR_ADMIN_USER_ID');
