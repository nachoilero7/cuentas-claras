import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  hardDeleteCategory,
} from '../categoryService';

// ─── Mock de Supabase ───────────────────────────────────────────────────────

const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/src/core/config/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getUser: () => mockGetUser(),
    },
  },
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function setupChainedQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, jest.Mock> = {};
  chain.eq = jest.fn().mockReturnValue(chain);
  chain.order = jest.fn().mockReturnValue(chain);
  chain.single = jest.fn().mockResolvedValue(result);
  chain.select = jest.fn().mockReturnValue(chain);

  // For queries that resolve without .single() (like getCategories)
  // The last .order() call should resolve with result
  const lastOrder = jest.fn().mockResolvedValue(result);

  const selectFn = jest.fn(() => {
    const selectChain: Record<string, jest.Mock> = {};
    selectChain.eq = jest.fn().mockReturnValue(selectChain);
    selectChain.order = jest.fn().mockReturnValue(selectChain);
    selectChain.single = jest.fn().mockResolvedValue(result);
    // For getCategories: select -> eq -> order -> order -> resolves
    // Make the chain eventually resolve
    selectChain.order.mockImplementation(() => {
      return { ...selectChain, then: (fn: (v: unknown) => void) => Promise.resolve(result).then(fn) };
    });
    selectChain.eq.mockReturnValue(selectChain);
    return selectChain;
  });

  mockFrom.mockReturnValue({
    select: selectFn,
    insert: jest.fn().mockReturnValue(chain),
    update: jest.fn().mockReturnValue(chain),
    delete: jest.fn().mockReturnValue(chain),
  });

  return { chain, selectFn };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('categoryService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('retorna categorias activas', async () => {
      const mockData = [
        { id: 'cat-1', name: 'Cuotas', is_active: true },
        { id: 'cat-2', name: 'Equipamiento', is_active: true },
      ];
      setupChainedQuery({ data: mockData, error: null });

      const result = await getCategories();
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith('categories');
    });

    it('retorna array vacio cuando no hay datos', async () => {
      setupChainedQuery({ data: null, error: null });

      const result = await getCategories();
      expect(result.data).toEqual([]);
    });

    it('aplica filtro de temporada', async () => {
      const { selectFn } = setupChainedQuery({ data: [], error: null });

      await getCategories('season-1');
      expect(mockFrom).toHaveBeenCalledWith('categories');
      // Verify select was called (which starts the chain)
      expect(selectFn).toHaveBeenCalledWith('*');
    });

    it('retorna error de Supabase', async () => {
      const mockError = { message: 'DB error', code: '500' };
      setupChainedQuery({ data: null, error: mockError });

      const result = await getCategories();
      expect(result.error).toEqual(mockError);
    });
  });

  describe('getCategoryById', () => {
    it('obtiene categoria por ID', async () => {
      const mockCat = { id: 'cat-1', name: 'Cuotas', is_active: true };
      setupChainedQuery({ data: mockCat, error: null });

      const result = await getCategoryById('cat-1');
      expect(result.data).toEqual(mockCat);
      expect(mockFrom).toHaveBeenCalledWith('categories');
    });

    it('retorna null si no existe', async () => {
      setupChainedQuery({ data: null, error: { message: 'Not found' } });

      const result = await getCategoryById('nonexistent');
      expect(result.data).toBeNull();
    });
  });

  describe('createCategory', () => {
    const catData = {
      name: 'Indumentaria',
      description: 'Ropa deportiva',
      color: '#FF5722',
    };

    it('crea categoria con usuario autenticado', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });
      setupChainedQuery({
        data: { id: 'new-cat', ...catData, created_by: 'user-1', is_active: true },
        error: null,
      });

      const result = await createCategory(catData);
      expect(result.data).toMatchObject({ id: 'new-cat', name: 'Indumentaria' });
      expect(result.error).toBeNull();
    });

    it('retorna error si no hay usuario autenticado', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await createCategory(catData);
      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe('Usuario no autenticado');
    });

    it('retorna error de autenticacion', async () => {
      const authErr = new Error('Session expired');
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: authErr,
      });

      const result = await createCategory(catData);
      expect(result.error).toBe(authErr);
    });
  });

  describe('updateCategory', () => {
    it('actualiza categoria existente', async () => {
      const updated = { id: 'cat-1', name: 'Cuotas Actualizadas' };
      setupChainedQuery({ data: updated, error: null });

      const result = await updateCategory('cat-1', { name: 'Cuotas Actualizadas' });
      expect(result.data).toEqual(updated);
      expect(mockFrom).toHaveBeenCalledWith('categories');
    });
  });

  describe('deleteCategory', () => {
    it('soft-delete: desactiva la categoria', async () => {
      const deleted = { id: 'cat-1', name: 'Borrada', is_active: false };
      setupChainedQuery({ data: deleted, error: null });

      const result = await deleteCategory('cat-1');
      expect(result.data).toEqual(deleted);
      expect(mockFrom).toHaveBeenCalledWith('categories');
    });
  });

  describe('hardDeleteCategory', () => {
    it('elimina permanentemente la categoria', async () => {
      const deleted = { id: 'cat-1', name: 'Eliminada' };
      setupChainedQuery({ data: deleted, error: null });

      const result = await hardDeleteCategory('cat-1');
      expect(result.data).toEqual(deleted);
      expect(mockFrom).toHaveBeenCalledWith('categories');
    });
  });
});
