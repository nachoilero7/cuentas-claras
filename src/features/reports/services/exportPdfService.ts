import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

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
  bank_transfer: 'Transferencia bancaria',
  digital_wallet: 'Billetera virtual',
  check: 'Cheque',
};

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

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

// ── Utilidades de formato ───────────────────────────────────────────────────

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

function formatCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}K`;
  if (abs === 0) return '$0';
  return `${sign}$${Math.round(abs)}`;
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Estadisticas extendidas ─────────────────────────────────────────────────

interface ExtendedStats {
  biggestIncome: { description: string; amount: number; category: string } | null;
  biggestExpense: { description: string; amount: number; category: string } | null;
  activeDays: number;
  dailyAverage: number;
  periodDays: number;
}

function computeExtendedStats(
  transactions: ExportTransaction[],
  startDate?: string,
  endDate?: string,
): ExtendedStats {
  let biggestIncome: ExtendedStats['biggestIncome'] = null;
  let biggestExpense: ExtendedStats['biggestExpense'] = null;
  const uniqueDates = new Set<string>();

  for (const t of transactions) {
    uniqueDates.add(t.transaction_date);
    if (t.type === 'income' && (!biggestIncome || t.amount > biggestIncome.amount)) {
      biggestIncome = { description: t.description, amount: t.amount, category: t.category_name };
    }
    if (t.type === 'expense' && (!biggestExpense || t.amount > biggestExpense.amount)) {
      biggestExpense = { description: t.description, amount: t.amount, category: t.category_name };
    }
  }

  let periodDays = 30;
  if (startDate && endDate) {
    const start = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');
    periodDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  }

  const totalFlow = transactions.reduce((sum, t) => {
    if (t.type === 'income') return sum + t.amount;
    if (t.type === 'expense') return sum - t.amount;
    return sum;
  }, 0);

  return {
    biggestIncome,
    biggestExpense,
    activeDays: uniqueDates.size,
    dailyAverage: periodDays > 0 ? totalFlow / periodDays : 0,
    periodDays,
  };
}

// ── Grafico: Tendencia mensual (barras agrupadas) ───────────────────────────

interface MonthlyBucket {
  key: string;
  label: string;
  income: number;
  expenses: number;
}

function monthlyTrendChart(transactions: ExportTransaction[]): string {
  if (transactions.length === 0) return '';

  const buckets = new Map<string, MonthlyBucket>();
  for (const t of transactions) {
    const key = t.transaction_date.slice(0, 7);
    let bucket = buckets.get(key);
    if (!bucket) {
      const [y, m] = key.split('-');
      bucket = { key, label: `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y.slice(2)}`, income: 0, expenses: 0 };
      buckets.set(key, bucket);
    }
    if (t.type === 'income') bucket.income += t.amount;
    else if (t.type === 'expense') bucket.expenses += t.amount;
  }

  const months = Array.from(buckets.values()).sort((a, b) => a.key.localeCompare(b.key));
  if (months.length === 0) return '';

  const maxVal = Math.max(...months.flatMap((m) => [m.income, m.expenses]), 1);

  const barW = months.length <= 3 ? 36 : months.length <= 6 ? 28 : 20;
  const gap = Math.max(barW * 0.2, 4);
  const groupW = barW * 2 + gap;
  const padding = { top: 30, right: 30, bottom: 56, left: 72 };
  const chartW = months.length * (groupW + 20);
  const chartH = 160;
  const totalW = padding.left + chartW + padding.right;
  const totalH = padding.top + chartH + padding.bottom;

  let svg = '';

  svg += `<rect x="${padding.left}" y="8" width="10" height="10" rx="2" fill="${COLORS.income}" />`;
  svg += `<text x="${padding.left + 14}" y="17" font-size="9" fill="${COLORS.textSecondary}">Ingresos</text>`;
  svg += `<rect x="${padding.left + 80}" y="8" width="10" height="10" rx="2" fill="${COLORS.expense}" />`;
  svg += `<text x="${padding.left + 94}" y="17" font-size="9" fill="${COLORS.textSecondary}">Egresos</text>`;

  for (let i = 0; i <= 4; i++) {
    const val = maxVal * (1 - i / 4);
    const y = padding.top + (i / 4) * chartH;
    svg += `<line x1="${padding.left}" y1="${y}" x2="${padding.left + chartW}" y2="${y}" stroke="${COLORS.border}" stroke-opacity="0.4" />`;
    svg += `<text x="${padding.left - 6}" y="${y + 3}" font-size="8" fill="${COLORS.textSecondary}" text-anchor="end">${formatCompact(val)}</text>`;
  }

  months.forEach((m, i) => {
    const groupX = padding.left + i * (groupW + 20) + 8;
    const incH = (m.income / maxVal) * chartH;
    const expH = (m.expenses / maxVal) * chartH;

    svg += `<rect x="${groupX}" y="${padding.top + chartH - incH}" width="${barW}" height="${Math.max(incH, 1)}" rx="3" fill="${COLORS.income}" />`;
    svg += `<rect x="${groupX + barW + gap}" y="${padding.top + chartH - expH}" width="${barW}" height="${Math.max(expH, 1)}" rx="3" fill="${COLORS.expense}" />`;

    const labelX = groupX + groupW / 2;
    svg += `<text x="${labelX}" y="${padding.top + chartH + 16}" font-size="9" fill="${COLORS.text}" text-anchor="middle" font-weight="600">${m.label}</text>`;

    const net = m.income - m.expenses;
    const netColor = net >= 0 ? COLORS.income : COLORS.expense;
    svg += `<text x="${labelX}" y="${padding.top + chartH + 30}" font-size="8" fill="${netColor}" text-anchor="middle">${net >= 0 ? '+' : ''}${formatCompact(net)}</text>`;
  });

  return `
    <svg width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" style="width: 100%; overflow: visible;">
      ${svg}
    </svg>
  `;
}

// ── Grafico: Distribucion por medio de pago ──────────────────────────────────

function paymentMethodChart(transactions: ExportTransaction[]): string {
  if (transactions.length === 0) return '';

  const buckets = new Map<string, number>();
  for (const t of transactions) {
    const method = t.payment_method ?? 'none';
    buckets.set(method, (buckets.get(method) ?? 0) + t.amount);
  }

  const items = Array.from(buckets.entries())
    .map(([method, amount]) => ({
      method,
      label: method === 'none' ? 'Sin especificar' : (PAYMENT_METHOD_LABELS[method] ?? method),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (items.length === 0) return '';

  const maxAmount = Math.max(...items.map((i) => i.amount), 1);
  const total = items.reduce((s, i) => s + i.amount, 0);

  const barHeight = 22;
  const rowGap = 10;
  const labelWidth = 140;
  const chartWidth = 250;
  const amountWidth = 120;
  const totalWidth = labelWidth + chartWidth + amountWidth;
  const totalHeight = items.length * (barHeight + rowGap) + 10;

  const methodColors: Record<string, string> = {
    cash: '#22c55e',
    bank_transfer: '#3b82f6',
    digital_wallet: '#8b5cf6',
    check: '#f97316',
    none: '#6b7280',
  };

  let svg = '';
  let y = 5;

  for (const item of items) {
    const barW = (item.amount / maxAmount) * chartWidth;
    const pct = total > 0 ? ((item.amount / total) * 100).toFixed(1) : '0';
    const color = methodColors[item.method] ?? COLORS.textSecondary;

    svg += `<text x="0" y="${y + 14}" font-size="10" fill="${COLORS.text}" font-weight="500">${escapeHtml(item.label)}</text>`;
    svg += `<rect x="${labelWidth}" y="${y + 2}" width="${chartWidth}" height="${barHeight}" rx="4" fill="${COLORS.border}" opacity="0.25" />`;
    svg += `<rect x="${labelWidth}" y="${y + 2}" width="${Math.max(barW, 2)}" height="${barHeight}" rx="4" fill="${color}" />`;
    svg += `<text x="${labelWidth + chartWidth + 8}" y="${y + 14}" font-size="10" fill="${COLORS.text}" font-weight="600">${formatCurrency(item.amount)}</text>`;
    svg += `<text x="${labelWidth + chartWidth + 8}" y="${y + 26}" font-size="8" fill="${COLORS.textSecondary}">${pct}%</text>`;

    y += barHeight + rowGap;
  }

  return `
    <svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" style="width: 100%; max-width: ${totalWidth}px;">
      ${svg}
    </svg>
  `;
}

// ── Grafico: Donut generico (ingresos o egresos) ────────────────────────────

function buildDonut(
  categories: CategoryReportItem[],
  field: 'totalIncome' | 'totalExpenses',
  title: string,
  defaultColors: string[],
): string {
  const filtered = categories
    .filter((c) => c[field] > 0)
    .sort((a, b) => b[field] - a[field]);

  if (filtered.length === 0) return '';

  const total = filtered.reduce((s, c) => s + c[field], 0);
  const cx = 80;
  const cy = 80;
  const r = 60;
  const innerR = 35;

  let startAngle = -90;
  let paths = '';
  let legend = '';
  let legendY = 20;

  filtered.forEach((cat, i) => {
    const pct = (cat[field] / total) * 100;
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

    legend += `
      <rect x="180" y="${legendY}" width="10" height="10" rx="2" fill="${color}" />
      <text x="196" y="${legendY + 9}" font-size="10" fill="${COLORS.text}">${escapeHtml(cat.categoryName)}</text>
      <text x="360" y="${legendY + 9}" font-size="10" fill="${COLORS.textSecondary}" text-anchor="end">${formatCurrency(cat[field])}</text>
      <text x="410" y="${legendY + 9}" font-size="10" fill="${COLORS.textSecondary}" text-anchor="end">${pct.toFixed(1)}%</text>
    `;
    legendY += 22;

    startAngle = endAngle;
  });

  const height = Math.max(160, legendY + 10);

  return `
    <div style="margin-bottom: 16px;">
      <h4 style="font-size: 11px; font-weight: 600; color: ${COLORS.textSecondary}; margin-bottom: 8px;">${title}</h4>
      <svg width="420" height="${height}" viewBox="0 0 420 ${height}" style="width: 100%; max-width: 420px;">
        ${paths}
        <circle cx="${cx}" cy="${cy}" r="${innerR - 2}" fill="${COLORS.white}" />
        <text x="${cx}" y="${cy - 2}" font-size="9" fill="${COLORS.textSecondary}" text-anchor="middle">Total</text>
        <text x="${cx}" y="${cy + 12}" font-size="11" font-weight="700" fill="${COLORS.text}" text-anchor="middle">${formatCurrency(total)}</text>
        ${legend}
      </svg>
    </div>
  `;
}

// ── Grafico: Barras comparativas por categoria ──────────────────────────────

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

    bars += `<text x="0" y="${y + 8}" font-size="11" font-weight="600" fill="${COLORS.text}">${escapeHtml(cat.categoryName)}</text>`;
    y += 18;

    bars += `<rect x="${labelWidth}" y="${y - 10}" width="${chartWidth}" height="${barHeight / 2}" rx="3" fill="${COLORS.border}" opacity="0.4" />`;
    bars += `<rect x="${labelWidth}" y="${y - 10}" width="${Math.max(incWidth, 0)}" height="${barHeight / 2}" rx="3" fill="${COLORS.income}" />`;
    bars += `<text x="${labelWidth - 8}" y="${y}" font-size="9" fill="${COLORS.income}" text-anchor="end">Ing.</text>`;
    bars += `<text x="${labelWidth + chartWidth + 8}" y="${y}" font-size="9" fill="${COLORS.textSecondary}">${formatCurrency(cat.totalIncome)}</text>`;
    y += barHeight / 2 + 4;

    bars += `<rect x="${labelWidth}" y="${y - 10}" width="${chartWidth}" height="${barHeight / 2}" rx="3" fill="${COLORS.border}" opacity="0.4" />`;
    bars += `<rect x="${labelWidth}" y="${y - 10}" width="${Math.max(expWidth, 0)}" height="${barHeight / 2}" rx="3" fill="${COLORS.expense}" />`;
    bars += `<text x="${labelWidth - 8}" y="${y}" font-size="9" fill="${COLORS.expense}" text-anchor="end">Egr.</text>`;
    bars += `<text x="${labelWidth + chartWidth + 8}" y="${y}" font-size="9" fill="${COLORS.textSecondary}">${formatCurrency(cat.totalExpenses)}</text>`;
    y += barHeight / 2 + gap + 10;
  }

  return `
    <svg width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" style="width: 100%; max-width: ${totalWidth}px;">
      <rect x="${labelWidth}" y="5" width="10" height="10" rx="2" fill="${COLORS.income}" />
      <text x="${labelWidth + 14}" y="14" font-size="9" fill="${COLORS.textSecondary}">Ingresos</text>
      <rect x="${labelWidth + 80}" y="5" width="10" height="10" rx="2" fill="${COLORS.expense}" />
      <text x="${labelWidth + 94}" y="14" font-size="9" fill="${COLORS.textSecondary}">Egresos</text>
      ${bars}
    </svg>
  `;
}

// ── Barra de progreso SVG ───────────────────────────────────────────────────

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

// ── Top movimientos (tabla) ─────────────────────────────────────────────────

function topTransactionsSection(transactions: ExportTransaction[]): string {
  const incomes = transactions
    .filter((t) => t.type === 'income')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const expenses = transactions
    .filter((t) => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  if (incomes.length === 0 && expenses.length === 0) return '';

  const thStyle = `font-size: 9px; font-weight: 700; text-transform: uppercase; color: ${COLORS.textSecondary}; padding: 8px 10px; text-align: left; border-bottom: 1px solid ${COLORS.border};`;

  function buildMiniTable(items: ExportTransaction[], typeColor: string, sign: string): string {
    if (items.length === 0) return `<p style="font-size: 11px; color: ${COLORS.textSecondary}; text-align: center;">Sin datos</p>`;
    return `
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="${thStyle}">Fecha</th>
            <th style="${thStyle}">Descripcion</th>
            <th style="${thStyle}">Rubro</th>
            <th style="${thStyle}">Registrado por</th>
            <th style="${thStyle} text-align: right;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((t, i) => `
            <tr style="background: ${i % 2 === 0 ? COLORS.white : COLORS.background};">
              <td style="padding: 7px 10px; font-size: 10px; color: ${COLORS.text};">${formatDate(t.transaction_date)}</td>
              <td style="padding: 7px 10px; font-size: 10px; color: ${COLORS.text};">${escapeHtml(t.description)}</td>
              <td style="padding: 7px 10px; font-size: 10px; color: ${COLORS.textSecondary};">${escapeHtml(t.category_name)}</td>
              <td style="padding: 7px 10px; font-size: 10px; color: ${COLORS.textSecondary};">${escapeHtml(t.created_by_name ?? '')}</td>
              <td style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: ${typeColor}; text-align: right;">${sign}${formatCurrency(t.amount, t.currency)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  return `
    <div>
      <div style="margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: 700; color: ${COLORS.income}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Mayores Ingresos
        </div>
        ${buildMiniTable(incomes, COLORS.income, '+')}
      </div>
      <div>
        <div style="font-size: 11px; font-weight: 700; color: ${COLORS.expense}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          Mayores Egresos
        </div>
        ${buildMiniTable(expenses, COLORS.expense, '-')}
      </div>
    </div>
  `;
}

// ── Tabla de detalle con subtotales ─────────────────────────────────────────

function transactionDetailTable(transactions: ExportTransaction[]): string {
  if (transactions.length === 0) return '';

  const grouped = new Map<string, ExportTransaction[]>();
  for (const t of transactions) {
    const cat = t.category_name;
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(t);
  }

  const groups = Array.from(grouped.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  let rows = '';
  let rowIndex = 0;
  let grandTotalIncome = 0;
  let grandTotalExpense = 0;

  for (const [catName, txs] of groups) {
    rows += `
      <tr>
        <td colspan="7" style="padding: 10px 10px 6px; font-size: 11px; font-weight: 700; color: ${COLORS.primary}; border-bottom: 2px solid ${COLORS.primary}20; background: ${COLORS.primaryLight};">
          ${escapeHtml(catName)} (${txs.length} mov.)
        </td>
      </tr>
    `;

    let subtotalIncome = 0;
    let subtotalExpense = 0;

    for (const t of txs) {
      const typeColor = t.type === 'income' ? COLORS.income : t.type === 'expense' ? COLORS.expense : COLORS.transfer;
      const typeLabel = TYPE_LABELS[t.type] ?? t.type;
      const statusLabel = STATUS_LABELS[t.status] ?? t.status;
      const bgColor = rowIndex % 2 === 0 ? COLORS.white : COLORS.background;
      const paymentLabel = t.payment_method ? PAYMENT_METHOD_LABELS[t.payment_method] ?? '' : '';
      const aliasLabel = t.destination_alias ? ` → ${escapeHtml(t.destination_alias)}` : '';

      if (t.type === 'income') subtotalIncome += t.amount;
      else if (t.type === 'expense') subtotalExpense += t.amount;

      rows += `
        <tr style="background: ${bgColor};">
          <td style="padding: 7px 10px; font-size: 10px; color: ${COLORS.text};">${formatDate(t.transaction_date)}</td>
          <td style="padding: 7px 10px;">
            <span style="display: inline-block; padding: 1px 7px; border-radius: 10px; font-size: 9px; font-weight: 600; color: ${typeColor}; background: ${typeColor}15;">
              ${typeLabel}
            </span>
          </td>
          <td style="padding: 7px 10px; font-size: 10px; color: ${COLORS.text};">${escapeHtml(t.description)}</td>
          <td style="padding: 7px 10px; font-size: 10px; color: ${COLORS.textSecondary};">${paymentLabel}${aliasLabel}</td>
          <td style="padding: 7px 10px; font-size: 10px; color: ${COLORS.textSecondary};">${escapeHtml(t.created_by_name ?? '')}</td>
          <td style="padding: 7px 10px; font-size: 10px; font-weight: 600; color: ${typeColor}; text-align: right;">
            ${t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}${formatCurrency(t.amount, t.currency)}
          </td>
          <td style="padding: 7px 10px; font-size: 9px; color: ${COLORS.textSecondary};">${statusLabel}</td>
        </tr>
      `;
      rowIndex++;
    }

    grandTotalIncome += subtotalIncome;
    grandTotalExpense += subtotalExpense;

    const subtotalBalance = subtotalIncome - subtotalExpense;
    const subtotalColor = subtotalBalance >= 0 ? COLORS.income : COLORS.expense;
    rows += `
      <tr style="background: ${COLORS.background};">
        <td colspan="5" style="padding: 7px 10px; font-size: 10px; font-weight: 600; color: ${COLORS.textSecondary}; text-align: right; border-top: 1px solid ${COLORS.border};">
          Subtotal ${escapeHtml(catName)}:
        </td>
        <td style="padding: 7px 10px; font-size: 10px; font-weight: 700; color: ${subtotalColor}; text-align: right; border-top: 1px solid ${COLORS.border};">
          ${subtotalBalance >= 0 ? '+' : ''}${formatCurrency(subtotalBalance)}
        </td>
        <td style="border-top: 1px solid ${COLORS.border};"></td>
      </tr>
    `;
  }

  const grandBalance = grandTotalIncome - grandTotalExpense;
  const grandColor = grandBalance >= 0 ? COLORS.income : COLORS.expense;
  rows += `
    <tr style="background: ${COLORS.primaryLight};">
      <td colspan="5" style="padding: 10px; font-size: 11px; font-weight: 700; color: ${COLORS.primary}; text-align: right; border-top: 3px solid ${COLORS.primary};">
        TOTAL GENERAL
      </td>
      <td style="padding: 10px; font-size: 12px; font-weight: 800; color: ${grandColor}; text-align: right; border-top: 3px solid ${COLORS.primary};">
        ${grandBalance >= 0 ? '+' : ''}${formatCurrency(grandBalance)}
      </td>
      <td style="border-top: 3px solid ${COLORS.primary};"></td>
    </tr>
    <tr style="background: ${COLORS.white};">
      <td colspan="4" style="padding: 4px 10px; font-size: 9px; color: ${COLORS.textSecondary};">
        Ingresos: +${formatCurrency(grandTotalIncome)}
      </td>
      <td colspan="3" style="padding: 4px 10px; font-size: 9px; color: ${COLORS.textSecondary}; text-align: right;">
        Egresos: -${formatCurrency(grandTotalExpense)}
      </td>
    </tr>
  `;

  return rows;
}

// ── Datos para el PDF ───────────────────────────────────────────────────────

export interface PdfReportData {
  summary: ReportSummary;
  categoryReport: CategoryReportItem[];
  transactions: ExportTransaction[];
  filters?: ExportFilters;
}

// ── Generar HTML del reporte ────────────────────────────────────────────────

function buildReportHtml(data: PdfReportData, logoBase64: string = ''): string {
  const { summary, categoryReport, transactions, filters } = data;

  const periodStart = filters?.startDate ? formatDateLong(filters.startDate) : 'Inicio';
  const periodEnd = filters?.endDate ? formatDateLong(filters.endDate) : 'Hoy';
  const stats = computeExtendedStats(transactions, filters?.startDate, filters?.endDate);

  const maxCatAmount = Math.max(
    ...categoryReport.map((c) => Math.max(c.totalIncome, c.totalExpenses)),
    1,
  );

  const balColor = summary.netBalance >= 0 ? COLORS.income : COLORS.expense;
  const balSign = summary.netBalance >= 0 ? '+' : '';

  const avgPerTx = summary.transactionCount > 0
    ? (summary.totalIncome + summary.totalExpenses) / summary.transactionCount
    : 0;

  const trendChartHtml = monthlyTrendChart(transactions);
  const paymentChartHtml = paymentMethodChart(transactions);
  const expenseDonutHtml = buildDonut(
    categoryReport,
    'totalExpenses',
    'Distribucion de Egresos',
    ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'],
  );
  const incomeDonutHtml = buildDonut(
    categoryReport,
    'totalIncome',
    'Distribucion de Ingresos',
    ['#22c55e', '#10b981', '#059669', '#3b82f6', '#6366f1', '#8b5cf6', '#f59e0b', '#84cc16'],
  );
  const topTxHtml = topTransactionsSection(transactions);
  const categoryBarChartHtml = categoryChart(categoryReport);

  const logoImg = logoBase64
    ? `<img src="data:image/png;base64,${logoBase64}" width="48" height="48" style="border-radius: 8px; object-fit: contain;" />`
    : '';
  const logoImgSmall = logoBase64
    ? `<img src="data:image/png;base64,${logoBase64}" width="28" height="28" style="border-radius: 4px; object-fit: contain;" />`
    : '';

  const miniHeader = `
    <div class="mini-header">
      ${logoImgSmall}
      <div>
        <span class="mini-header-title">Cuentas Claras</span>
        <span class="mini-header-sep">&mdash;</span>
        <span class="mini-header-period">${periodStart} al ${periodEnd}</span>
      </div>
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page {
      margin: 52px 42px 48px 42px;
      size: A4;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: ${COLORS.text};
      background: ${COLORS.white};
      line-height: 1.5;
      font-size: 11px;
      padding: 0 6px;
    }

    /* ── Header principal ─────────────────────────────────── */
    .header {
      display: flex;
      align-items: center;
      gap: 18px;
      padding-bottom: 18px;
      border-bottom: 3px solid ${COLORS.primary};
      margin-bottom: 24px;
    }
    .header-logo {
      flex-shrink: 0;
    }
    .header-info {
      flex: 1;
    }
    .header-info h1 {
      font-size: 26px;
      font-weight: 800;
      color: ${COLORS.primary};
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .header-info .subtitle {
      font-size: 11px;
      color: ${COLORS.textSecondary};
      margin-top: 2px;
    }
    .header-meta {
      text-align: right;
      flex-shrink: 0;
    }
    .header-meta .period {
      font-size: 13px;
      font-weight: 700;
      color: ${COLORS.text};
      margin-bottom: 4px;
    }
    .header-meta .generated {
      font-size: 10px;
      color: ${COLORS.textSecondary};
    }

    /* ── Mini-header en saltos de pagina ──────────────────── */
    .mini-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 0 12px;
      margin-bottom: 20px;
      border-bottom: 2px solid ${COLORS.primary}40;
    }
    .mini-header-title {
      font-size: 13px;
      font-weight: 700;
      color: ${COLORS.primary};
    }
    .mini-header-sep {
      font-size: 12px;
      color: ${COLORS.border};
      margin: 0 4px;
    }
    .mini-header-period {
      font-size: 11px;
      color: ${COLORS.textSecondary};
    }

    /* ── Secciones ────────────────────────────────────────── */
    .section {
      margin-bottom: 28px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: ${COLORS.primary};
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 14px;
      padding-bottom: 6px;
      border-bottom: 2px solid ${COLORS.primary}30;
    }

    /* ── KPI Cards ────────────────────────────────────────── */
    .kpi-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }
    .kpi-card {
      flex: 1 1 30%;
      min-width: 140px;
      border-radius: 10px;
      padding: 14px 16px;
      text-align: center;
    }
    .kpi-card .label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .kpi-card .value {
      font-size: 18px;
      font-weight: 800;
    }
    .kpi-card .detail {
      font-size: 9px;
      margin-top: 3px;
      opacity: 0.7;
    }

    /* ── Indicadores ──────────────────────────────────────── */
    .indicators-row {
      display: flex;
      gap: 12px;
      margin-top: 14px;
    }
    .indicator {
      flex: 1;
      border-radius: 10px;
      padding: 12px 14px;
      border: 1px solid ${COLORS.border}40;
      background: ${COLORS.background};
    }
    .indicator .ind-label {
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${COLORS.textSecondary};
      margin-bottom: 4px;
    }
    .indicator .ind-value {
      font-size: 13px;
      font-weight: 700;
      color: ${COLORS.text};
    }
    .indicator .ind-detail {
      font-size: 8px;
      color: ${COLORS.textSecondary};
      margin-top: 3px;
    }

    /* ── Filtros ───────────────────────────────────────────── */
    .filters-row {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .filter-badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 12px;
      background: ${COLORS.primaryLight};
      color: ${COLORS.primary};
      font-size: 9px;
      font-weight: 600;
    }

    /* ── Tabla de categorias ───────────────────────────────── */
    .cat-table {
      width: 100%;
      border-collapse: collapse;
    }
    .cat-table th {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${COLORS.textSecondary};
      padding: 8px 10px;
      text-align: left;
      border-bottom: 2px solid ${COLORS.border};
    }
    .cat-table td {
      padding: 9px 10px;
      font-size: 10px;
      border-bottom: 1px solid ${COLORS.border}60;
    }

    /* ── Tabla de movimientos ──────────────────────────────── */
    .tx-table {
      width: 100%;
      border-collapse: collapse;
    }
    .tx-table th {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${COLORS.textSecondary};
      padding: 8px 12px;
      text-align: left;
      border-bottom: 2px solid ${COLORS.primary};
      background: ${COLORS.primaryLight};
    }
    .tx-table th:nth-child(6) { text-align: right; }

    /* ── Page break y footer ──────────────────────────────── */
    .page-break {
      page-break-before: always;
    }
    .footer {
      margin-top: 32px;
      padding-top: 14px;
      border-top: 2px solid ${COLORS.border}60;
      font-size: 9px;
      color: ${COLORS.textSecondary};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* ── Utilidades ────────────────────────────────────────── */
    .chart-wrapper {
      padding: 8px 0;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    ${logoImg ? `<div class="header-logo">${logoImg}</div>` : ''}
    <div class="header-info">
      <h1>Cuentas Claras</h1>
      <div class="subtitle">Club Independiente &mdash; Basquet de Menores</div>
      <div class="subtitle" style="font-weight: 600; color: ${COLORS.text}; margin-top: 1px;">Reporte Financiero</div>
      ${filters?.seasonName ? `<div class="subtitle" style="margin-top: 4px;">Temporada: <strong style="color: ${COLORS.text};">${escapeHtml(filters.seasonName)}</strong></div>` : ''}
    </div>
    <div class="header-meta">
      <div class="period">${periodStart} &mdash; ${periodEnd}</div>
      <div class="generated">Generado: ${formatNow()}</div>
      ${filters?.type || filters?.categoryName ? `
        <div class="filters-row" style="justify-content: flex-end; margin-top: 6px;">
          ${filters?.type ? `<span class="filter-badge">${TYPE_LABELS[filters.type] ?? filters.type}</span>` : ''}
          ${filters?.categoryName ? `<span class="filter-badge">${escapeHtml(filters.categoryName)}</span>` : ''}
        </div>
      ` : ''}
    </div>
  </div>

  <!-- RESUMEN EJECUTIVO -->
  <div class="section">
    <div class="section-title">Resumen Ejecutivo</div>
    <div class="kpi-grid">
      <div class="kpi-card" style="background: ${COLORS.incomeBg}; border: 1px solid ${COLORS.income}25;">
        <div class="label" style="color: ${COLORS.income};">Ingresos</div>
        <div class="value" style="color: ${COLORS.income};">+${formatCurrency(summary.totalIncome, summary.currency)}</div>
      </div>
      <div class="kpi-card" style="background: ${COLORS.expenseBg}; border: 1px solid ${COLORS.expense}25;">
        <div class="label" style="color: ${COLORS.expense};">Egresos</div>
        <div class="value" style="color: ${COLORS.expense};">-${formatCurrency(summary.totalExpenses, summary.currency)}</div>
      </div>
      <div class="kpi-card" style="background: ${COLORS.primaryLight}; border: 1px solid ${COLORS.primary}25;">
        <div class="label" style="color: ${COLORS.primary};">Balance Neto</div>
        <div class="value" style="color: ${balColor};">${balSign}${formatCurrency(summary.netBalance, summary.currency)}</div>
      </div>
      <div class="kpi-card" style="background: ${COLORS.background}; border: 1px solid ${COLORS.border}40;">
        <div class="label" style="color: ${COLORS.transfer};">Transferencias</div>
        <div class="value" style="color: ${COLORS.transfer};">${formatCurrency(summary.totalTransfers, summary.currency)}</div>
      </div>
      <div class="kpi-card" style="background: ${COLORS.background}; border: 1px solid ${COLORS.border}40;">
        <div class="label" style="color: ${COLORS.textSecondary};">Promedio / Mov.</div>
        <div class="value" style="color: ${COLORS.text}; font-size: 15px;">${formatCurrency(avgPerTx, summary.currency)}</div>
      </div>
      <div class="kpi-card" style="background: ${COLORS.background}; border: 1px solid ${COLORS.border}40;">
        <div class="label" style="color: ${COLORS.textSecondary};">Total Movimientos</div>
        <div class="value" style="color: ${COLORS.text};">${summary.transactionCount}</div>
        <div class="detail" style="color: ${COLORS.textSecondary};">${stats.activeDays} dias con actividad</div>
      </div>
    </div>

    <div class="indicators-row">
      ${stats.biggestIncome ? `
        <div class="indicator">
          <div class="ind-label">Mayor Ingreso</div>
          <div class="ind-value" style="color: ${COLORS.income};">+${formatCurrency(stats.biggestIncome.amount)}</div>
          <div class="ind-detail">${escapeHtml(stats.biggestIncome.description)} (${escapeHtml(stats.biggestIncome.category)})</div>
        </div>
      ` : ''}
      ${stats.biggestExpense ? `
        <div class="indicator">
          <div class="ind-label">Mayor Egreso</div>
          <div class="ind-value" style="color: ${COLORS.expense};">-${formatCurrency(stats.biggestExpense.amount)}</div>
          <div class="ind-detail">${escapeHtml(stats.biggestExpense.description)} (${escapeHtml(stats.biggestExpense.category)})</div>
        </div>
      ` : ''}
      <div class="indicator">
        <div class="ind-label">Promedio Diario</div>
        <div class="ind-value" style="color: ${stats.dailyAverage >= 0 ? COLORS.income : COLORS.expense};">${stats.dailyAverage >= 0 ? '+' : ''}${formatCurrency(stats.dailyAverage)}</div>
        <div class="ind-detail">Sobre ${stats.periodDays} dias del periodo</div>
      </div>
    </div>
  </div>

  <!-- TENDENCIA MENSUAL -->
  ${trendChartHtml ? `
  <div class="section">
    <div class="section-title">Tendencia Mensual</div>
    <div class="chart-wrapper">${trendChartHtml}</div>
  </div>
  ` : ''}

  <!-- GRAFICOS POR RUBRO -->
  ${categoryReport.length > 0 ? `
  <div class="page-break"></div>
  ${miniHeader}
  <div class="section">
    <div class="section-title">Distribucion por Rubro</div>
    <div style="margin-bottom: 16px;">
      <h4 style="font-size: 11px; font-weight: 600; color: ${COLORS.textSecondary}; margin-bottom: 8px;">Ingresos vs Egresos por rubro</h4>
      ${categoryBarChartHtml}
    </div>
    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 200px;">
        ${expenseDonutHtml}
      </div>
      <div style="flex: 1; min-width: 200px;">
        ${incomeDonutHtml}
      </div>
    </div>
  </div>

  <!-- DESGLOSE POR RUBRO - TABLA -->
  <div class="section">
    <div class="section-title">Desglose por Rubro</div>
    <table class="cat-table">
      <thead>
        <tr>
          <th>Rubro</th>
          <th style="text-align: right;">Ingresos</th>
          <th style="text-align: right;">Egresos</th>
          <th style="text-align: right;">Balance</th>
          <th style="text-align: center;">Mov.</th>
        </tr>
      </thead>
      <tbody>
        ${categoryReport.map((cat) => {
          const balStyle = cat.netBalance >= 0 ? `color: ${COLORS.income}; font-weight: 700;` : `color: ${COLORS.expense}; font-weight: 700;`;
          return `
            <tr>
              <td style="font-weight: 600; color: ${COLORS.text};">${escapeHtml(cat.categoryName)}</td>
              <td style="color: ${COLORS.income}; font-weight: 600; text-align: right;">${formatCurrency(cat.totalIncome)}</td>
              <td style="color: ${COLORS.expense}; font-weight: 600; text-align: right;">${formatCurrency(cat.totalExpenses)}</td>
              <td style="${balStyle} text-align: right;">${cat.netBalance >= 0 ? '+' : ''}${formatCurrency(cat.netBalance)}</td>
              <td style="text-align: center; color: ${COLORS.textSecondary};">${cat.transactionCount}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- MEDIO DE PAGO -->
  ${paymentChartHtml ? `
  <div class="section">
    <div class="section-title">Distribucion por Medio de Pago</div>
    <div class="chart-wrapper">${paymentChartHtml}</div>
  </div>
  ` : ''}

  <!-- TOP MOVIMIENTOS -->
  ${topTxHtml ? `
  <div class="section">
    <div class="section-title">Top Movimientos del Periodo</div>
    ${topTxHtml}
  </div>
  ` : ''}

  <!-- DETALLE DE MOVIMIENTOS -->
  ${transactions.length > 0 ? `
  <div class="page-break"></div>
  ${miniHeader}
  <div class="section">
    <div class="section-title">Detalle de Movimientos (${transactions.length})</div>
    <table class="tx-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Tipo</th>
          <th>Descripcion</th>
          <th>Medio</th>
          <th>Registrado por</th>
          <th style="text-align: right;">Monto</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${transactionDetailTable(transactions)}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- FOOTER -->
  <div class="footer">
    <div>
      ${logoImgSmall ? `<span style="vertical-align: middle; margin-right: 6px;">${logoImgSmall}</span>` : ''}
      <strong>Cuentas Claras</strong> &mdash; Club Independiente
    </div>
    <div style="text-align: center;">
      ${transactions.length} movimientos &mdash; Generado automaticamente
    </div>
    <div style="text-align: right;">
      ${formatNow()}
    </div>
  </div>

</body>
</html>
  `;
}

// ── Exportar reporte a PDF ──────────────────────────────────────────────────

export async function exportReportToPdf(data: PdfReportData): Promise<void> {
  // Load club logo as base64 for embedding in PDF
  let logoBase64 = '';
  try {
    const asset = Asset.fromModule(require('@/assets/images/logo.png'));
    await asset.downloadAsync();
    if (asset.localUri) {
      logoBase64 = await FileSystem.readAsStringAsync(asset.localUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
  } catch {
    // Logo not available, continue without it
  }

  const html = buildReportHtml(data, logoBase64);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const fileName = `Cuentas_Claras_Reporte_${Date.now()}.pdf`;
  const destPath = `${FileSystem.cacheDirectory}${fileName}`;

  await FileSystem.moveAsync({ from: uri, to: destPath });

  await Sharing.shareAsync(destPath, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compartir reporte financiero',
  });

  FileSystem.deleteAsync(destPath, { idempotent: true }).catch(() => {});
}
