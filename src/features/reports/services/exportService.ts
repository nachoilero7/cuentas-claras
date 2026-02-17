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
  destination_alias?: string | null;
  created_by_name?: string;
  transfer_to_category_name?: string;
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  bank_transfer: 'Transferencia bancaria',
  digital_wallet: 'Billetera virtual',
  check: 'Cheque',
};

// ── Utilidad para formatear fecha legible ────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00');
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

// ── Aplicar formato de numero a un rango de celdas ─────────────────────────

function applyNumberFormat(ws: XLSX.WorkSheet, col: number, startRow: number, endRow: number, fmt: string): void {
  for (let r = startRow; r <= endRow; r++) {
    const addr = XLSX.utils.encode_cell({ c: col, r });
    if (ws[addr] && typeof ws[addr].v === 'number') {
      ws[addr].z = fmt;
    }
  }
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

  FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {});
}

// ── Hoja 1: Detalle de movimientos ──────────────────────────────────────────

function buildTransactionsSheet(
  transactions: ExportTransaction[],
): XLSX.WorkSheet {
  const headers = [
    'Fecha',
    'Tipo',
    'Descripcion',
    'Rubro Origen',
    'Rubro Destino',
    'Alias Destino',
    'Monto',
    'Moneda',
    'Medio de Pago',
    'Registrado por',
    'Estado',
  ];

  const rows = transactions.map((t) => [
    formatDate(t.transaction_date),
    TYPE_LABELS[t.type] ?? t.type,
    t.description,
    t.category_name,
    t.transfer_to_category_name ?? '',
    t.destination_alias ?? '',
    t.amount,
    t.currency,
    t.payment_method ? (PAYMENT_METHOD_LABELS[t.payment_method] ?? t.payment_method) : '',
    t.created_by_name ?? '',
    STATUS_LABELS[t.status] ?? t.status,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Anchos de columna
  applyColumnWidths(ws, [14, 16, 36, 20, 20, 24, 16, 10, 22, 20, 14]);

  // Formato de moneda para la columna Monto (col 6, filas 1..n)
  applyNumberFormat(ws, 6, 1, rows.length, '#,##0.00');

  // Auto-filtro en el rango de encabezado
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: 0 } }) };

  return ws;
}

// ── Hoja 2: Resumen general ─────────────────────────────────────────────────

