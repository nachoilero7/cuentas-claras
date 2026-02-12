import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

import { lightColorScheme } from '@/src/shared/theme';
import { TRANSACTION_TYPE_LABELS } from '@/src/core/config/constants';
import type { ExportTransaction, ExportFilters } from './exportService';
import type { CategoryReportItem, ReportSummary } from './reportService';

// ── Mapas de etiquetas ──────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = TRANSACTION_TYPE_LABELS;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  bank_transfer: 'Transferencia',
  digital_wallet: 'Billetera virtual',
  check: 'Cheque',
};

// ── Colores ─────────────────────────────────────────────────────────────────

const COLORS = {
  primary: lightColorScheme.primary,
  primaryLight: lightColorScheme.primaryContainer,
  income: lightColorScheme.income,
  incomeBg: lightColorScheme.successSurface,
  expense: lightColorScheme.expense,
  expenseBg: lightColorScheme.errorSurface,
  transfer: lightColorScheme.transfer,
  text: lightColorScheme.text,
  textSecondary: lightColorScheme.textSecondary,
  border: lightColorScheme.outline,
  background: lightColorScheme.background,
  white: lightColorScheme.surface,
};

// ── Utilidades ──────────────────────────────────────────────────────────────

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

function formatDateLong(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number, currency: string = 'ARS'): string {
  const symbol = currency === 'USD' ? 'US$' : '$';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  const fixed = abs.toFixed(2);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const result = `${symbol} ${formattedInt},${decPart}`;
  return isNegative ? `-${result}` : result;
}

