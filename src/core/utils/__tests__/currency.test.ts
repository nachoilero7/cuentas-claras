import { formatCurrency, parseCurrencyInput } from '../currency';

describe('currency utils', () => {
  describe('formatCurrency', () => {
    it('formatea monto ARS con simbolo $', () => {
      expect(formatCurrency(1234.5, 'ARS')).toBe('$ 1.234,50');
    });

    it('formatea monto USD con simbolo US$', () => {
      expect(formatCurrency(1234.5, 'USD')).toBe('US$ 1.234,50');
    });

    it('formatea montos negativos', () => {
      expect(formatCurrency(-500, 'ARS')).toBe('-$ 500,00');
    });

    it('formatea cero', () => {
      expect(formatCurrency(0, 'ARS')).toBe('$ 0,00');
    });

    it('maneja NaN como $0', () => {
      expect(formatCurrency(NaN, 'ARS')).toBe('$ 0,00');
    });

    it('maneja Infinity como $0', () => {
      expect(formatCurrency(Infinity, 'ARS')).toBe('$ 0,00');
    });

    it('formatea montos grandes con separador de miles', () => {
      expect(formatCurrency(1234567.89, 'ARS')).toBe('$ 1.234.567,89');
    });

    it('usa ARS por defecto si no se especifica moneda', () => {
      expect(formatCurrency(100)).toBe('$ 100,00');
    });
  });

  describe('parseCurrencyInput', () => {
    it('parsea formato argentino (1.234,56)', () => {
      expect(parseCurrencyInput('1.234,56')).toBe(1234.56);
    });

    it('parsea formato internacional (1234.56)', () => {
      expect(parseCurrencyInput('1234.56')).toBe(1234.56);
    });

    it('parsea coma como decimal (1234,56)', () => {
      expect(parseCurrencyInput('1234,56')).toBe(1234.56);
    });

    it('parsea numeros enteros', () => {
      expect(parseCurrencyInput('1234')).toBe(1234);
    });

    it('remueve simbolos de moneda', () => {
      expect(parseCurrencyInput('$ 1.234,56')).toBe(1234.56);
    });

    it('remueve simbolo US$', () => {
      expect(parseCurrencyInput('US$ 1234.56')).toBe(1234.56);
    });

    it('retorna NaN para string vacio', () => {
      expect(parseCurrencyInput('')).toBeNaN();
    });

    it('retorna NaN para texto no numerico', () => {
      expect(parseCurrencyInput('abc')).toBeNaN();
    });

    it('parsea numeros negativos', () => {
      expect(parseCurrencyInput('-1234,56')).toBe(-1234.56);
    });
  });
});
