import { supabase } from '@/src/core/config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BudgetAlert, BalanceAlertType } from '@/src/core/types/database';
import { createBalanceAlertNotification } from './notificationService';
import {
  notifyBalanceAlert,
  sendPushToAdminsAndManagers,
} from '@/src/core/services/pushNotifications';

// ─── Tipos extendidos para alertas con datos de categoria ───────────────────

export interface BudgetAlertWithCategory extends BudgetAlert {
  category: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
}

export interface BudgetStatus {
  alert_id: string;
  category_id: string;
  category_name: string;
  alert_type: BalanceAlertType;
  threshold_amount: number;
  current_balance: number;
  is_triggered: boolean;
}

// ─── Select con join de categoria ───────────────────────────────────────────

const ALERT_SELECT = `
  *,
  category:categories!category_id(id, name, color, icon)
`;

// ─── Obtener todas las alertas de presupuesto con info de categoria ─────────

export async function getBudgetAlerts() {
  const { data, error } = await supabase
    .from('budget_alerts')
    .select(ALERT_SELECT)
    .order('created_at', { ascending: false });

  return { data: (data as BudgetAlertWithCategory[] | null) ?? [], error };
}

// ─── Obtener alertas configuradas para una categoria especifica ─────────────

export async function getBudgetAlertsByCategory(categoryId: string) {
  const { data, error } = await supabase
    .from('budget_alerts')
    .select(ALERT_SELECT)
    .eq('category_id', categoryId);

  return { data: (data as BudgetAlertWithCategory[] | null) ?? [], error };
}

// ─── Crear o actualizar una alerta de balance (upsert on category_id + alert_type)

export async function upsertBudgetAlert(alertData: {
  category_id: string;
  alert_type: BalanceAlertType;
  threshold_amount: number;
  is_active: boolean;
}) {
  const { data, error } = await supabase
    .from('budget_alerts')
    .upsert(alertData, { onConflict: 'category_id,alert_type' })
    .select(ALERT_SELECT)
    .single();

  return { data: data as BudgetAlertWithCategory | null, error };
}

// ─── Eliminar una alerta de presupuesto ────────────────────────────────────

export async function deleteBudgetAlert(id: string) {
  const { data, error } = await supabase
    .from('budget_alerts')
    .delete()
    .eq('id', id)
    .select()
    .single();

  return { data: data as BudgetAlert | null, error };
}

// ─── Verificar el estado de todas las alertas activas contra balances ──────

export async function checkAllBudgets(seasonId?: string): Promise<{ data: BudgetStatus[]; error: Error | null }> {
  // Obtener todas las alertas activas
  const { data: alerts, error: alertsError } = await supabase
    .from('budget_alerts')
    .select('id, category_id, alert_type, threshold_amount')
    .eq('is_active', true);

  if (alertsError) {
    return { data: [], error: alertsError };
  }

  if (!alerts || alerts.length === 0) {
    return { data: [], error: null };
  }

  // Obtener balances reales via RPC
  const { data: balancesJson, error: balancesError } = await supabase.rpc(
    'get_category_balances',
    { p_season_id: seasonId ?? null },
  );

  if (balancesError) {
    return { data: [], error: balancesError };
  }

  // Construir mapa de balances por category_id
  const balances = (balancesJson ?? []) as Array<{
    category_id: string;
    category_name: string;
    balance_ars: number;
  }>;

  const balanceMap = new Map(
    balances.map((b) => [b.category_id, b]),
  );

  // Evaluar cada alerta
  const statuses: BudgetStatus[] = alerts
    .map((alert) => {
      const balance = balanceMap.get(alert.category_id);
      const currentBalance = balance?.balance_ars ?? 0;

      const isTriggered =
        alert.alert_type === 'below'
          ? currentBalance < alert.threshold_amount
          : currentBalance >= alert.threshold_amount;

      return {
        alert_id: alert.id,
        category_id: alert.category_id,
        category_name: balance?.category_name ?? '',
        alert_type: alert.alert_type as BalanceAlertType,
        threshold_amount: alert.threshold_amount,
        current_balance: currentBalance,
        is_triggered: isTriggered,
      };
    })
    .filter((s) => s.category_name !== '');

  return { data: statuses, error: null };
}

const BUDGET_ALERT_LAST_CHECK_KEY = '@cuentas_claras:budget_alert_last_check';
const MIN_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 horas entre chequeos

// ─── Despachar notificaciones de alertas de balance ─────────────────────────

export async function dispatchBudgetAlertNotifications(): Promise<{
  notified: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let notified = 0;

  try {
    // Throttle: no chequear mas de una vez cada 4 horas
    const lastCheck = await AsyncStorage.getItem(BUDGET_ALERT_LAST_CHECK_KEY);
    if (lastCheck) {
      const elapsed = Date.now() - parseInt(lastCheck, 10);
      if (elapsed < MIN_CHECK_INTERVAL_MS) {
        return { notified: 0, errors: [] };
      }
    }

    // Verificar alertas
    const { data: statuses, error: statusError } = await checkAllBudgets();
    if (statusError) {
      return { notified: 0, errors: [statusError.message] };
    }

    // Filtrar solo los que se dispararon
    const triggered = statuses.filter((s) => s.is_triggered);
    if (triggered.length === 0) {
      await AsyncStorage.setItem(BUDGET_ALERT_LAST_CHECK_KEY, Date.now().toString());
      return { notified: 0, errors: [] };
    }

    // Obtener usuarios admin y manager para notificar
    const { data: targetUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .in('role', ['admin', 'manager'])
      .eq('is_active', true);

    if (usersError || !targetUsers || targetUsers.length === 0) {
      return { notified: 0, errors: usersError ? [usersError.message] : [] };
    }

    const targetUserIds = targetUsers.map((u) => u.id);

    // Crear notificaciones in-app + push para cada alerta disparada
    for (const status of triggered) {
      try {
        // 1. Notificacion in-app (guardada en DB)
        const { error: notifError } = await createBalanceAlertNotification(
          status.category_name,
          status.alert_type,
          status.threshold_amount,
          status.current_balance,
          targetUserIds,
        );

        if (notifError) {
          errors.push(`${status.category_name}: ${notifError.message}`);
        } else {
          notified++;
        }

        // 2. Notificacion local (bell + sonido en el dispositivo actual)
        await notifyBalanceAlert(
          status.category_name,
          status.alert_type,
          status.threshold_amount,
          status.current_balance,
        );

        // 3. Push notification a todos los admin/manager (otros dispositivos)
        const formattedThreshold = `$${status.threshold_amount.toLocaleString('es-AR')}`;
        const formattedBalance = `$${status.current_balance.toLocaleString('es-AR')}`;
        const pushTitle = status.alert_type === 'below'
          ? `Balance bajo: ${status.category_name}`
          : `Balance alto: ${status.category_name}`;
        const pushBody = status.alert_type === 'below'
          ? `Balance (${formattedBalance}) por debajo de ${formattedThreshold}`
          : `Balance (${formattedBalance}) alcanzo ${formattedThreshold}`;

        await sendPushToAdminsAndManagers(
          pushTitle,
          pushBody,
          { type: 'balance_alert', category: status.category_name, alert_type: status.alert_type },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        errors.push(`${status.category_name}: ${msg}`);
      }
    }

    // Guardar timestamp del ultimo chequeo
    await AsyncStorage.setItem(BUDGET_ALERT_LAST_CHECK_KEY, Date.now().toString());
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error general';
    errors.push(msg);
  }

  return { notified, errors };
}
