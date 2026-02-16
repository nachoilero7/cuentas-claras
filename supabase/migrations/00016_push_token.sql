-- ============================================================
-- Cuentas Claras - Push Token for profiles
-- Migration: 00016_push_token
-- Description: Adds push_token column to profiles table
--              to store Expo push notification tokens.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN push_token TEXT;
