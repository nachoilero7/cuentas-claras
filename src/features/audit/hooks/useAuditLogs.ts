import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../services/auditService';
import type { AuditLogFilters, AuditLogWithUser } from '../services/auditService';
import { CACHE_DURATION } from '@/src/core/config/constants';

export function useAuditLogs(filters?: AuditLogFilters) {
  return useQuery<AuditLogWithUser[]>({
    queryKey: ['audit-logs', filters ?? 'all'],
    queryFn: async () => {
      const { data, error } = await getAuditLogs(filters);
      if (error) throw error;
      return data;
    },
    staleTime: CACHE_DURATION.ONE_MINUTE,
  });
}
