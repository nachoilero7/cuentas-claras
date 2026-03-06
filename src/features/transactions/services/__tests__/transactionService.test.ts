import {
  getTransactions,
  createTransaction,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
} from '../transactionService';

// ─── Mock de Supabase ───────────────────────────────────────────────────────

const mockSingle = jest.fn();
const mockRange = jest.fn(() => ({ data: [], error: null }));
const mockOrder = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockGte = jest.fn().mockReturnThis();
const mockLte = jest.fn().mockReturnThis();
const mockOr = jest.fn().mockReturnThis();
const mockSelect = jest.fn(() => ({ single: mockSingle, data: [], error: null }));
const mockInsert = jest.fn(() => ({ select: mockSelect }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockDelete = jest.fn(() => ({ eq: mockEq }));

const mockFrom = jest.fn((_table: string) => ({
  select: jest.fn(() => ({
    order: mockOrder,
    eq: mockEq,
    single: mockSingle,
  })),
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}));

const mockGetUser = jest.fn();

jest.mock('@/src/core/config/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function setupChainedQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.gte = jest.fn().mockReturnValue(chain);
  chain.lte = jest.fn().mockReturnValue(chain);
  chain.or = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.range = jest.fn().mockResolvedValue(result);
  chain.single = jest.fn().mockResolvedValue(result);
  chain.select = jest.fn().mockReturnValue(chain);

  mockFrom.mockReturnValue({
    select: jest.fn().mockReturnValue(chain),
    insert: jest.fn().mockReturnValue(chain),
    update: jest.fn().mockReturnValue(chain),
    delete: jest.fn().mockReturnValue(chain),
  });

  return chain;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('transactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactions', () => {
    it('retorna lista vacia sin filtros', async () => {
      setupChainedQuery({ data: [], error: null });

      const result = await getTransactions();
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });

    it('aplica filtro de seasonId', async () => {
      const chain = setupChainedQuery({ data: [], error: null });

      await getTransactions({ seasonId: 'season-1' });
      expect(chain.eq).toHaveBeenCalledWith('season_id', 'season-1');
    });

    it('aplica filtro de categoryId (incluye transferencias)', async () => {
      const chain = setupChainedQuery({ data: [], error: null });

      await getTransactions({ categoryId: 'cat-1' });
      expect(chain.or).toHaveBeenCalledWith(
        'category_id.eq.cat-1,transfer_to_category_id.eq.cat-1'
      );
    });

    it('aplica filtro de tipo', async () => {
      const chain = setupChainedQuery({ data: [], error: null });

      await getTransactions({ type: 'income' });
      expect(chain.eq).toHaveBeenCalledWith('type', 'income');
    });

    it('aplica filtro de busqueda con escape', async () => {
      const chain = setupChainedQuery({ data: [], error: null });

      await getTransactions({ search: 'test%query' });
      expect(chain.or).toHaveBeenCalledWith(
        expect.stringContaining('description.ilike.%test\\%query%'),
      );
    });

    it('aplica rango de fechas', async () => {
      const chain = setupChainedQuery({ data: [], error: null });

      await getTransactions({ startDate: '2026-01-01', endDate: '2026-01-31' });
      expect(chain.gte).toHaveBeenCalledWith('transaction_date', '2026-01-01');
      expect(chain.lte).toHaveBeenCalledWith('transaction_date', '2026-01-31');
    });

    it('aplica paginacion con limit y offset', async () => {
      const chain = setupChainedQuery({ data: [], error: null });

      await getTransactions({ limit: 10, offset: 20 });
      expect(chain.range).toHaveBeenCalledWith(20, 29);
    });

    it('usa limit por defecto de 50', async () => {
      const chain = setupChainedQuery({ data: [], error: null });

      await getTransactions();
      expect(chain.range).toHaveBeenCalledWith(0, 49);
    });

    it('retorna datos de transacciones cuando existen', async () => {
      const mockData = [
        { id: '1', description: 'Cuota', amount: 5000, type: 'income' },
        { id: '2', description: 'Pelota', amount: 2000, type: 'expense' },
      ];
      setupChainedQuery({ data: mockData, error: null });

      const result = await getTransactions();
      expect(result.data).toEqual(mockData);
    });

    it('retorna error de Supabase', async () => {
      const mockError = { message: 'DB error', code: '500' };
      setupChainedQuery({ data: null, error: mockError });

      const result = await getTransactions();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('getTransactionById', () => {
    it('obtiene transaccion por ID', async () => {
      const mockTx = { id: 'tx-1', description: 'Test', amount: 100 };
      setupChainedQuery({ data: mockTx, error: null });

      const result = await getTransactionById('tx-1');
      expect(result.data).toEqual(mockTx);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });

    it('retorna null si no existe', async () => {
      setupChainedQuery({ data: null, error: { message: 'Not found' } });

      const result = await getTransactionById('nonexistent');
      expect(result.data).toBeNull();
    });
  });

  describe('createTransaction', () => {
    const txData = {
      type: 'income' as const,
      amount: 5000,
      currency: 'ARS' as const,
      description: 'Cuota mensual',
      category_id: 'cat-1',
      transaction_date: '2026-02-12',
    };

    it('crea transaccion con usuario autenticado', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      const chain = setupChainedQuery({
        data: { id: 'new-1', ...txData, created_by: 'user-1', status: 'pending' },
        error: null,
      });

      const result = await createTransaction(txData);
      expect(result.data).toMatchObject({ id: 'new-1', amount: 5000 });
      expect(result.error).toBeNull();
    });

    it('retorna error si no hay usuario autenticado', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await createTransaction(txData);
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('Usuario no autenticado');
    });

    it('retorna error de autenticacion de Supabase', async () => {
      const authErr = new Error('Token expired');
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: authErr,
      });

      const result = await createTransaction(txData);
      expect(result.data).toBeNull();
      expect(result.error).toBe(authErr);
    });
  });

  describe('updateTransaction', () => {
    it('actualiza transaccion existente', async () => {
      const updated = { id: 'tx-1', description: 'Actualizado', amount: 7000 };
      setupChainedQuery({ data: updated, error: null });

      const result = await updateTransaction('tx-1', { description: 'Actualizado', amount: 7000 });
      expect(result.data).toEqual(updated);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });
  });

  describe('deleteTransaction', () => {
    it('elimina transaccion (hard delete)', async () => {
      const deleted = { id: 'tx-1', description: 'Borrada' };
      setupChainedQuery({ data: deleted, error: null });

      const result = await deleteTransaction('tx-1');
      expect(result.data).toEqual(deleted);
      expect(mockFrom).toHaveBeenCalledWith('transactions');
    });
  });
});
