import { supabase } from '@/src/core/config/supabase';
import type { ApprovalRequest } from '@/src/core/types/database';

// ─── Tipos extendidos para aprobaciones con detalles ────────────────────────

export interface ApprovalWithDetails extends ApprovalRequest {
  transaction: {
    id: string;
    type: string;
    amount: number;
    currency: string;
    description: string;
    transaction_date: string;
    category: { id: string; name: string; color: string | null; icon: string | null } | null;
  } | null;
  requester: { id: string; full_name: string; email: string } | null;
  reviewer: { id: string; full_name: string; email: string } | null;
}

export interface ApprovalConfig {
  threshold_ars: number;
  threshold_usd: number;
}

// ─── Select con joins de transaccion, solicitante y revisor ─────────────────

const APPROVAL_SELECT = `
  *,
  transaction:transactions!transaction_id(id, type, amount, currency, description, transaction_date, category:categories!category_id(id, name, color, icon)),
  requester:profiles!requested_by(id, full_name, email),
  reviewer:profiles!reviewed_by(id, full_name, email)
`;

// ─── Umbrales por defecto para aprobacion ───────────────────────────────────

const DEFAULT_CONFIG: ApprovalConfig = {
  threshold_ars: 50000,
  threshold_usd: 100,
};

// ─── Obtener aprobaciones pendientes ────────────────────────────────────────

export async function getPendingApprovals() {
  const { data, error } = await supabase
    .from('approval_requests')
    .select(APPROVAL_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return { data: (data as ApprovalWithDetails[] | null) ?? [], error };
}

// ─── Obtener todas las aprobaciones (cualquier estado) ──────────────────────

export async function getAllApprovals(limit: number = 100) {
  const { data, error } = await supabase
    .from('approval_requests')
    .select(APPROVAL_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { data: (data as ApprovalWithDetails[] | null) ?? [], error };
}

// ─── Aprobar una solicitud ──────────────────────────────────────────────────

export async function approveRequest(id: string, comment?: string) {
  // Obtener el usuario autenticado para registrar quien aprueba
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  // Bloqueo optimista: verificar que la solicitud aun esta pendiente
  const { data: current, error: checkError } = await supabase
    .from('approval_requests')
    .select('status')
    .eq('id', id)
    .single();

  if (checkError) {
    return { data: null, error: checkError };
  }

  if (current.status !== 'pending') {
    return { data: null, error: new Error('Esta solicitud ya fue revisada') };
  }

  // Actualizar la solicitud de aprobacion
  const { data: approval, error: approvalError } = await supabase
    .from('approval_requests')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      comment: comment ?? null,
    })
    .eq('id', id)
    .eq('status', 'pending') // doble verificacion para evitar race conditions
    .select(APPROVAL_SELECT)
    .single();

  if (approvalError) {
    return { data: null, error: approvalError };
  }

  // Actualizar el estado de la transaccion asociada a aprobada
  const typedApproval = approval as ApprovalWithDetails;

  try {
    const { error: txError } = await supabase
      .from('transactions')
      .update({ status: 'approved' })
      .eq('id', typedApproval.transaction_id);

    if (txError) {
      // Rollback: revertir la solicitud de aprobacion a pendiente
      await supabase
        .from('approval_requests')
        .update({
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          comment: null,
        })
        .eq('id', id);

      return { data: null, error: txError };
    }
  } catch (error) {
    // Rollback: revertir la solicitud de aprobacion a pendiente ante error inesperado
    await supabase
      .from('approval_requests')
      .update({
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        comment: null,
      })
      .eq('id', id);

    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }

  return { data: typedApproval, error: null };
}

// ─── Rechazar una solicitud ─────────────────────────────────────────────────

export async function rejectRequest(id: string, comment: string) {
  // Obtener el usuario autenticado para registrar quien rechaza
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  // Bloqueo optimista: verificar que la solicitud aun esta pendiente
  const { data: current, error: checkError } = await supabase
    .from('approval_requests')
    .select('status')
    .eq('id', id)
    .single();

  if (checkError) {
    return { data: null, error: checkError };
  }

  if (current.status !== 'pending') {
    return { data: null, error: new Error('Esta solicitud ya fue revisada') };
  }

  // Actualizar la solicitud de aprobacion
  const { data: approval, error: approvalError } = await supabase
    .from('approval_requests')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      comment,
    })
    .eq('id', id)
    .eq('status', 'pending') // doble verificacion para evitar race conditions
    .select(APPROVAL_SELECT)
    .single();

  if (approvalError) {
    return { data: null, error: approvalError };
  }

  // Actualizar el estado de la transaccion asociada a rechazada
  const typedApproval = approval as ApprovalWithDetails;

  try {
    const { error: txError } = await supabase
      .from('transactions')
      .update({ status: 'rejected' })
      .eq('id', typedApproval.transaction_id);

    if (txError) {
      // Rollback: revertir la solicitud de rechazo a pendiente
      await supabase
        .from('approval_requests')
        .update({
          status: 'pending',
          reviewed_by: null,
          reviewed_at: null,
          comment: null,
        })
        .eq('id', id);

      return { data: null, error: txError };
    }
  } catch (error) {
    // Rollback: revertir la solicitud de rechazo a pendiente ante error inesperado
    await supabase
      .from('approval_requests')
      .update({
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        comment: null,
      })
      .eq('id', id);

    return { data: null, error: error instanceof Error ? error : new Error(String(error)) };
  }

  return { data: typedApproval, error: null };
}

// ─── Crear una nueva solicitud de aprobacion ────────────────────────────────

export async function createApprovalRequest(transactionId: string, thresholdAmount: number = 0) {
  // Obtener el usuario autenticado como solicitante
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { data: null, error: authError ?? new Error('Usuario no autenticado') };
  }

  const { data, error } = await supabase
    .from('approval_requests')
    .insert({
      transaction_id: transactionId,
      requested_by: user.id,
      status: 'pending',
      threshold_amount: thresholdAmount,
    })
    .select(APPROVAL_SELECT)
    .single();

  return { data: data as ApprovalWithDetails | null, error };
}

// ─── Obtener configuracion de umbrales de aprobacion ────────────────────────

export function getApprovalConfig(): ApprovalConfig {
  // Por ahora se usan valores por defecto.
  // En el futuro esto podria venir de una tabla de configuracion en Supabase.
  return { ...DEFAULT_CONFIG };
}

// ─── Verificar si una transaccion requiere aprobacion ───────────────────────
// Todas las transacciones de usuarios no-admin requieren aprobacion obligatoria.

export function needsApproval(_amount: number, _currency: string): boolean {
  return true;
}
