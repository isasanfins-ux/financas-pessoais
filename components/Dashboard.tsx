import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, TransactionType, PaymentMethod } from '../types';
import { CHART_COLORS, COLORS } from '../constants';
import TransactionModal from './TransactionModal';

interface DashboardProps {
  transactions: Transaction[];
  onAddTransaction: (t: Transaction) => void;
  categories?: string[];
  onAddCategory?: (name: string) => void;
  onOpenCategoryManager?: () => void;
  initialBalance: number;
  initialCreditBill: number;
  totalCreditLimit: number;
  onUpdateInitialBalance: (val: number) => void;
  onUpdateInitialCreditBill: (val: number) => void;
  onUpdateTotalCreditLimit: (val: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  transactions, 
  onAddTransaction, 
  categories = [],
  onAddCategory,
  onOpenCategoryManager,
  initialBalance,
  initialCreditBill,
  totalCreditLimit,
  onUpdateInitialBalance,
  onUpdateInitialCreditBill,
  onUpdateTotalCreditLimit
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Estados para Calibração e Pagamento de Fatura
  const [isBalanceCalibrating, setIsBalanceCalibrating] = useState(false);
  const [isCreditCalibrating, setIsCreditCalibrating] = useState(false);
  const [isLimitCalibrating, setIsLimitCalibrating] = useState(false);
  const [isPayingBill, setIsPayingBill] = useState(false); // <--- NOVO ESTADO
  const [calibrationValue, setCalibrationValue] = useState('');

  // Constante para identificar a categoria de pagamento
  const PAYMENT_CATEGORY = "Pagamento de Fatura";

  // Processa dados para o gráfico de pizza (IGNORANDO O PAGAMENTO DE FATURA)
  const categoryData = useMemo(() => {
    // Filtramos despesas que NÃO sejam o pagamento da fatura para não duplicar no gráfico
    const expenses = transactions.filter(t => 
      t.type === TransactionType.EXPENSE && 
      t.category !== PAYMENT_CATEGORY
    );
    
    const summary: Record<string, number> = {};
    expenses.forEach(t => {
      summary[t.category] = (summary[t.category] || 0) + t.amount;
    });
    
    const total = Object.values(summary).reduce((a, b) => a + b, 0);

    return Object.entries(summary)
      .map(([name, value]) => ({ 
        name, 
        value,
        percent: total > 0 ? (value / total) * 100 : 0 
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const stats = useMemo(() => {
    // 1. Receitas
    const receitas = transactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 2. Despesas Imediatas (Débito/Dinheiro/Pix) - Inclui o pagamento da fatura para abater do saldo
    const immediateExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod !== PaymentMethod.CREDIT_CARD)
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 3. Gastos no Cartão (Aumentam a fatura)
    const faturaNovosGastos = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD)
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 4. Pagamentos de Fatura Realizados (Abatem a fatura)
    const pagamentosFatura = transactions
      .filter(t => t.category === PAYMENT_CATEGORY)
      .reduce((acc, curr) => acc + curr.amount, 0);

    // Cálculos Finais
    // Fatura = (Inicial + Gastos Novos) - O que você já pagou
    const faturaTotal = (initialCreditBill + faturaNovosGastos) - pagamentosFatura;
    
    // Total de Despesas para mostrar no card (excluímos o pagamento da fatura aqui para não parecer que gastou o dobro)
    const despesasParaMostrar = immediateExpenses + faturaNovosGastos - pagamentosFatura;
    
    const cardExpenses = transactions
      .filter(t => t.type === TransactionType.EXPENSE && t.paymentMethod === PaymentMethod.CREDIT_CARD)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3);

    return {
      saldo: initialBalance + receitas - immediateExpenses,
      receitas,
      despesasTotais: despesasParaMostrar,
      fatura: Math.max(0, faturaTotal), // Não deixa ficar negativa visualmente
      limiteTotal: totalCreditLimit,
      cardExpenses
    };
  }, [transactions, initialBalance, initialCreditBill, totalCreditLimit]);

  const progressPercentage = (stats.fatura / stats.limiteTotal) * 100;

  const categoryTransactions = useMemo(() => {
    if (!selectedCategory) return [];
    return transactions
      .filter(t => t.category === selectedCategory && t.type === TransactionType.EXPENSE)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedCategory, transactions]);

  const handleOpenModal = (type: TransactionType) => {
