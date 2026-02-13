import { supabase } from '@/src/core/config/supabase';
import type { AuditAction, AuditLogEntry, Profile } from '@/src/core/types/database';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  tableName?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface AuditLogWithUser extends AuditLogEntry {
  profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
}

const DEFAULT_LIMIT = 30;

const AUDIT_LOG_SELECT = `
  *,
  profile:profiles!audit_log_user_id_fkey(id, full_name, email, avatar_url)
`;

// ─── Listar registros de auditoria con filtros y paginacion ─────────────────

export async function getAuditLogs(filters?: AuditLogFilters) {
  const limit = filters?.limit ?? DEFAULT_LIMIT;
  const offset = filters?.offset ?? 0;

  let query = supabase
    .from('audit_log')
    .select(AUDIT_LOG_SELECT)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters?.action) {
    query = query.eq('action', filters.action);
  }

  if (filters?.tableName) {
    query = query.eq('table_name', filters.tableName);
  }

  if (filters?.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query;

  return { data: (data as AuditLogWithUser[] | null) ?? [], error };
}