function formatNow(): string {
  return new Date().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Generar barra visual SVG ────────────────────────────────────────────────

function progressBar(percentage: number, color: string, width: number = 200): string {
  const clampedPct = Math.max(0, Math.min(100, percentage));
  const fillWidth = (clampedPct / 100) * width;
  return `
    <svg width="${width}" height="12" style="vertical-align: middle;">
      <rect x="0" y="2" width="${width}" height="8" rx="4" fill="${COLORS.border}" />
      <rect x="0" y="2" width="${fillWidth}" height="8" rx="4" fill="${color}" />
    </svg>
  `;
}

// ── Grafico de barras SVG para categorias ───────────────────────────────────

function categoryChart(categories: CategoryReportItem[]): string {
  if (categories.length === 0) return '';

  const maxAmount = Math.max(
    ...categories.map((c) => Math.max(c.totalIncome, c.totalExpenses)),
    1,
  );

  const barHeight = 28;
  const gap = 8;
  const labelWidth = 130;
  const amountWidth = 100;
  const chartWidth = 300;
  const totalWidth = labelWidth + chartWidth + amountWidth + 20;
  const totalHeight = categories.length * (barHeight * 2 + gap * 2 + 20) + 40;

  let bars = '';
  let y = 30;

  for (const cat of categories) {
    const incWidth = (cat.totalIncome / maxAmount) * chartWidth;
    const expWidth = (cat.totalExpenses / maxAmount) * chartWidth;
    const catColor = cat.categoryColor ?? COLORS.textSecondary;

    // Category name
    bars += `<text x="0" y="${y + 8}" font-size="11" font-weight="600" fill="${COLORS.text}">${escapeHtml(cat.categoryName)}</text>`;
    y += 18;

    // Income bar
    bars += `<rect x="${labelWidth}" y="${y - 10}" width="${chartWidth}" height="${barHeight / 2}" rx="3" fill="${COLORS.border}" opacity="0.4" />`;
    bars += `<rect x="${labelWidth}" y="${y - 10}" width="${Math.max(incWidth, 0)}" height="${barHeight / 2}" rx="3" fill="${COLORS.income}" />`;
    bars += `<text x="${labelWidth - 8}" y="${y}" font-size="9" fill="${COLORS.income}" text-anchor="end">Ing.</text>`;
    bars += `<text x="${labelWidth + chartWidth + 8}" y="${y}" font-size="9" fill="${COLORS.textSecondary}">${formatCurrency(cat.totalIncome)}</text>`;
    y += barHeight / 2 + 4;

    // Expense bar
    bars += `<rect x="${labelWidth}" y="${y - 10}" width="${chartWidth}" height="${barHeight / 2}" rx="3" fill="${COLORS.border}" opacity="0.4" />`;
    bars += `<rect x="${labelWidth}" y="${y - 10}" width="${Math.max(expWidth, 0)}" height="${barHeight / 2}" rx="3" fill="${COLORS.expense}" />`;
    bars += `<text x="${labelWidth - 8}" y="${y}" font-size="9" fill="${COLORS.expense}" text-anchor="end">Egr.</text>`;
    bars += `<text x="${labelWidth + chartWidth + 8}" y="${y}" font-size="9" fill="${COLORS.textSecondary}">${formatCurrency(cat.totalExpenses)}</text>`;
    y += barHeight / 2 + gap + 10;
  }

  return `
    <svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" style="width: 100%; max-width: ${totalWidth}px;">
      <!-- Legend -->
      <rect x="${labelWidth}" y="5" width="10" height="10" rx="2" fill="${COLORS.income}" />
      <text x="${labelWidth + 14}" y="14" font-size="9" fill="${COLORS.textSecondary}">Ingresos</text>
      <rect x="${labelWidth + 80}" y="5" width="10" height="10" rx="2" fill="${COLORS.expense}" />
      <text x="${labelWidth + 94}" y="14" font-size="9" fill="${COLORS.textSecondary}">Egresos</text>
      ${bars}
    </svg>
  `;
}

// ── Grafico circular SVG (donut) para distribucion de egresos ───────────────

function expenseDonut(categories: CategoryReportItem[]): string {
  const expenseCategories = categories
    .filter((c) => c.totalExpenses > 0)
    .sort((a, b) => b.totalExpenses - a.totalExpenses);

  if (expenseCategories.length === 0) return '';

  const total = expenseCategories.reduce((s, c) => s + c.totalExpenses, 0);
  const cx = 80;
  const cy = 80;
  const r = 60;
  const innerR = 35;
  const defaultColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

  let startAngle = -90;
  let paths = '';
  let legend = '';
  let legendY = 20;

  expenseCategories.forEach((cat, i) => {
    const pct = (cat.totalExpenses / total) * 100;
    const angle = (pct / 100) * 360;
    const endAngle = startAngle + angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const ix1 = cx + innerR * Math.cos(endRad);
    const iy1 = cy + innerR * Math.sin(endRad);
    const ix2 = cx + innerR * Math.cos(startRad);
    const iy2 = cy + innerR * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;
    const color = cat.categoryColor ?? defaultColors[i % defaultColors.length];

    paths += `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z" fill="${color}" />`;

    // Legend item
    legend += `
      <rect x="180" y="${legendY}" width="10" height="10" rx="2" fill="${color}" />
      <text x="196" y="${legendY + 9}" font-size="10" fill="${COLORS.text}">${escapeHtml(cat.categoryName)}</text>
      <text x="360" y="${legendY + 9}" font-size="10" fill="${COLORS.textSecondary}" text-anchor="end">${formatCurrency(cat.totalExpenses)}</text>
      <text x="410" y="${legendY + 9}" font-size="10" fill="${COLORS.textSecondary}" text-anchor="end">${pct.toFixed(1)}%</text>
    `;
    legendY += 22;

    startAngle = endAngle;
  });

  const height = Math.max(160, legendY + 10);

  return `
    <svg width="420" height="${height}" viewBox="0 0 420 ${height}" style="width: 100%; max-width: 420px;">
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="${innerR - 2}" fill="${COLORS.white}" />
      <text x="${cx}" y="${cy + 4}" font-size="11" font-weight="700" fill="${COLORS.text}" text-anchor="middle">${formatCurrency(total)}</text>
      ${legend}
    </svg>
  `;
}

// ── Escape HTML ─────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Datos para el PDF ───────────────────────────────────────────────────────

export interface PdfReportData {
  summary: ReportSummary;
  categoryReport: CategoryReportItem[];
  transactions: ExportTransaction[];
  filters?: ExportFilters;
}

// ── Generar HTML del reporte ────────────────────────────────────────────────

function buildReportHtml(data: PdfReportData): string {
  const { summary, categoryReport, transactions, filters } = data;

  const periodStart = filters?.startDate ? formatDateLong(filters.startDate) : 'Inicio';
  const periodEnd = filters?.endDate ? formatDateLong(filters.endDate) : 'Hoy';

  // Calcular max para barras de progreso de categorias
  const maxCatAmount = Math.max(
    ...categoryReport.map((c) => Math.max(c.totalIncome, c.totalExpenses)),
    1,
  );

  // Filas de la tabla de transacciones
  const transactionRows = transactions.map((t, i) => {
    const typeColor = t.type === 'income' ? COLORS.income : t.type === 'expense' ? COLORS.expense : COLORS.transfer;
    const typeLabel = TYPE_LABELS[t.type] ?? t.type;
    const statusLabel = STATUS_LABELS[t.status] ?? t.status;
    const bgColor = i % 2 === 0 ? COLORS.white : COLORS.background;
    const paymentLabel = t.payment_method ? PAYMENT_METHOD_LABELS[t.payment_method] ?? '' : '';

    return `
      <tr style="background: ${bgColor};">
        <td style="padding: 8px 10px; font-size: 11px; color: ${COLORS.text};">${formatDate(t.transaction_date)}</td>
        <td style="padding: 8px 10px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; color: ${typeColor}; background: ${typeColor}15;">
            ${typeLabel}
          </span>
        </td>
        <td style="padding: 8px 10px; font-size: 11px; color: ${COLORS.text}; max-width: 180px;">${escapeHtml(t.description)}</td>
        <td style="padding: 8px 10px; font-size: 11px; color: ${COLORS.textSecondary};">${escapeHtml(t.category_name)}</td>
        <td style="padding: 8px 10px; font-size: 11px; color: ${COLORS.textSecondary};">${paymentLabel}</td>
        <td style="padding: 8px 10px; font-size: 11px; font-weight: 600; color: ${typeColor}; text-align: right;">
          ${t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}${formatCurrency(t.amount, t.currency)}
        </td>
        <td style="padding: 8px 10px; font-size: 10px; color: ${COLORS.textSecondary};">${statusLabel}</td>
      </tr>
    `;
  }).join('');

  // Balance color
  const balColor = summary.netBalance >= 0 ? COLORS.income : COLORS.expense;
  const balSign = summary.netBalance >= 0 ? '+' : '';

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page {
      margin: 40px 30px;
      size: A4;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: ${COLORS.text};
      background: ${COLORS.white};
      line-height: 1.5;
    }

    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 20px;
      border-bottom: 3px solid ${COLORS.primary};
      margin-bottom: 24px;
    }
    .header-left h1 {
      font-size: 22px;
      font-weight: 800;
      color: ${COLORS.primary};
      letter-spacing: -0.5px;
    }
    .header-left p {
      font-size: 12px;
      color: ${COLORS.textSecondary};
      margin-top: 2px;
    }
    .header-right {
      text-align: right;
      font-size: 11px;
      color: ${COLORS.textSecondary};
    }
    .header-right .period {
      font-size: 13px;
      font-weight: 600;
      color: ${COLORS.text};
    }

    /* Section */
    .section {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: ${COLORS.primary};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid ${COLORS.border};
    }

    /* Summary cards */
    .summary-row {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
    }
    .summary-card {
      flex: 1;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
    }
    .summary-card .label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .summary-card .amount {
      font-size: 20px;
      font-weight: 800;
    }
    .summary-card .count {
      font-size: 10px;
      margin-top: 4px;
      opacity: 0.7;
    }
    .card-income {
      background: ${COLORS.incomeBg};
      border: 1px solid ${COLORS.income}30;
    }
    .card-income .label, .card-income .count { color: ${COLORS.income}; }
    .card-income .amount { color: ${COLORS.income}; }
    .card-expense {
      background: ${COLORS.expenseBg};
      border: 1px solid ${COLORS.expense}30;
    }
    .card-expense .label, .card-expense .count { color: ${COLORS.expense}; }
    .card-expense .amount { color: ${COLORS.expense}; }
    .card-balance {
      background: ${COLORS.primaryLight};
      border: 1px solid ${COLORS.primary}30;
    }
    .card-balance .label, .card-balance .count { color: ${COLORS.primary}; }
    .card-balance .amount { color: ${balColor}; }

    /* Category table */
    .cat-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    .cat-table th {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${COLORS.textSecondary};
      padding: 8px 10px;
      text-align: left;
      border-bottom: 2px solid ${COLORS.border};
    }
    .cat-table td {
      padding: 10px;
      font-size: 11px;
      border-bottom: 1px solid ${COLORS.border};
    }
    .cat-name {
      font-weight: 600;
      color: ${COLORS.text};
    }
    .cat-balance-positive { color: ${COLORS.income}; font-weight: 700; }
    .cat-balance-negative { color: ${COLORS.expense}; font-weight: 700; }

    /* Charts container */
    .charts-row {
      display: flex;
      gap: 20px;
      margin-top: 12px;
    }
    .chart-box {
      flex: 1;
      text-align: center;
    }
    .chart-box h4 {
      font-size: 11px;
      font-weight: 600;
      color: ${COLORS.textSecondary};
      margin-bottom: 8px;
    }

    /* Transactions table */
    .tx-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    .tx-table th {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${COLORS.textSecondary};
      padding: 8px 10px;
      text-align: left;
      border-bottom: 2px solid ${COLORS.primary};
      background: ${COLORS.primaryLight};
    }
    .tx-table th:nth-child(6) { text-align: right; }

    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 14px;
      border-top: 1px solid ${COLORS.border};
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: ${COLORS.textSecondary};
    }

    /* Filters badge */
    .filters-row {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }
    .filter-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      background: ${COLORS.primaryLight};
      color: ${COLORS.primary};
      font-size: 10px;
      font-weight: 600;
    }

    /* Page break */
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- ═══════════════ HEADER ═══════════════ -->
  <div class="header">
    <div class="header-left">
      <h1>Cuentas Claras</h1>
      <p>Club Independiente - Basquet de Menores</p>
      <p>Reporte Financiero</p>
    </div>
    <div class="header-right">
      <div class="period">${periodStart} - ${periodEnd}</div>
      <div style="margin-top: 4px;">Generado: ${formatNow()}</div>
      ${filters?.type ? `<div>Filtro: ${TYPE_LABELS[filters.type] ?? filters.type}</div>` : ''}
      ${filters?.categoryName ? `<div>Rubro: ${filters.categoryName}</div>` : ''}
    </div>
  </div>

  <!-- ═══════════════ RESUMEN ═══════════════ -->
  <div class="section">
    <div class="section-title">Resumen General</div>
    <div class="summary-row">
      <div class="summary-card card-income">
        <div class="label">Ingresos</div>
        <div class="amount">+${formatCurrency(summary.totalIncome, summary.currency)}</div>
      </div>
      <div class="summary-card card-expense">
        <div class="label">Egresos</div>
        <div class="amount">-${formatCurrency(summary.totalExpenses, summary.currency)}</div>
      </div>
      <div class="summary-card card-balance">
        <div class="label">Balance Neto</div>
        <div class="amount">${balSign}${formatCurrency(summary.netBalance, summary.currency)}</div>
        <div class="count">${summary.transactionCount} movimiento${summary.transactionCount !== 1 ? 's' : ''}</div>
      </div>
    </div>
  </div>

  <!-- ═══════════════ GRAFICOS ═══════════════ -->
  ${categoryReport.length > 0 ? `
  <div class="section">
    <div class="section-title">Distribucion por Rubro</div>
    <div class="charts-row">
      <div class="chart-box">
        <h4>Ingresos vs Egresos por rubro</h4>
        ${categoryChart(categoryReport)}
      </div>
      <div class="chart-box">
        <h4>Distribucion de egresos</h4>
        ${expenseDonut(categoryReport)}
      </div>
    </div>
  </div>

  <!-- ═══════════════ DESGLOSE POR RUBRO ═══════════════ -->
  <div class="section">
    <div class="section-title">Desglose por Rubro</div>
    <table class="cat-table">
      <thead>
        <tr>
          <th>Rubro</th>
          <th>Ingresos</th>
          <th style="width: 120px;">Barra</th>
          <th>Egresos</th>
          <th style="width: 120px;">Barra</th>
          <th>Balance</th>
          <th>Mov.</th>
        </tr>
      </thead>
      <tbody>
        ${categoryReport.map((cat) => {
          const incPct = (cat.totalIncome / maxCatAmount) * 100;
          const expPct = (cat.totalExpenses / maxCatAmount) * 100;
          const balClass = cat.netBalance >= 0 ? 'cat-balance-positive' : 'cat-balance-negative';
          return `
            <tr>
              <td class="cat-name">${escapeHtml(cat.categoryName)}</td>
              <td style="color: ${COLORS.income}; font-weight: 600;">${formatCurrency(cat.totalIncome)}</td>
              <td>${progressBar(incPct, COLORS.income, 100)}</td>
              <td style="color: ${COLORS.expense}; font-weight: 600;">${formatCurrency(cat.totalExpenses)}</td>
              <td>${progressBar(expPct, COLORS.expense, 100)}</td>
              <td class="${balClass}">${formatCurrency(cat.netBalance)}</td>
              <td style="text-align: center; color: ${COLORS.textSecondary};">${cat.transactionCount}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- ═══════════════ DETALLE DE MOVIMIENTOS ═══════════════ -->
  ${transactions.length > 0 ? `
  <div class="page-break"></div>
  <div class="section">
    <div class="section-title">Detalle de Movimientos (${transactions.length})</div>
    <table class="tx-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Tipo</th>
          <th>Descripcion</th>
          <th>Rubro</th>
          <th>Medio</th>
          <th style="text-align: right;">Monto</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${transactionRows}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- ═══════════════ FOOTER ═══════════════ -->
  <div class="footer">
    <div>Cuentas Claras - Club Independiente - Basquet de Menores</div>
    <div>Generado el ${formatNow()}</div>
  </div>

</body>
</html>
  `;
}

// ── Exportar reporte a PDF ──────────────────────────────────────────────────

export async function exportReportToPdf(data: PdfReportData): Promise<void> {
  const html = buildReportHtml(data);

  // Generar el PDF
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  // Mover a un nombre mas descriptivo en cache
  const fileName = `Cuentas_Claras_Reporte_${Date.now()}.pdf`;
  const destPath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.moveAsync({ from: uri, to: destPath });

  // Abrir el share sheet nativo (WhatsApp, Mail, etc.)
  await Sharing.shareAsync(destPath, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compartir reporte financiero',
  });

  // Limpiar archivo temporal despues de compartir
  FileSystem.deleteAsync(destPath, { idempotent: true }).catch(() => {});
}
