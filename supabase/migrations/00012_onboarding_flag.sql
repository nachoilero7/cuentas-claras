-- ============================================================
-- Cuentas Claras - Onboarding Flag
-- Migration: 00012_onboarding_flag
-- Description: Add has_completed_onboarding to profiles table
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN has_completed_onboarding BOOLEAN NOT NULL DEFAULT false;

-- Usuarios existentes ya estan onboardeados
UPDATE public.profiles
  SET has_completed_onboarding = true
  WHERE created_at < NOW();
