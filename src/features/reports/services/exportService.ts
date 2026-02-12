import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// ── Tipos para exportacion de transacciones ─────────────────────────────────

export interface ExportTransaction {
  transaction_date: string;
  type: 'income' | 'expense' | 'transfer';
  description: string;
  category_name: string;
  amount: number;
  currency: string;
  status: string;
  payment_method?: string | null;
}

// ── Tipos para exportacion de balances por categoria ────────────────────────

export interface ExportCategoryBalance {
  name: string;
  total_income: number;
  total_expenses: number;
  balance: number;
  currency: string;
}

// ── Filtros opcionales para incluir en el resumen ───────────────────────────

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  type?: string;
  categoryName?: string;
  seasonName?: string;
}

// ── Mapas de etiquetas en espanol ───────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Egreso',
  transfer: 'Transferencia',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

// ── Utilidad para formatear fecha legible ────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// ── Utilidad para aplicar ancho de columnas ─────────────────────────────────

function applyColumnWidths(ws: XLSX.WorkSheet, widths: number[]): void {
  ws['!cols'] = widths.map((w) => ({ wch: w }));
}

// ── Utilidad para guardar y compartir el archivo XLSX ───────────────────────

async function saveAndShareWorkbook(
  wb: XLSX.WorkBook,
  filePrefix: string,
): Promise<void> {
  const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileName = `${filePrefix}_${Date.now()}.xlsx`;
  const filePath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(filePath, {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// ── Construir hoja de movimientos ───────────────────────────────────────────

function buildTransactionsSheet(
  transactions: ExportTransaction[],
): XLSX.WorkSheet {
  const headers = [
    'Fecha',
    'Tipo',
    'Descripcion',
    'Rubro',
    'Monto',
    'Moneda',
    'Estado',
  ];

  const rows = transactions.map((t) => [
    formatDate(t.transaction_date),
    TYPE_LABELS[t.type] ?? t.type,
    t.description,
    t.category_name,
    t.amount,
    t.currency,
    STATUS_LABELS[t.status] ?? t.status,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Anchos de columna ajustados al contenido esperado
  applyColumnWidths(ws, [14, 16, 32, 20, 14, 10, 14]);

  return ws;
}

// ── Construir hoja de resumen ───────────────────────────────────────────────

function buildSummarySheet(
  transactions: ExportTransaction[],
  filters?: ExportFilters,
): XLSX.WorkSheet {
  const totalIngresos = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalEgresos = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalTransferencias = transactions
    .filter((t) => t.type === 'transfer')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalMovimientos = transactions.length;

  // Determinar rango de fechas a partir de los datos
  const dates = transactions
    .map((t) => t.transaction_date)
    .filter(Boolean)
    .sort();

  const fechaDesde = dates.length > 0 ? formatDate(dates[0]) : '-';
  const fechaHasta =
    dates.length > 0 ? formatDate(dates[dates.length - 1]) : '-';

  const summaryData: (string | number)[][] = [
    ['Resumen de Movimientos', ''],
    ['', ''],
    ['Concepto', 'Valor'],
    ['Total Ingresos', totalIngresos],
    ['Total Egresos', totalEgresos],
    ['Total Transferencias', totalTransferencias],
    ['Cantidad de Movimientos', totalMovimientos],
    ['', ''],
    ['Rango de Fechas', ''],
    ['Desde', fechaDesde],
    ['Hasta', fechaHasta],
  ];

  // Agregar informacion de filtros si se proporcionan
  if (filters) {
    summaryData.push(['', '']);
    summaryData.push(['Filtros Aplicados', '']);

    if (filters.seasonName) {
      summaryData.push(['Temporada', filters.seasonName]);
    }
    if (filters.type) {
      summaryData.push(['Tipo', TYPE_LABELS[filters.type] ?? filters.type]);
    }
    if (filters.categoryName) {
      summaryData.push(['Rubro', filters.categoryName]);
    }
    if (filters.startDate) {
      summaryData.push(['Fecha desde', formatDate(filters.startDate)]);
    }
    if (filters.endDate) {
      summaryData.push(['Fecha hasta', formatDate(filters.endDate)]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(summaryData);

  applyColumnWidths(ws, [28, 20]);

  return ws;
}

// ── Exportar transacciones a Excel ──────────────────────────────────────────

export async function exportTransactionsToExcel(
  transactions: ExportTransaction[],
  filters?: ExportFilters,
): Promise<void> {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Detalle de movimientos
  const wsMovimientos = buildTransactionsSheet(transactions);
  XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos');

  // Hoja 2: Resumen con totales
  const wsResumen = buildSummarySheet(transactions, filters);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  await saveAndShareWorkbook(wb, 'cuentas_claras_movimientos');
}

// ── Exportar balances por categoria a Excel ─────────────────────────────────

export async function exportCategoryBalancesToExcel(
  balances: ExportCategoryBalance[],
): Promise<void> {
  const headers = ['Rubro', 'Ingresos', 'Egresos', 'Balance', 'Moneda'];

  const rows = balances.map((b) => [
    b.name,
    b.total_income,
    b.total_expenses,
    b.balance,
    b.currency,
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  applyColumnWidths(ws, [24, 16, 16, 16, 10]);

  XLSX.utils.book_append_sheet(wb, ws, 'Balances por Rubro');

  await saveAndShareWorkbook(wb, 'cuentas_claras_balances');
}
