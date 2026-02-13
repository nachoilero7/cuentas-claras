import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSeasons,
  getSeasonById,
  getCurrentSeason,
  createSeason,
  updateSeason,
  setCurrentSeason,
  deleteSeason,
} from '../services/seasonService';
import type { Season } from '@/src/core/types/database';
import type { CreateSeasonData, UpdateSeasonData } from '../services/seasonService';
import { invalidateFinancialData } from '@/src/core/utils/queryInvalidation';

const TEN_MINUTES = 1000 * 60 * 10;

// ── Listar todas las temporadas ─────────────────────────────────────────────

export function useSeasons() {
  return useQuery<Season[]>({
    queryKey: ['seasons'],
    queryFn: async () => {
      const { data, error } = await getSeasons();
      if (error) throw error;
      return data;
    },
  });
}

// ── Obtener una temporada por ID ────────────────────────────────────────────

export function useSeason(id: string) {
  return useQuery<Season | null>({
    queryKey: ['season', id],
    queryFn: async () => {
      const { data, error } = await getSeasonById(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

// ── Obtener la temporada actual ─────────────────────────────────────────────

export function useCurrentSeason() {
  return useQuery<Season | null>({
    queryKey: ['current-season'],
    queryFn: async () => {
      const { data, error } = await getCurrentSeason();
      if (error) throw error;
      return data;
    },
    staleTime: TEN_MINUTES,
  });
}

// ── Crear nueva temporada ───────────────────────────────────────────────────

export function useCreateSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSeasonData) => {
      const { data: season, error } = await createSeason(data);
      if (error) throw error;
      return season;
    },
    onSuccess: () => {
      // Invalidar la lista de temporadas para refrescar
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });
}

// ── Actualizar temporada ────────────────────────────────────────────────────

export function useUpdateSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateSeasonData }) => {
      const { data, error } = await updateSeason(id, updates);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      // Invalidar la lista y el detalle de la temporada actualizada
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['season', variables.id] });
    },
  });
}

// ── Establecer temporada actual ─────────────────────────────────────────────

export function useSetCurrentSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await setCurrentSeason(id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar temporadas y la temporada actual para reflejar el cambio
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['current-season'] });
      // Invalidar todos los datos que dependen de la temporada activa
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
    },
  });
}

// ── Eliminar temporada ──────────────────────────────────────────────────────

export function useDeleteSeason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await deleteSeason(id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidar la lista de temporadas y la temporada actual
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['current-season'] });
      // Invalidar todos los datos que dependen de la temporada eliminada
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      invalidateFinancialData(queryClient);
      queryClient.invalidateQueries({ queryKey: ['recurring'] });
      queryClient.invalidateQueries({ queryKey: ['budget-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['approvals'] });
    },
  });
}