function buildSummarySheet(
  transactions: ExportTransaction[],
  filters?: ExportFilters,
): XLSX.WorkSheet {
  const incomes = transactions.filter((t) => t.type === 'income');
  const expenses = transactions.filter((t) => t.type === 'expense');
  const transfers = transactions.filter((t) => t.type === 'transfer');

  const totalIngresos = incomes.reduce((sum, t) => sum + t.amount, 0);
  const totalEgresos = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalTransferencias = transfers.reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIngresos - totalEgresos;
  const totalMovimientos = transactions.length;
  const promedioMov = totalMovimientos > 0 ? (totalIngresos + totalEgresos) / totalMovimientos : 0;

  // Dias con actividad
  const uniqueDates = new Set(transactions.map((t) => t.transaction_date));

  // Rango de fechas
  const dates = transactions.map((t) => t.transaction_date).filter(Boolean).sort();
  const fechaDesde = dates.length > 0 ? formatDate(dates[0]) : '-';
  const fechaHasta = dates.length > 0 ? formatDate(dates[dates.length - 1]) : '-';

  const data: (string | number)[][] = [
    ['CUENTAS CLARAS - REPORTE FINANCIERO', '', ''],
    ['Club Independiente - Basquet de Menores', '', ''],
    ['', '', ''],

    // Metadatos
    ['Periodo', `${fechaDesde} al ${fechaHasta}`, ''],
    ['Generado', new Date().toLocaleString('es-AR'), ''],
    ['', '', ''],

    // Resumen principal
    ['RESUMEN EJECUTIVO', '', ''],
    ['', '', ''],
    ['Concepto', 'Monto', 'Detalle'],
    ['Total Ingresos', totalIngresos, `${incomes.length} movimientos`],
    ['Total Egresos', totalEgresos, `${expenses.length} movimientos`],
    ['Balance Neto', balance, balance >= 0 ? 'Superavit' : 'Deficit'],
    ['Total Transferencias', totalTransferencias, `${transfers.length} movimientos`],
    ['', '', ''],
    ['Cantidad de Movimientos', totalMovimientos, ''],
    ['Promedio por Movimiento', promedioMov, ''],
    ['Dias con Actividad', uniqueDates.size, `de ${dates.length > 0 ? Math.max(1, Math.round((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (1000 * 60 * 60 * 24)) + 1) : 0} dias del periodo`],
    ['', '', ''],

    // Mayor ingreso/egreso
    ['MOVIMIENTOS DESTACADOS', '', ''],
    ['', '', ''],
  ];

  // Mayor ingreso
  const biggestIncome = incomes.sort((a, b) => b.amount - a.amount)[0];
  if (biggestIncome) {
    data.push(['Mayor Ingreso', biggestIncome.amount, `${biggestIncome.description} (${biggestIncome.category_name})`]);
  }

  // Mayor egreso
  const biggestExpense = expenses.sort((a, b) => b.amount - a.amount)[0];
  if (biggestExpense) {
    data.push(['Mayor Egreso', biggestExpense.amount, `${biggestExpense.description} (${biggestExpense.category_name})`]);
  }

  // Filtros aplicados
  if (filters && (filters.seasonName || filters.type || filters.categoryName || filters.startDate || filters.endDate)) {
    data.push(['', '', '']);
    data.push(['FILTROS APLICADOS', '', '']);
    data.push(['', '', '']);
    if (filters.seasonName) data.push(['Temporada', filters.seasonName, '']);
    if (filters.type) data.push(['Tipo', TYPE_LABELS[filters.type] ?? filters.type, '']);
    if (filters.categoryName) data.push(['Rubro', filters.categoryName, '']);
    if (filters.startDate) data.push(['Fecha desde', formatDate(filters.startDate), '']);
    if (filters.endDate) data.push(['Fecha hasta', formatDate(filters.endDate), '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  applyColumnWidths(ws, [30, 22, 40]);

  // Formato de moneda para valores numericos en columna B
  for (let r = 0; r < data.length; r++) {
    const addr = XLSX.utils.encode_cell({ c: 1, r });
    if (ws[addr] && typeof ws[addr].v === 'number') {
      ws[addr].z = '#,##0.00';
    }
  }

  // Merge titulo principal
  ws['!merges'] = [
    { s: { c: 0, r: 0 }, e: { c: 2, r: 0 } },
    { s: { c: 0, r: 1 }, e: { c: 2, r: 1 } },
  ];

  return ws;
}

// ── Hoja 3: Desglose por rubro ──────────────────────────────────────────────

function buildCategorySheet(transactions: ExportTransaction[]): XLSX.WorkSheet {
  const categoryMap = new Map<string, { income: number; expense: number; transfer: number; count: number }>();

  for (const t of transactions) {
    const cat = t.category_name;
    let entry = categoryMap.get(cat);
    if (!entry) {
      entry = { income: 0, expense: 0, transfer: 0, count: 0 };
      categoryMap.set(cat, entry);
    }
    if (t.type === 'income') entry.income += t.amount;
    else if (t.type === 'expense') entry.expense += t.amount;
    else if (t.type === 'transfer') entry.transfer += t.amount;
    entry.count++;
  }

  const headers = ['Rubro', 'Ingresos', 'Egresos', 'Balance', 'Transferencias', 'Movimientos', '% del Total'];

  const totalCount = transactions.length;
  const entries = Array.from(categoryMap.entries()).sort((a, b) => b[1].count - a[1].count);

  const rows = entries.map(([name, data]) => [
    name,
    data.income,
    data.expense,
    data.income - data.expense,
    data.transfer,
    data.count,
    totalCount > 0 ? Math.round((data.count / totalCount) * 100) : 0,
  ]);

  // Fila de totales
  let tIncome = 0;
  let tExpense = 0;
  let tBalance = 0;
  let tTransfer = 0;
  let tCount = 0;
  for (const [, data] of entries) {
    tIncome += data.income;
    tExpense += data.expense;
    tBalance += data.income - data.expense;
    tTransfer += data.transfer;
    tCount += data.count;
  }

  const totalRow = ['TOTAL', tIncome, tExpense, tBalance, tTransfer, tCount, 100];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows, [], totalRow]);

  applyColumnWidths(ws, [24, 18, 18, 18, 18, 14, 12]);

  // Formato de moneda (cols 1-4)
  const dataRows = rows.length + 2; // header + data + blank + total
  for (let col = 1; col <= 4; col++) {
    applyNumberFormat(ws, col, 1, rows.length, '#,##0.00');
    // Total row
    const totalAddr = XLSX.utils.encode_cell({ c: col, r: rows.length + 2 });
    if (ws[totalAddr] && typeof ws[totalAddr].v === 'number') {
      ws[totalAddr].z = '#,##0.00';
    }
  }

  // Formato porcentaje (col 6)
  applyNumberFormat(ws, 6, 1, dataRows, '0"%"');

  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: 0 } }) };

  return ws;
}

// ── Hoja 4: Desglose por medio de pago ──────────────────────────────────────

