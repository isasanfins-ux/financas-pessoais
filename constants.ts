
import { TransactionType, PaymentMethod, Transaction, InvestmentGoal } from './types';

export const COLORS = {
  BASE: '#efd2fe', // Pastel Lilac
  TEXT: '#521256', // Deep Plum
  ACCENT: '#f170c3', // Pink Sherbet
  POSITIVE: '#e2e585', // Citrus Lime
};

export const INITIAL_CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Saúde',
  'Moradia',
  'Renda',
  'Educação',
  'Assinaturas'
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: '1', description: 'Supermercado Mensal', amount: 850.50, category: 'Alimentação', type: TransactionType.EXPENSE, paymentMethod: PaymentMethod.DEBIT, isRecurring: false, date: '2024-05-10' },
  { id: '2', description: 'Salário Mensal', amount: 7200.00, category: 'Renda', type: TransactionType.INCOME, paymentMethod: PaymentMethod.DEBIT, isRecurring: true, date: '2024-05-05' },
  { id: '3', description: 'Cinema e Jantar', amount: 160.00, category: 'Lazer', type: TransactionType.EXPENSE, paymentMethod: PaymentMethod.CREDIT_CARD, isRecurring: false, date: '2024-05-12' },
  { id: '4', description: 'Gasolina', amount: 320.00, category: 'Transporte', type: TransactionType.EXPENSE, paymentMethod: PaymentMethod.CREDIT_CARD, isRecurring: false, date: '2024-05-14' },
  { id: '5', description: 'Freelance Design', amount: 1500.00, category: 'Renda', type: TransactionType.INCOME, paymentMethod: PaymentMethod.CASH, isRecurring: false, date: '2024-05-15' },
  { id: '6', description: 'Aluguel', amount: 2500.00, category: 'Moradia', type: TransactionType.EXPENSE, paymentMethod: PaymentMethod.DEBIT, isRecurring: true, date: '2024-05-01' },
];

export const INITIAL_BUDGETS = [
  { category: 'Alimentação', limit: 1200 },
  { category: 'Lazer', limit: 500 },
  { category: 'Transporte', limit: 600 },
  { category: 'Moradia', limit: 2600 },
  { category: 'Saúde', limit: 400 },
];

export const INITIAL_GOALS: InvestmentGoal[] = [
  { id: 'g1', name: 'Reserva de Emergência', targetAmount: 10000, currentAmount: 3500 },
  { id: 'g2', name: 'Viagem 2026', targetAmount: 5000, currentAmount: 1200 },
];

export const CHART_COLORS = [
  '#f170c3', '#e2e585', '#521256', '#a188f7', '#ffb5e8', '#ffd1dc'
];
