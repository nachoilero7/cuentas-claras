import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/src/core/config/supabase';
import { useAuth } from './AuthProvider';
import { invalidateTableQueries } from '@/src/core/utils/queryInvalidation';

// ─── Tablas monitoreadas via Supabase Realtime ──────────────────────────────

const MONITORED_TABLES = [
  'transactions',
  'categories',
  'seasons',
  'profiles',
  'approval_requests',
  'recurring_transactions',
  'budget_alerts',
  'notifications',
] as const;

const DEBOUNCE_MS = 500;

// ─── Provider ───────────────────────────────────────────────────────────────

interface RealtimeProviderProps {
  children: React.ReactNode;
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTablesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Limpiar suscripcion existente al cerrar sesion
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel('app-changes');

    for (const table of MONITORED_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          // Filtrar cambios auto-originados para evitar doble invalidacion
          // (las mutaciones locales ya invalidan via onSuccess de TanStack Query)
          const record = (payload.new ?? payload.old) as Record<string, unknown> | null;
          if (
            record &&
            (record.created_by === user.id || record.user_id === user.id)
          ) {
            return;
          }

          // Agrupar invalidaciones con debounce para cambios rapidos
          pendingTablesRef.current.add(table);

          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          debounceTimerRef.current = setTimeout(() => {
            const tables = Array.from(pendingTablesRef.current);
            pendingTablesRef.current.clear();

            for (const t of tables) {
              invalidateTableQueries(t, queryClient);
            }
          }, DEBOUNCE_MS);
        },
      );
    }

    channel.subscribe((status) => {
      if (__DEV__ && status === 'SUBSCRIBED') {
        console.log('[Realtime] Suscrito a cambios en', MONITORED_TABLES.length, 'tablas');
      }
    });

    channelRef.current = channel;

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isAuthenticated, user?.id, queryClient]);

  return <>{children}</>;
}