function buildPaymentMethodSheet(transactions: ExportTransaction[]): XLSX.WorkSheet {
  const methodMap = new Map<string, { total: number; count: number; income: number; expense: number }>();

  for (const t of transactions) {
    const method = t.payment_method ?? 'none';
    let entry = methodMap.get(method);
    if (!entry) {
      entry = { total: 0, count: 0, income: 0, expense: 0 };
      methodMap.set(method, entry);
    }
    entry.total += t.amount;
    entry.count++;
    if (t.type === 'income') entry.income += t.amount;
    else if (t.type === 'expense') entry.expense += t.amount;
  }

  const headers = ['Medio de Pago', 'Monto Total', 'Ingresos', 'Egresos', 'Movimientos', '% del Total'];

  const grandTotal = transactions.reduce((s, t) => s + t.amount, 0);
  const entries = Array.from(methodMap.entries()).sort((a, b) => b[1].total - a[1].total);

  const rows = entries.map(([method, data]) => [
    method === 'none' ? 'Sin especificar' : (PAYMENT_METHOD_LABELS[method] ?? method),
    data.total,
    data.income,
    data.expense,
    data.count,
    grandTotal > 0 ? Math.round((data.total / grandTotal) * 100) : 0,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  applyColumnWidths(ws, [26, 18, 18, 18, 14, 12]);

  // Formato de moneda (cols 1-3)
  for (let col = 1; col <= 3; col++) {
    applyNumberFormat(ws, col, 1, rows.length, '#,##0.00');
  }

  // Formato porcentaje
  applyNumberFormat(ws, 5, 1, rows.length, '0"%"');

  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: 0 } }) };

  return ws;
}

// ── Hoja 5: Desglose por persona ────────────────────────────────────────────

function buildByPersonSheet(transactions: ExportTransaction[]): XLSX.WorkSheet {
  const personMap = new Map<string, { income: number; expense: number; transfer: number; count: number }>();

  for (const t of transactions) {
    const name = t.created_by_name ?? 'Sin asignar';
    let entry = personMap.get(name);
    if (!entry) {
      entry = { income: 0, expense: 0, transfer: 0, count: 0 };
      personMap.set(name, entry);
    }
    if (t.type === 'income') entry.income += t.amount;
    else if (t.type === 'expense') entry.expense += t.amount;
    else if (t.type === 'transfer') entry.transfer += t.amount;
    entry.count++;
  }

  const headers = ['Persona', 'Ingresos', 'Egresos', 'Balance', 'Transferencias', 'Movimientos'];

  const entries = Array.from(personMap.entries()).sort((a, b) => b[1].count - a[1].count);

  const rows = entries.map(([name, data]) => [
    name,
    data.income,
    data.expense,
    data.income - data.expense,
    data.transfer,
    data.count,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  applyColumnWidths(ws, [24, 18, 18, 18, 18, 14]);

  for (let col = 1; col <= 4; col++) {
    applyNumberFormat(ws, col, 1, rows.length, '#,##0.00');
  }

  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: 0 } }) };

  return ws;
}

// ── Exportar transacciones a Excel ──────────────────────────────────────────

export async function exportTransactionsToExcel(
  transactions: ExportTransaction[],
  filters?: ExportFilters,
): Promise<void> {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen ejecutivo
  const wsResumen = buildSummarySheet(transactions, filters);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

  // Hoja 2: Detalle de movimientos
  const wsMovimientos = buildTransactionsSheet(transactions);
  XLSX.utils.book_append_sheet(wb, wsMovimientos, 'Movimientos');

  // Hoja 3: Desglose por rubro
  const wsCategorias = buildCategorySheet(transactions);
  XLSX.utils.book_append_sheet(wb, wsCategorias, 'Por Rubro');

  // Hoja 4: Desglose por medio de pago
  const wsMetodos = buildPaymentMethodSheet(transactions);
  XLSX.utils.book_append_sheet(wb, wsMetodos, 'Por Medio de Pago');

  // Hoja 5: Desglose por persona
  const wsPersonas = buildByPersonSheet(transactions);
  XLSX.utils.book_append_sheet(wb, wsPersonas, 'Por Persona');

  await saveAndShareWorkbook(wb, 'Cuentas_Claras_Reporte');
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

  // Formato de moneda
  for (let col = 1; col <= 3; col++) {
    applyNumberFormat(ws, col, 1, rows.length, '#,##0.00');
  }

  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { c: 0, r: 0 }, e: { c: headers.length - 1, r: 0 } }) };

  XLSX.utils.book_append_sheet(wb, ws, 'Balances por Rubro');

  await saveAndShareWorkbook(wb, 'Cuentas_Claras_Balances');
}
