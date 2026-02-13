import { formatDate, formatDateTime, formatRelative, dateToISO } from '../date';

describe('date utils', () => {
  describe('formatDate', () => {
    it('formatea string ISO en DD/MM/YYYY', () => {
      expect(formatDate('2025-03-15')).toBe('15/03/2025');
    });

    it('formatea objeto Date en DD/MM/YYYY', () => {
      const date = new Date(2026, 1, 13); // 13 Feb 2026
      expect(formatDate(date)).toBe('13/02/2026');
    });

    it('formatea timestamp numerico', () => {
      const timestamp = new Date(2024, 11, 25).getTime(); // 25 Dic 2024
      expect(formatDate(timestamp)).toBe('25/12/2024');
    });
  });

  describe('formatDateTime', () => {
    it('formatea fecha y hora desde ISO', () => {
      const result = formatDateTime('2025-03-15T14:30:00');
      expect(result).toMatch(/15\/03\/2025 \d{2}:\d{2}/);
    });

    it('formatea objeto Date con hora', () => {
      const date = new Date(2026, 0, 1, 9, 15);
      const result = formatDateTime(date);
      expect(result).toBe('01/01/2026 09:15');
    });
  });

  describe('formatRelative', () => {
    it('retorna "hoy" para fecha de hoy', () => {
      expect(formatRelative(new Date())).toBe('hoy');
    });

    it('retorna "ayer" para fecha de ayer', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatRelative(yesterday)).toBe('ayer');
    });

    it('retorna tiempo relativo para fechas antiguas', () => {
      const old = new Date();
      old.setDate(old.getDate() - 5);
      const result = formatRelative(old);
      expect(result).toContain('hace');
    });
  });

  describe('dateToISO', () => {
    it('convierte Date a YYYY-MM-DD', () => {
      expect(dateToISO(new Date(2026, 1, 12))).toBe('2026-02-12');
    });

    it('rellena con ceros meses y dias de un digito', () => {
      expect(dateToISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('maneja diciembre correctamente', () => {
      expect(dateToISO(new Date(2025, 11, 31))).toBe('2025-12-31');
    });
  });
});
