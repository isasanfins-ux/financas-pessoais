export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME'
}

export enum PaymentMethod {
  CREDIT_CARD = 'Cartão de Crédito',
  DEBIT = 'Débito/Conta Corrente',
  CASH = 'Dinheiro',
  PIX = 'Pix' // Adicionei o Pix aqui caso precise, se não usar pode tirar
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  type: TransactionType;
  paymentMethod: PaymentMethod;
  cardType?: 'Nubank' | 'Porto'; // <--- A ÚNICA MUDANÇA REAL É ESSA LINHA AQUI
  isRecurring: boolean;
  date: string;
  invoiceMonth?: string; 
}

export interface CategoryBudget {
  id?: string;
  category: string;
  limit: number;
}

export interface InvestmentGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color?: string;
}

export interface ApiResponse {
  transaction: Omit<Transaction, 'id'> | null;
  message: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export interface InvestmentTransaction {
  id: string;
  uid?: string;
  description: string;
  amount: number;
  date: string;
  type: 'deposit' | 'withdrawal';
}

export interface MarketItem {
  id: string;
  name: string;
  amount: number;
  type: 'essential' | 'luxury' | 'maintenance';
  date: string;
  quantity?: number;
}
