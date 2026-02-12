export {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  rejectTransaction,
} from './transactionService';

export type {
  TransactionWithCategory,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
} from './transactionService';
