-- ============================================================
-- Cuentas Claras - Primer usuario como admin
-- Migration: 00020_first_user_as_admin
-- Description: Si no existe ningún perfil en el sistema, el
--              nuevo usuario registrado se crea como 'admin'.
--              Los siguientes siguen siendo 'viewer' por defecto
--              y un admin puede promoverlos desde el panel de
--              usuarios.
--
--              Nota: se prefija 'public.' en los tipos y tablas
--              y se setea search_path = public para que el
--              trigger funcione cuando Supabase Auth lo dispara
--              desde contextos sin ese schema en el search_path.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
BEGIN
  -- Primer usuario del sistema => admin. Resto => viewer.
  IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    v_role := 'admin'::public.user_role;
  ELSE
    v_role := 'viewer'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuario'),
    v_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
